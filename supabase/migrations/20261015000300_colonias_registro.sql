-- CallejerOS · catálogo de colonias del Registro Municipal (las ~200 de San Pedro).
-- Los datos se cargan con `npm run sync:colonias`, que los pide a la API del registro.

-- Algunas colonias solo tienen el centro de su código postal (varias comparten el mismo punto).
alter table public.colonias add column centro_aproximado boolean not null default false;

-- Más cercana, pero un centro aproximado cuenta como 400 m más lejos: así una colonia con
-- ubicación real no pierde sus reportes contra el centro genérico de un código postal.
create or replace function public.colonia_mas_cercana(p_lat double precision, p_lng double precision)
returns smallint
language sql stable set search_path = '' as $$
  select c.id
  from public.colonias c
  order by extensions.st_distance(
    c.centro,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  ) + case when c.centro_aproximado then 400 else 0 end
  limit 1;
$$;

-- Tras actualizar el catálogo, cada animal vuelve a quedar en su colonia más cercana.
-- La colonia de los vecinos no se toca: la eligieron ellos. Solo la usa el script de sincronización.
create function public.reasignar_colonias() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_cambiados int;
begin
  update public.animals a
  set colonia_id = public.colonia_mas_cercana(a.lat, a.lng)
  where a.colonia_id is distinct from public.colonia_mas_cercana(a.lat, a.lng);
  get diagnostics v_cambiados = row_count;
  return v_cambiados;
end $$;

revoke execute on function public.reasignar_colonias() from public, anon, authenticated;
