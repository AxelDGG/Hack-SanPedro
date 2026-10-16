-- CallejerOS · reportes centralizados (taller del 2026-10-15)
-- Tres tipos de reporte (perdido, encontrado, callejero) de perros y gatos, rasgos estructurados
-- para comparar, contacto privado, alertas por colonia y herramientas contra duplicados:
-- huella de la foto, puntaje de parecido y fusión de reportes.

create extension if not exists unaccent with schema extensions;

create type public.tipo_reporte as enum ('perdido', 'encontrado', 'callejero');
create type public.tamano_animal as enum ('chico', 'mediano', 'grande');
create type public.sexo_animal as enum ('macho', 'hembra');
create type public.origen_reporte as enum ('app', 'whatsapp', 'facebook', 'instagram', 'otro');

-- ───────────── Colonias: catálogo del registro municipal ─────────────

alter table public.colonias
  add column clave text unique,
  add column codigo_postal text,
  add column distrito text;

-- ───────────── Animales y avistamientos ─────────────

alter table public.animals
  add column tipo public.tipo_reporte not null default 'callejero',
  add column raza text check (char_length(raza) <= 60),
  add column color text check (char_length(color) <= 60),
  add column tamano public.tamano_animal,
  add column sexo public.sexo_animal,
  add column collar boolean,
  add column perdido_desde timestamptz,
  add column registro_folio text check (char_length(registro_folio) <= 40),
  add column origen public.origen_reporte not null default 'app',
  -- Reporte duplicado que se unió a otro: queda como historial y deja de mostrarse.
  add column fusionado_en uuid references public.animals on delete set null;

create index animals_tipo_idx on public.animals (tipo) where fusionado_en is null;
create index animals_fusionado_idx on public.animals (fusionado_en);

-- Huella perceptual de la foto (dHash de 48 bits, ver src/lib/image/huella.ts): detecta la misma
-- foto reenviada en varios grupos.
alter table public.sightings add column foto_hash bigint;
create index sightings_foto_hash_idx on public.sightings (created_at desc) where foto_hash is not null;

-- ───────────── Datos privados ─────────────

-- Contacto de quien reporta una mascota perdida o encontrada. Va aparte porque animals
-- es de lectura pública; aquí solo leen usuarios con sesión (incluidos invitados).
create table public.animal_contactos (
  animal_id uuid primary key references public.animals on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  telefono text not null check (telefono ~ '^[0-9]{10}$'),
  created_at timestamptz not null default now()
);

