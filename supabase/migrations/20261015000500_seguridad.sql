-- CallejerOS · seguridad: límites de uso contra abuso, teléfonos protegidos y permisos más finos.

-- ───────────── Límites de uso (ventana fija) ─────────────

-- Contadores por clave ("analizar:u:<user>", "compartir:ip:<ip>"…) y ventana de tiempo.
create table public.limites_uso (
  clave text not null,
  ventana timestamptz not null,
  conteo int not null default 0,
  primary key (clave, ventana)
);
alter table public.limites_uso enable row level security;
revoke all on public.limites_uso from anon, authenticated;

-- Suma un uso y dice si sigue dentro del límite. La usan los Route Handlers con la llave secreta
-- (las claves por IP no deben poder tocarse desde el navegador).
create function public.consumir_cuota(p_clave text, p_limite int, p_ventana_seg int default 3600)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_ventana timestamptz := to_timestamp(floor(extract(epoch from now()) / p_ventana_seg) * p_ventana_seg);
  v_conteo int;
begin
  insert into public.limites_uso (clave, ventana, conteo)
  values (left(p_clave, 200), v_ventana, 1)
  on conflict (clave, ventana) do update set conteo = public.limites_uso.conteo + 1
  returning conteo into v_conteo;

  -- Limpieza ocasional de ventanas viejas.
  if random() < 0.02 then
    delete from public.limites_uso where ventana < now() - interval '2 days';
  end if;

  return v_conteo <= p_limite;
end $$;

revoke execute on function public.consumir_cuota(text, int, int) from public, anon, authenticated;

-- ───────────── Reportes: máximo por hora y por persona ─────────────

-- Frena el spam (y con él, las alertas falsas a toda una colonia). El seed y las tareas del
-- servidor no tienen auth.uid() y no se limitan.
create function public.limitar_avistamientos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_recientes int;
  v_maximo int;
begin
  if auth.uid() is null then
    return new;
  end if;
  v_maximo := case when new.es_confirmacion then 40 else 15 end;
  select count(*) into v_recientes
  from public.sightings
  where user_id = auth.uid()
    and es_confirmacion = new.es_confirmacion
    and created_at > now() - interval '1 hour';
  if v_recientes >= v_maximo then
    raise exception 'Hiciste muchos reportes seguidos. Espera un rato e intenta de nuevo.' using errcode = '54000';
  end if;
  return new;
end $$;

create trigger sightings_limitar before insert on public.sightings
  for each row execute function public.limitar_avistamientos();

-- ───────────── Fotos: máximo de subidas por hora ─────────────

create function public.fotos_subidas_recientes() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from storage.objects o
  where o.bucket_id = 'fotos'
    and (storage.foldername(o.name))[1] = (select auth.uid())::text
    and o.created_at > now() - interval '1 hour';
$$;
revoke execute on function public.fotos_subidas_recientes() from public, anon;
grant execute on function public.fotos_subidas_recientes() to authenticated;

drop policy "fotos: subir a carpeta propia" on storage.objects;
create policy "fotos: subir a carpeta propia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.fotos_subidas_recientes()) < 40
  );

-- ───────────── Teléfonos de contacto ─────────────

-- Antes cualquier sesión (incluso de invitado) podía leer toda la tabla de una vez.
-- Ahora solo se ven de uno en uno, para casos abiertos, con límite por hora y bitácora.
drop policy "animal_contactos: usuarios con sesión" on public.animal_contactos;
revoke all on public.animal_contactos from anon, authenticated;

create table public.accesos_contacto (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  animal_id uuid not null references public.animals on delete cascade,
  created_at timestamptz not null default now()
);
create index accesos_contacto_user_idx on public.accesos_contacto (user_id, created_at desc);
create index accesos_contacto_animal_idx on public.accesos_contacto (animal_id);
alter table public.accesos_contacto enable row level security;
-- El municipio revisa quién consultó teléfonos (moderación).
create policy "accesos_contacto: municipio" on public.accesos_contacto for select to authenticated
  using ((select public.mi_rol()) = 'municipio');
revoke insert, update, delete on public.accesos_contacto from anon, authenticated;

create function public.ver_contacto(p_animal_id uuid)
returns table (nombre text, telefono text)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_animal public.animals;
  v_recientes int;
