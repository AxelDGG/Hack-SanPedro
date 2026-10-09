-- CallejerOS · funciones, triggers y RPCs
-- Las escrituras sensibles (reportar, tomar caso, cambiar estado) solo ocurren aquí,
-- así los puntos y las transiciones no se pueden falsificar desde el cliente.

-- ───────────── Utilidades ─────────────

create function public.mi_rol() returns public.rol_usuario
language sql stable security definer set search_path = '' as $$
  select rol from public.profiles where id = auth.uid();
$$;

create function public.colonia_mas_cercana(p_lat double precision, p_lng double precision)
returns smallint
language sql stable set search_path = '' as $$
  select c.id
  from public.colonias c
  order by extensions.st_distance(
    c.centro,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  )
  limit 1;
$$;

-- Asigna colonia al animal cuando cambia su ubicación.
create function public.animals_asignar_colonia() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng then
    new.colonia_id := public.colonia_mas_cercana(new.lat, new.lng);
  end if;
  return new;
end $$;

create trigger animals_asignar_colonia before insert or update of lat, lng on public.animals
  for each row execute function public.animals_asignar_colonia();

-- Perfil automático al registrarse. El rol siempre inicia como vecino
-- (nunca se toma de user_metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombre)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1), 'Vecino'), 60)
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Gamificación ─────────────

-- Otorga las insignias cuyo umbral ya se cumplió. Devuelve las nuevas.
create function public.award_badges(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reportes int;
  v_confirmaciones int;
  v_resueltos int;
  v_puntos int;
  v_nuevas jsonb;
begin
  select
    count(*) filter (where motivo = 'reporte'),
    count(*) filter (where motivo = 'confirmacion'),
    count(*) filter (where motivo = 'caso_resuelto'),
    coalesce(sum(puntos), 0)
  into v_reportes, v_confirmaciones, v_resueltos, v_puntos
  from public.point_events
  where user_id = p_user;

  with nuevas as (
    insert into public.user_badges (user_id, badge_codigo)
    select p_user, b.codigo
    from public.badges b
    where case b.metrica
        when 'reportes' then v_reportes
        when 'confirmaciones' then v_confirmaciones
        when 'casos_resueltos' then v_resueltos
        when 'puntos' then v_puntos
      end >= b.umbral
    on conflict do nothing
    returning badge_codigo
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('codigo', b.codigo, 'nombre', b.nombre, 'icono', b.icono) order by b.orden),
    '[]'::jsonb
  )
  into v_nuevas
  from nuevas n
  join public.badges b on b.codigo = n.badge_codigo;

  return v_nuevas;
end $$;