-- Teléfono y preferencias de alerta de cada usuario (profiles es público).
create table public.perfiles_privados (
  user_id uuid primary key references public.profiles on delete cascade,
  telefono text check (telefono ~ '^[0-9]{10}$'),
  email_alertas text check (email_alertas ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  alertas_push boolean not null default true,
  alertas_email boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger perfiles_privados_set_updated_at before update on public.perfiles_privados
  for each row execute function public.set_updated_at();

-- ───────────── Alertas por colonia ─────────────

create table public.suscripciones_colonia (
  user_id uuid not null references public.profiles on delete cascade,
  colonia_id smallint not null references public.colonias on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, colonia_id)
);
create index suscripciones_colonia_colonia_idx on public.suscripciones_colonia (colonia_id);

create table public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_suscripciones_user_idx on public.push_suscripciones (user_id);

create table public.notificaciones (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  animal_id uuid references public.animals on delete cascade,
  tipo text not null check (tipo in ('reporte_zona', 'posible_coincidencia', 'avistamiento_mascota')),
  titulo text not null,
  cuerpo text not null,
  url text not null,
  leida boolean not null default false,
  push_enviado_at timestamptz,
  email_enviado_at timestamptz,
  created_at timestamptz not null default now()
);
create index notificaciones_user_idx on public.notificaciones (user_id, created_at desc);
create index notificaciones_animal_idx on public.notificaciones (animal_id);

-- Tu colonia queda suscrita en automático cuando la eliges (o con tu primer reporte).
create function public.suscribir_colonia_propia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.colonia_id is not null and new.colonia_id is distinct from old.colonia_id then
    insert into public.suscripciones_colonia (user_id, colonia_id)
    values (new.id, new.colonia_id)
    on conflict do nothing;
  end if;
  return null;
end $$;

create trigger profiles_suscribir_colonia after update of colonia_id on public.profiles
  for each row execute function public.suscribir_colonia_propia();

insert into public.suscripciones_colonia (user_id, colonia_id)
select id, colonia_id from public.profiles where colonia_id is not null
on conflict do nothing;

-- ───────────── Comparar animales ─────────────

-- Palabras de color normalizadas ("café", "marrón" y "chocolate" cuentan como lo mismo).
create function public.tokens_color(p text) returns text[]
language sql stable set search_path = '' as $$
  select coalesce(array_agg(distinct t), '{}')
  from (
    select case
      when w in ('cafe', 'marron', 'chocolate', 'castano', 'cafes') then 'cafe'
      when w in ('dorado', 'dorada', 'amarillo', 'miel', 'canela', 'rubio', 'crema', 'beige', 'arena', 'hueso') then 'dorado'
      when w in ('negro', 'negra', 'negros', 'oscuro', 'oscura') then 'negro'
      when w in ('blanco', 'blanca', 'blancos') then 'blanco'
      when w in ('gris', 'grisaceo', 'plateado', 'azul', 'azulado') then 'gris'
      when w in ('naranja', 'anaranjado', 'rojizo', 'pelirrojo', 'naranjo') then 'naranja'
      when w in ('atigrado', 'atigrada', 'rayado', 'rayas', 'tabby', 'barcino') then 'atigrado'
      when w in ('tricolor', 'calico', 'carey') then 'tricolor'
      when w in ('manchas', 'manchado', 'manchada', 'pinto', 'pinta', 'moteado') then 'manchas'
    end as t
    from regexp_split_to_table(lower(extensions.unaccent(coalesce(p, ''))), '[^a-z]+') as w
  ) x
  where t is not null;
$$;

-- Bits distintos entre dos huellas de foto (0 = idénticas; ≤ 8 = la misma foto recomprimida).
create function public.distancia_hash(a bigint, b bigint) returns int
language sql immutable set search_path = '' as $$
  select bit_count((a # b)::bit(64))::int;
$$;

-- "¿Es este?": animales activos que podrían ser el mismo, con un puntaje de 0 a 1 y los motivos.
-- Mezcla distancia, tiempo, color, raza y tamaño; la misma foto pesa más que todo lo demás.
-- Una mascota perdida se busca en un radio mayor (3 km, 60 días) que un avistamiento (800 m, 21 días).
drop function public.find_duplicate_candidates(double precision, double precision, public.especie_animal, int, int);

create function public.find_duplicate_candidates(
  p_lat double precision,
  p_lng double precision,
  p_especie public.especie_animal,
  p_tipo public.tipo_reporte default 'callejero',
  p_color text default null,
  p_raza text default null,
  p_tamano public.tamano_animal default null,
  p_foto_hash bigint default null,
  p_excluir uuid default null
) returns table (
  id uuid,
  tipo public.tipo_reporte,
  especie public.especie_animal,
  apodo text,
  rasgos text,
  raza text,
  color text,
  tamano public.tamano_animal,
  estado public.estado_animal,
  foto_portada_url text,
  visto_ultima_vez timestamptz,
  total_avistamientos int,
  distancia_m double precision,
  fotos text[],
  puntaje real,
  motivos text[],
  misma_foto boolean
)
language sql stable set search_path = '' as $$
  with punto as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ),
  mi_color as (
    select public.tokens_color(p_color) as t
  ),
  cercanos as (
    select s.animal_id, min(extensions.st_distance(s.ubicacion, punto.g)) as distancia_m
    from public.sightings s, punto
    where extensions.st_dwithin(s.ubicacion, punto.g, 3000)
      and s.created_at > now() - interval '60 days'
    group by s.animal_id
  ),
  por_foto as (
    select s.animal_id, min(public.distancia_hash(s.foto_hash, p_foto_hash)) as bits
    from public.sightings s
    where p_foto_hash is not null
      and s.foto_hash is not null
      and s.created_at > now() - interval '90 days'
      and public.distancia_hash(s.foto_hash, p_foto_hash) <= 8
    group by s.animal_id
  ),
  base as (
    select
      a.*,
      coalesce(c.distancia_m, extensions.st_distance(a.ubicacion_ultima, punto.g)) as dist,
      f.bits,
      (p_tipo = 'perdido' or a.tipo = 'perdido') as busqueda_amplia,
      public.tokens_color(a.color) as su_color
    from public.animals a
    cross join punto
    left join cercanos c on c.animal_id = a.id
    left join por_foto f on f.animal_id = a.id
    where (c.animal_id is not null or f.animal_id is not null)
      and a.especie = p_especie
      and a.fusionado_en is null
      and a.estado in ('avistado', 'en_atencion')
      and (p_excluir is null or a.id <> p_excluir)
  ),
  componentes as (
    select
      b.*,
      case when b.busqueda_amplia then 3000 else 800 end as radio,
      case when b.busqueda_amplia then 60 else 21 end as dias,
      exp(-b.dist / (case when b.busqueda_amplia then 3000 else 800 end / 2.5)) as s_dist,
      exp(-(extract(epoch from now() - b.visto_ultima_vez) / 86400)
        / (case when b.busqueda_amplia then 60 else 21 end / 3.0)) as s_tiempo,
      case when cardinality(b.su_color) > 0 and cardinality(mc.t) > 0 then
        cardinality(array(select unnest(b.su_color) intersect select unnest(mc.t)))::float
          / greatest(cardinality(b.su_color), cardinality(mc.t))
      end as s_color,
      case when b.raza is not null and p_raza is not null then
        case
          when lower(extensions.unaccent(b.raza)) = lower(extensions.unaccent(p_raza)) then 1.0
          when lower(extensions.unaccent(b.raza || ' ' || p_raza)) ~ '(mestiz|criollo|domestico)' then 0.5
          else 0.0
        end
      end as s_raza,
      case when b.tamano is not null and p_tamano is not null then
        case
          when b.tamano = p_tamano then 1.0
          when abs(array_position(enum_range(null::public.tamano_animal), b.tamano)
            - array_position(enum_range(null::public.tamano_animal), p_tamano)) = 1 then 0.4
          else 0.0
        end
      end as s_tamano
    from base b, mi_color mc
  ),
  puntuados as (
    select
      c.*,
      (
        (0.35 * c.s_dist + 0.15 * c.s_tiempo
          + coalesce(0.25 * c.s_color, 0) + coalesce(0.10 * c.s_raza, 0) + coalesce(0.15 * c.s_tamano, 0))
        / (0.50 + case when c.s_color is null then 0 else 0.25 end
                 + case when c.s_raza is null then 0 else 0.10 end
                 + case when c.s_tamano is null then 0 else 0.15 end)
      )
      -- Colores que no coinciden en nada: muy probablemente es otro animal.
      * case when c.s_color = 0 then 0.6 else 1 end as p_rasgos
    from componentes c
    where c.bits is not null
      or (c.dist <= c.radio and c.visto_ultima_vez > now() - make_interval(days => c.dias))
  )
  select
    p.id, p.tipo, p.especie, p.apodo, p.rasgos, p.raza, p.color, p.tamano, p.estado,
    p.foto_portada_url, p.visto_ultima_vez, p.total_avistamientos, p.dist,
    array(
      select s2.foto_url from public.sightings s2
      where s2.animal_id = p.id and s2.foto_url is not null
      order by s2.created_at desc
      limit 3
    ),
    round(greatest(p.p_rasgos, case when p.bits is not null then 0.97 - p.bits * 0.02 else 0 end)::numeric, 2)::real,
    array_remove(array[
      case when p.bits is not null then 'Misma foto' end,
      case when p.tipo = 'perdido' and p_tipo <> 'perdido' then 'Lo están buscando' end,
      case when p.s_color >= 0.5 then 'Mismo color' end,
      case when p.s_raza = 1 then 'Misma raza' end,
      case when p.s_tamano = 1 then 'Mismo tamaño' end
    ], null),
    p.bits is not null
  from puntuados p
  where greatest(p.p_rasgos, case when p.bits is not null then 1 else 0 end) >= 0.3
  order by 15 desc, p.dist
  limit 5;
$$;

-- ───────────── Notificaciones ─────────────

-- Crea las notificaciones de un reporte nuevo: vecinos suscritos a la colonia (o a una cercana)
-- y, si parece una mascota que alguien busca, aviso directo a su familia.
create function public.notificar_reporte(p_animal_id uuid, p_foto_hash bigint default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  a public.animals;
  v_colonia text;
  v_especie text;
  v_nombre text;
  v_titulo text;
  v_cuerpo text;
  v_creadas int := 0;
  v_filas int;
begin
  select * into a from public.animals where id = p_animal_id;
  if not found then return 0; end if;

  select nombre into v_colonia from public.colonias where id = a.colonia_id;
  v_colonia := coalesce(v_colonia, 'tu zona');
  v_especie := case a.especie when 'gato' then 'gato' else 'perro' end;
  v_nombre := coalesce(a.apodo, v_especie);

  v_titulo := case a.tipo
    when 'perdido' then 'Se busca: ' || v_nombre || ' en ' || v_colonia
    when 'encontrado' then 'Encontraron un ' || v_especie || ' en ' || v_colonia
    else 'Un ' || v_especie || ' necesita ayuda en ' || v_colonia
  end;
  v_cuerpo := coalesce(nullif(a.rasgos, ''), initcap(v_especie)) || '. ' || case a.tipo
    when 'perdido' then '¿Lo has visto? Avisa en CallejerOS.'
    when 'encontrado' then '¿Es tuyo o sabes de quién es?'
    else 'Si lo ves, confirma el reporte.'
  end;

  insert into public.notificaciones (user_id, animal_id, tipo, titulo, cuerpo, url)
  select distinct s.user_id, a.id, 'reporte_zona', v_titulo, v_cuerpo, '/animal/' || a.id
  from public.suscripciones_colonia s
  join public.colonias c on c.id = s.colonia_id
  where s.user_id is distinct from a.reportado_por
    and (
      s.colonia_id = a.colonia_id
      or extensions.st_dwithin(c.centro, a.ubicacion_ultima, case when a.tipo = 'perdido' then 2000 else 800 end)
    );
  get diagnostics v_creadas = row_count;

  -- ¿Se parece a una mascota perdida? Aviso a quien la busca.
  if a.tipo <> 'perdido' then
    insert into public.notificaciones (user_id, animal_id, tipo, titulo, cuerpo, url)
    select distinct on (p.reportado_por)
      p.reportado_por, a.id, 'posible_coincidencia',
      '¿Será ' || coalesce(p.apodo, 'tu ' || v_especie) || '?',
      'Vieron un ' || v_especie || ' parecido en ' || v_colonia || '. Revisa la foto.',
      '/animal/' || a.id
    from public.find_duplicate_candidates(a.lat, a.lng, a.especie, a.tipo, a.color, a.raza, a.tamano, p_foto_hash, a.id) d
    join public.animals p on p.id = d.id
    where d.tipo = 'perdido'
      and d.puntaje >= 0.5
      and p.reportado_por is not null
      and p.reportado_por is distinct from a.reportado_por
    order by p.reportado_por, d.puntaje desc;
    get diagnostics v_filas = row_count;
    v_creadas := v_creadas + v_filas;
  end if;

  return v_creadas;
end $$;

-- ───────────── Reportar (v2) ─────────────

drop function public.report_sighting(double precision, double precision, public.especie_animal, smallint,
  public.condicion_animal[], text, text, text, jsonb, uuid);

create function public.report_sighting(
  p_lat double precision,
  p_lng double precision,
  p_especie public.especie_animal,
  p_urgencia smallint default 2,
  p_condiciones public.condicion_animal[] default '{}',
  p_rasgos text default null,
  p_notas text default null,
  p_foto_url text default null,
  p_analisis_ia jsonb default null,
  p_animal_id uuid default null,
  p_tipo public.tipo_reporte default 'callejero',
  p_apodo text default null,
  p_raza text default null,
  p_color text default null,
  p_tamano public.tamano_animal default null,
  p_sexo public.sexo_animal default null,
  p_collar boolean default null,
  p_perdido_desde timestamptz default null,
  p_registro_folio text default null,
  p_origen public.origen_reporte default 'app',
  p_foto_hash bigint default null,
  p_contacto_nombre text default null,
  p_contacto_telefono text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_animal uuid := p_animal_id;
  v_sighting uuid;
  v_puntos int := 0;
  v_filas int;
  v_notificados int := 0;
  v_dueno uuid;
  v_tipo public.tipo_reporte;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para reportar' using errcode = '42501';
  end if;
  if p_especie not in ('perro', 'gato') and p_animal_id is null then
    raise exception 'Por ahora solo registramos perros y gatos' using errcode = '22023';
  end if;
  if p_tipo = 'perdido' and p_animal_id is null and nullif(trim(p_contacto_telefono), '') is null then
    raise exception 'Deja un teléfono para que te avisen si alguien ve a tu mascota' using errcode = '22023';
  end if;

  -- Si confirman un reporte que ya se unió a otro, el avistamiento va al que quedó.
  if p_animal_id is not null then
    select coalesce(fusionado_en, id) into v_animal from public.animals where id = p_animal_id;
    if v_animal is null then
      raise exception 'Animal no encontrado' using errcode = 'P0002';
    end if;
  end if;

  if p_animal_id is null then
    insert into public.animals (
      especie, tipo, apodo, rasgos, raza, color, tamano, sexo, collar, condiciones, urgencia, lat, lng,
      foto_portada_url, reportado_por, total_avistamientos, visto_ultima_vez,
      perdido_desde, registro_folio, origen
    )
    values (
      p_especie, p_tipo, nullif(trim(p_apodo), ''), p_rasgos, nullif(trim(p_raza), ''), nullif(trim(p_color), ''),
      p_tamano, p_sexo, p_collar, coalesce(p_condiciones, '{}'), p_urgencia, p_lat, p_lng,
      p_foto_url, v_user, 1, now(),
      case when p_tipo = 'perdido' then coalesce(p_perdido_desde, now()) end,
      nullif(trim(p_registro_folio), ''), p_origen
    )
    returning id, tipo into v_animal, v_tipo;

    if nullif(trim(p_contacto_telefono), '') is not null then
      insert into public.animal_contactos (animal_id, nombre, telefono)
      values (v_animal, left(coalesce(nullif(trim(p_contacto_nombre), ''), 'Vecino'), 60), trim(p_contacto_telefono))
      on conflict (animal_id) do update set nombre = excluded.nombre, telefono = excluded.telefono;
    end if;
  else
    update public.animals set
      lat = p_lat,
      lng = p_lng,
      urgencia = greatest(urgencia, p_urgencia),
      condiciones = case when cardinality(p_condiciones) > 0 then p_condiciones else condiciones end,
      rasgos = coalesce(rasgos, p_rasgos),
      raza = coalesce(raza, nullif(trim(p_raza), '')),
      color = coalesce(color, nullif(trim(p_color), '')),
      tamano = coalesce(tamano, p_tamano),
      sexo = coalesce(sexo, p_sexo),
      collar = coalesce(collar, p_collar),
      foto_portada_url = coalesce(foto_portada_url, p_foto_url),
      total_avistamientos = total_avistamientos + 1,
      visto_ultima_vez = now()
    where id = v_animal and fusionado_en is null
    returning tipo, reportado_por into v_tipo, v_dueno;

    if not found then
      raise exception 'Animal no encontrado' using errcode = 'P0002';
    end if;
  end if;

  insert into public.sightings (animal_id, user_id, foto_url, lat, lng, notas, analisis_ia, es_confirmacion, foto_hash)
  values (v_animal, v_user, p_foto_url, p_lat, p_lng, p_notas, p_analisis_ia, p_animal_id is not null, p_foto_hash)
  returning id into v_sighting;

  if p_animal_id is null then
    insert into public.point_events (user_id, motivo, puntos, animal_id)
    values (v_user, 'reporte', 10, v_animal);
    v_puntos := 10;
  else
    -- +5 la primera vez que confirmas un animal que no reportaste tú.
    insert into public.point_events (user_id, motivo, puntos, animal_id)
    select v_user, 'confirmacion', 5, v_animal
    where not exists (
      select 1 from public.animals where id = v_animal and reportado_por = v_user
    )
    on conflict do nothing;
    get diagnostics v_filas = row_count;
    v_puntos := 5 * v_filas;
  end if;

  -- La colonia del vecino se fija con su primer reporte (la puede cambiar en su perfil).
  update public.profiles p
  set colonia_id = a.colonia_id
  from public.animals a
  where p.id = v_user and p.colonia_id is null and a.id = v_animal;

  if p_animal_id is null then
    v_notificados := public.notificar_reporte(v_animal, p_foto_hash);
  elsif v_tipo = 'perdido' and v_dueno is distinct from v_user and v_dueno is not null then
    -- Alguien vio una mascota perdida: aviso inmediato a su familia.
    insert into public.notificaciones (user_id, animal_id, tipo, titulo, cuerpo, url)
    select v_dueno, a.id, 'avistamiento_mascota',
      '¡Vieron a ' || coalesce(a.apodo, 'tu mascota') || '!',
      'Alguien la vio hace un momento' || coalesce(' en ' || c.nombre, '') || '. Abre el mapa para ver dónde.',
      '/animal/' || a.id
    from public.animals a
    left join public.colonias c on c.id = a.colonia_id
    where a.id = v_animal;
    v_notificados := 1;
  end if;

  return jsonb_build_object(
    'animal_id', v_animal,
    'sighting_id', v_sighting,
    'puntos', v_puntos,
    'notificados', v_notificados,
    'insignias', public.award_badges(v_user)
  );
end $$;

-- ───────────── Casos resueltos y reencuentros ─────────────

-- Igual que antes, pero en una mascota perdida no se premia a su propia familia:
-- las huellas son para quienes ayudaron a encontrarla.
create or replace function public.premiar_caso_resuelto(p_animal_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_premiados int;
  v_excluir uuid;
begin
  select case when tipo = 'perdido' then reportado_por end into v_excluir
  from public.animals where id = p_animal_id;

  with reportantes as (
    select user_id, min(created_at) as primera_vez
    from public.sightings
    where animal_id = p_animal_id and user_id is not null and user_id is distinct from v_excluir
    group by user_id
  ),
  ordenados as (
    select user_id, row_number() over (order by primera_vez) as orden
    from reportantes
  ),
  insertados as (
    insert into public.point_events (user_id, motivo, puntos, animal_id)
    select user_id, 'caso_resuelto',
      case orden when 1 then 20 when 2 then 15 when 3 then 10 else 5 end,
      p_animal_id
    from ordenados
    on conflict do nothing
    returning user_id
  )
  select count(*) into v_premiados from insertados;

  perform public.award_badges(u.user_id)
  from (
    select distinct user_id from public.sightings
    where animal_id = p_animal_id and user_id is not null and user_id is distinct from v_excluir
  ) u;

  return v_premiados;
end $$;

create or replace function public.change_animal_status(
  p_animal_id uuid,
  p_estado public.estado_animal,
  p_nota text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_rol public.rol_usuario := public.mi_rol();
  v_anterior public.estado_animal;
  v_premiados int := 0;
begin
  if v_rol is null or v_rol = 'vecino' then
    raise exception 'Solo rescatistas o el municipio pueden cambiar el estado' using errcode = '42501';
  end if;

  select estado into v_anterior from public.animals where id = p_animal_id for update;
  if not found then
    raise exception 'Animal no encontrado' using errcode = 'P0002';
  end if;

  if v_anterior = p_estado then
    return jsonb_build_object('cambiado', false, 'premiados', 0);
  end if;

  update public.animals
  set estado = p_estado,
      rescatista_id = coalesce(rescatista_id, case when v_rol = 'rescatista' then auth.uid() end)
  where id = p_animal_id;

  insert into public.status_updates (animal_id, user_id, estado_anterior, estado_nuevo, nota)
  values (p_animal_id, auth.uid(), v_anterior, p_estado, p_nota);

  if p_estado in ('rescatado', 'esterilizado', 'adoptado', 'reunido') then
    v_premiados := public.premiar_caso_resuelto(p_animal_id);
  end if;

  return jsonb_build_object('cambiado', true, 'premiados', v_premiados);
end $$;

-- La familia (o un rescatista) marca que la mascota volvió a casa.
create function public.marcar_reunido(p_animal_id uuid, p_nota text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_tipo public.tipo_reporte;
  v_estado public.estado_animal;
  v_dueno uuid;
  v_premiados int;
begin
  select tipo, estado, reportado_por into v_tipo, v_estado, v_dueno
  from public.animals where id = p_animal_id for update;
  if not found then
    raise exception 'Animal no encontrado' using errcode = 'P0002';
  end if;
  if v_dueno is distinct from auth.uid() and coalesce(public.mi_rol()::text, '') not in ('rescatista', 'municipio') then
    raise exception 'Solo quien reportó la mascota puede marcarla como reunida' using errcode = '42501';
  end if;
  if v_tipo = 'callejero' then
    raise exception 'Un animal callejero sigue el flujo de rescate' using errcode = '22023';
  end if;
  if v_estado = 'reunido' then
    return jsonb_build_object('cambiado', false, 'premiados', 0);
  end if;

  update public.animals set estado = 'reunido' where id = p_animal_id;
  insert into public.status_updates (animal_id, user_id, estado_anterior, estado_nuevo, nota)
  values (p_animal_id, auth.uid(), v_estado, 'reunido', coalesce(nullif(trim(p_nota), ''), '¡Volvió a casa!'));

  v_premiados := public.premiar_caso_resuelto(p_animal_id);
  return jsonb_build_object('cambiado', true, 'premiados', v_premiados);
end $$;

-- ───────────── Fusionar duplicados ─────────────

-- Une un reporte duplicado (origen) a otro (destino): pasan los avistamientos y el contacto,
-- el destino conserva lo que ya tenía y el origen queda marcado como fusionado.
-- Pueden hacerlo rescatistas, el municipio o quien reportó cualquiera de los dos
-- (p. ej. la familia que reconoce a su mascota en un reporte de "encontrado").
create function public.fusionar_animales(p_origen uuid, p_destino uuid) returns jsonb
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
  if auth.uid() is distinct from o.reportado_por and auth.uid() is distinct from d.reportado_por
    and coalesce(public.mi_rol()::text, '') not in ('rescatista', 'municipio') then
    raise exception 'No tienes permiso para unir estos reportes' using errcode = '42501';
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

-- ───────────── Casos para rescatistas (v2: con tipo y sin fusionados) ─────────────

drop function public.nearby_cases(double precision, double precision, double precision, public.estado_animal[]);

create function public.nearby_cases(
  p_lat double precision,
  p_lng double precision,
  p_radio_km double precision default 10,
  p_estados public.estado_animal[] default '{avistado,en_atencion}'
) returns table (
  id uuid,
  tipo public.tipo_reporte,
  especie public.especie_animal,
  apodo text,
  rasgos text,
  condiciones public.condicion_animal[],
  estado public.estado_animal,
  urgencia smallint,
  lat double precision,
  lng double precision,
  foto_portada_url text,
  colonia text,
  rescatista_id uuid,
  total_avistamientos int,
  visto_ultima_vez timestamptz,
  distancia_m double precision
)
language sql stable set search_path = '' as $$
  with punto as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select
    a.id, a.tipo, a.especie, a.apodo, a.rasgos, a.condiciones, a.estado, a.urgencia, a.lat, a.lng,
    a.foto_portada_url, c.nombre, a.rescatista_id, a.total_avistamientos, a.visto_ultima_vez,
    extensions.st_distance(a.ubicacion_ultima, punto.g) as distancia_m
  from public.animals a
  cross join punto
  left join public.colonias c on c.id = a.colonia_id
  where a.estado = any (p_estados)
    and a.fusionado_en is null
    and extensions.st_dwithin(a.ubicacion_ultima, punto.g, p_radio_km * 1000)
  order by a.urgencia desc, distancia_m asc
  limit 100;
$$;

create or replace view public.v_ranking_colonias with (security_invoker = true) as
select
  c.id,
  c.nombre,
  coalesce(sum(p.puntos), 0)::int as puntos,
  count(p.id)::int as vecinos,
  (select count(*) from public.animals a
    where a.colonia_id = c.id and a.estado in ('avistado', 'en_atencion') and a.fusionado_en is null)::int
    as animales_en_calle
from public.colonias c
left join public.profiles p on p.colonia_id = c.id
group by c.id, c.nombre;

-- ───────────── RLS y permisos ─────────────

alter table public.animal_contactos enable row level security;
alter table public.perfiles_privados enable row level security;
alter table public.suscripciones_colonia enable row level security;
alter table public.push_suscripciones enable row level security;
alter table public.notificaciones enable row level security;

create policy "animal_contactos: usuarios con sesión" on public.animal_contactos for select to authenticated
  using (true);
revoke insert, update, delete on public.animal_contactos from anon, authenticated;
revoke all on public.animal_contactos from anon;

create policy "perfiles_privados: el propio" on public.perfiles_privados for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.perfiles_privados from anon;

create policy "suscripciones_colonia: las propias" on public.suscripciones_colonia for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.suscripciones_colonia from anon, authenticated;
revoke all on public.suscripciones_colonia from anon;

create policy "push_suscripciones: las propias" on public.push_suscripciones for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.push_suscripciones from anon;

-- Notificaciones: se leen, se marcan como leídas y se borran; solo el sistema las crea.
create policy "notificaciones: leer las propias" on public.notificaciones for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notificaciones: marcar las propias" on public.notificaciones for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notificaciones: borrar las propias" on public.notificaciones for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.notificaciones from anon, authenticated;
grant update (leida) on public.notificaciones to authenticated;
revoke all on public.notificaciones from anon;

revoke execute on function
  public.suscribir_colonia_propia(),
  public.notificar_reporte(uuid, bigint)
from public, anon, authenticated;

revoke execute on function
  public.report_sighting(double precision, double precision, public.especie_animal, smallint,
    public.condicion_animal[], text, text, text, jsonb, uuid, public.tipo_reporte, text, text, text,
    public.tamano_animal, public.sexo_animal, boolean, timestamptz, text, public.origen_reporte, bigint, text, text),
  public.marcar_reunido(uuid, text),
  public.fusionar_animales(uuid, uuid)
from public, anon;
grant execute on function
  public.report_sighting(double precision, double precision, public.especie_animal, smallint,
    public.condicion_animal[], text, text, text, jsonb, uuid, public.tipo_reporte, text, text, text,
    public.tamano_animal, public.sexo_animal, boolean, timestamptz, text, public.origen_reporte, bigint, text, text),
  public.marcar_reunido(uuid, text),
  public.fusionar_animales(uuid, uuid)
to authenticated;

-- Avisos en vivo dentro de la app.
alter publication supabase_realtime add table public.notificaciones;