begin
  if v_user is null then
    raise exception 'Inicia sesión para ver el contacto' using errcode = '42501';
  end if;
  select * into v_animal from public.animals where id = p_animal_id;
  if not found or v_animal.fusionado_en is not null or v_animal.tipo = 'callejero'
     or v_animal.estado not in ('avistado', 'en_atencion') then
    return;
  end if;

  -- Quien lo reportó siempre ve su propio contacto; los demás, hasta 20 por hora.
  if v_animal.reportado_por is distinct from v_user then
    select count(*) into v_recientes
    from public.accesos_contacto
    where user_id = v_user and created_at > now() - interval '1 hour';
    if v_recientes >= 20 then
      raise exception 'Consultaste muchos contactos seguidos. Espera un rato.' using errcode = '54000';
    end if;
    insert into public.accesos_contacto (user_id, animal_id) values (v_user, p_animal_id);
  end if;

  return query select c.nombre, c.telefono from public.animal_contactos c where c.animal_id = p_animal_id;
end $$;

revoke execute on function public.ver_contacto(uuid) from public, anon;
grant execute on function public.ver_contacto(uuid) to authenticated;

-- ───────────── Unir duplicados: sin secuestrar reportes ajenos ─────────────

-- Antes, quien reportó el destino podía absorber el reporte de cualquier otra persona.
-- Ahora un vecino solo une SU reporte (origen) a otro; rescatistas y municipio, cualquiera.
create or replace function public.fusionar_animales(p_origen uuid, p_destino uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.animals;
  d public.animals;
  v_movidos int;
begin
  if p_origen = p_destino then
    raise exception 'Elige dos reportes distintos' using errcode = '22023';
  end if;

  select * into o from public.animals where id = p_origen for update;
  select * into d from public.animals where id = p_destino for update;
  if o.id is null or d.id is null then
    raise exception 'Animal no encontrado' using errcode = 'P0002';
  end if;
  if o.fusionado_en is not null or d.fusionado_en is not null then
    raise exception 'Uno de los reportes ya fue fusionado' using errcode = '22023';
  end if;
  if o.especie <> d.especie then
    raise exception 'No se pueden unir un perro y un gato' using errcode = '22023';
  end if;
  -- Solo casos abiertos: así la nota de la historia no cuenta como otro rescate en las estadísticas.
  if o.estado not in ('avistado', 'en_atencion') or d.estado not in ('avistado', 'en_atencion') then
    raise exception 'Solo se pueden unir reportes que siguen abiertos' using errcode = '22023';
  end if;
  if auth.uid() is distinct from o.reportado_por
    and coalesce(public.mi_rol()::text, '') not in ('rescatista', 'municipio') then
    raise exception 'Solo puedes unir un reporte tuyo; pide a un rescatista unir los demás' using errcode = '42501';
  end if;

  update public.sightings set animal_id = d.id where animal_id = o.id;
  get diagnostics v_movidos = row_count;

  insert into public.animal_contactos (animal_id, nombre, telefono)
  select d.id, nombre, telefono from public.animal_contactos where animal_id = o.id
  on conflict (animal_id) do nothing;

  update public.animals set
    total_avistamientos = d.total_avistamientos + o.total_avistamientos,
    urgencia = greatest(d.urgencia, o.urgencia),
    apodo = coalesce(d.apodo, o.apodo),
    rasgos = coalesce(d.rasgos, o.rasgos),
    raza = coalesce(d.raza, o.raza),
    color = coalesce(d.color, o.color),
    tamano = coalesce(d.tamano, o.tamano),
    sexo = coalesce(d.sexo, o.sexo),
    collar = coalesce(d.collar, o.collar),
    registro_folio = coalesce(d.registro_folio, o.registro_folio),
    perdido_desde = coalesce(d.perdido_desde, o.perdido_desde),
    foto_portada_url = coalesce(d.foto_portada_url, o.foto_portada_url),
    -- La ubicación más reciente gana.
    lat = case when o.visto_ultima_vez > d.visto_ultima_vez then o.lat else d.lat end,
    lng = case when o.visto_ultima_vez > d.visto_ultima_vez then o.lng else d.lng end,
    visto_ultima_vez = greatest(d.visto_ultima_vez, o.visto_ultima_vez)
  where id = d.id;

  update public.animals set fusionado_en = d.id where id = o.id;

  insert into public.status_updates (animal_id, user_id, estado_anterior, estado_nuevo, nota)
  values (d.id, auth.uid(), d.estado, d.estado, 'Se unió un reporte duplicado (' || v_movidos || ' avistamientos)');

  return jsonb_build_object('destino', d.id, 'avistamientos_movidos', v_movidos);
end $$;

revoke execute on function public.limitar_avistamientos() from public, anon, authenticated;