-- Caso resuelto: huellas escalonadas por orden de llegada a todos los que
-- reportaron o confirmaron el animal (1º +20, 2º +15, 3º +10, resto +5).
-- El índice único evita pagar dos veces el mismo animal.
create function public.premiar_caso_resuelto(p_animal_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_premiados int;
begin
  with reportantes as (
    select user_id, min(created_at) as primera_vez
    from public.sightings
    where animal_id = p_animal_id and user_id is not null
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
  from (select distinct user_id from public.sightings where animal_id = p_animal_id and user_id is not null) u;

  return v_premiados;
end $$;

-- ───────────── RPCs públicas ─────────────

-- Reporta un avistamiento: crea un animal nuevo o lo vincula a uno existente.
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
  p_animal_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_animal uuid := p_animal_id;
  v_sighting uuid;
  v_puntos int := 0;
  v_filas int;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para reportar' using errcode = '42501';
  end if;

  if v_animal is null then
    insert into public.animals (
      especie, rasgos, condiciones, urgencia, lat, lng,
      foto_portada_url, reportado_por, total_avistamientos, visto_ultima_vez
    )
    values (
      p_especie, p_rasgos, coalesce(p_condiciones, '{}'), p_urgencia, p_lat, p_lng,
      p_foto_url, v_user, 1, now()
    )
    returning id into v_animal;
  else
    update public.animals set
      lat = p_lat,
      lng = p_lng,
      urgencia = greatest(urgencia, p_urgencia),
      condiciones = case when cardinality(p_condiciones) > 0 then p_condiciones else condiciones end,
      rasgos = coalesce(rasgos, p_rasgos),
      foto_portada_url = coalesce(foto_portada_url, p_foto_url),
      total_avistamientos = total_avistamientos + 1,
      visto_ultima_vez = now()
    where id = v_animal;

    if not found then
      raise exception 'Animal no encontrado' using errcode = 'P0002';
    end if;
  end if;

  insert into public.sightings (animal_id, user_id, foto_url, lat, lng, notas, analisis_ia, es_confirmacion)
  values (v_animal, v_user, p_foto_url, p_lat, p_lng, p_notas, p_analisis_ia, p_animal_id is not null)
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

  return jsonb_build_object(
    'animal_id', v_animal,
    'sighting_id', v_sighting,
    'puntos', v_puntos,
    'insignias', public.award_badges(v_user)
  );
end $$;

-- Animales activos de la misma especie con avistamientos recientes cerca: "¿Es este?"
create function public.find_duplicate_candidates(
  p_lat double precision,
  p_lng double precision,
  p_especie public.especie_animal,
  p_radio_m int default 300,
  p_dias int default 7
) returns table (
  id uuid,
  especie public.especie_animal,
  apodo text,
  rasgos text,
  condiciones public.condicion_animal[],
  estado public.estado_animal,
  urgencia smallint,
  foto_portada_url text,
  visto_ultima_vez timestamptz,
  total_avistamientos int,
  distancia_m double precision,
  fotos text[]
)
language sql stable set search_path = '' as $$
  with punto as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ),
  cercanos as (
    select s.animal_id, min(extensions.st_distance(s.ubicacion, punto.g)) as distancia_m
    from public.sightings s, punto
    where extensions.st_dwithin(s.ubicacion, punto.g, p_radio_m)
      and s.created_at > now() - make_interval(days => p_dias)
    group by s.animal_id
  )
  select
    a.id, a.especie, a.apodo, a.rasgos, a.condiciones, a.estado, a.urgencia,
    a.foto_portada_url, a.visto_ultima_vez, a.total_avistamientos, c.distancia_m,
    array(
      select s2.foto_url from public.sightings s2
      where s2.animal_id = a.id and s2.foto_url is not null
      order by s2.created_at desc
      limit 3
    ) as fotos
  from cercanos c
  join public.animals a on a.id = c.animal_id
  where a.especie = p_especie
    and a.estado in ('avistado', 'en_atencion')
  order by c.distancia_m
  limit 5;
$$;

-- Casos para el panel de rescatista, por urgencia y luego distancia.
create function public.nearby_cases(
  p_lat double precision,
  p_lng double precision,
  p_radio_km double precision default 10,
  p_estados public.estado_animal[] default '{avistado,en_atencion}'
) returns table (
  id uuid,
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
    a.id, a.especie, a.apodo, a.rasgos, a.condiciones, a.estado, a.urgencia, a.lat, a.lng,
    a.foto_portada_url, c.nombre, a.rescatista_id, a.total_avistamientos, a.visto_ultima_vez,
    extensions.st_distance(a.ubicacion_ultima, punto.g) as distancia_m
  from public.animals a
  cross join punto
  left join public.colonias c on c.id = a.colonia_id
  where a.estado = any (p_estados)
    and extensions.st_dwithin(a.ubicacion_ultima, punto.g, p_radio_km * 1000)
  order by a.urgencia desc, distancia_m asc
  limit 100;
$$;

-- Cambia el estado de un animal (rescatista o municipio) y deja rastro en status_updates.
create function public.change_animal_status(
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

  if p_estado in ('rescatado', 'esterilizado', 'adoptado') then
    v_premiados := public.premiar_caso_resuelto(p_animal_id);
  end if;

  return jsonb_build_object('cambiado', true, 'premiados', v_premiados);
end $$;

-- Un rescatista toma el caso: queda asignado y pasa a "en atención".
create function public.take_case(p_animal_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_animal;
begin
  if public.mi_rol() is distinct from 'rescatista' then
    raise exception 'Solo rescatistas pueden tomar casos' using errcode = '42501';
  end if;

  select estado into v_estado from public.animals where id = p_animal_id for update;
  if not found then
    raise exception 'Animal no encontrado' using errcode = 'P0002';
  end if;

  update public.animals set rescatista_id = auth.uid() where id = p_animal_id;

  if v_estado = 'avistado' then
    return public.change_animal_status(p_animal_id, 'en_atencion', 'Caso tomado');
  end if;
  return jsonb_build_object('cambiado', false, 'premiados', 0);
end $$;

-- ───────────── Vistas para dashboard y ranking ─────────────

create view public.v_stats_mensuales with (security_invoker = true) as
with meses as (
  select generate_series(
    date_trunc('month', now() at time zone 'America/Monterrey') - interval '5 months',
    date_trunc('month', now() at time zone 'America/Monterrey'),
    interval '1 month'
  ) as mes
)
select
  m.mes::date as mes,
  (select count(*) from public.sightings s
    where date_trunc('month', s.created_at at time zone 'America/Monterrey') = m.mes)::int as reportes,
  (select count(*) from public.status_updates u
    where u.estado_nuevo = 'rescatado'
      and date_trunc('month', u.created_at at time zone 'America/Monterrey') = m.mes)::int as rescates,
  (select count(*) from public.status_updates u
    where u.estado_nuevo = 'esterilizado'
      and date_trunc('month', u.created_at at time zone 'America/Monterrey') = m.mes)::int as esterilizaciones,
  (select count(*) from public.status_updates u
    where u.estado_nuevo = 'adoptado'
      and date_trunc('month', u.created_at at time zone 'America/Monterrey') = m.mes)::int as adopciones
from meses m
order by m.mes;

create view public.v_ranking_colonias with (security_invoker = true) as
select
  c.id,
  c.nombre,
  coalesce(sum(p.puntos), 0)::int as puntos,
  count(p.id)::int as vecinos,
  (select count(*) from public.animals a
    where a.colonia_id = c.id and a.estado in ('avistado', 'en_atencion'))::int as animales_en_calle
from public.colonias c
left join public.profiles p on p.colonia_id = c.id
group by c.id, c.nombre;
