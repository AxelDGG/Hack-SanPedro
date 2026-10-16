-- CallejerOS · "misma foto" más estricta: ≤ 5 bits distintos de 48 (antes 8).
-- Con 8, dos fotos distintas con la misma composición (perro centrado, fondo liso) se confundían.

create or replace function public.find_duplicate_candidates(
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
      and public.distancia_hash(s.foto_hash, p_foto_hash) <= 5
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
