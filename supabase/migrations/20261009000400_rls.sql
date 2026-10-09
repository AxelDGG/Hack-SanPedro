-- CallejerOS · Row Level Security y permisos
-- Lectura pública del mapa; las escrituras pasan por las RPCs (security definer).

alter table public.colonias enable row level security;
alter table public.profiles enable row level security;
alter table public.animals enable row level security;
alter table public.sightings enable row level security;
alter table public.status_updates enable row level security;
alter table public.point_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- Lectura
create policy "colonias: lectura pública" on public.colonias for select using (true);
create policy "profiles: lectura pública" on public.profiles for select using (true);
create policy "animals: lectura pública" on public.animals for select using (true);
create policy "sightings: lectura pública" on public.sightings for select using (true);
create policy "status_updates: lectura pública" on public.status_updates for select using (true);
create policy "badges: lectura pública" on public.badges for select using (true);
create policy "user_badges: lectura pública" on public.user_badges for select using (true);
create policy "point_events: solo los propios" on public.point_events for select to authenticated
  using (user_id = (select auth.uid()));

-- Perfil: cada quien edita el suyo, y solo nombre y colonia (rol y puntos no).
create policy "profiles: editar el propio" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nombre, colonia_id) on public.profiles to authenticated;

-- Moderación: el municipio puede borrar animales y avistamientos; el autor, su avistamiento.
create policy "animals: municipio borra" on public.animals for delete to authenticated
  using ((select public.mi_rol()) = 'municipio');
create policy "sightings: autor o municipio borra" on public.sightings for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.mi_rol()) = 'municipio');

-- Sin inserts/updates directos en tablas de dominio: solo vía RPC.
revoke insert, update on public.animals, public.sightings, public.status_updates from anon, authenticated;
revoke insert, update, delete on public.status_updates, public.point_events, public.badges,
  public.user_badges, public.colonias from anon, authenticated;
revoke delete on public.animals, public.sightings from anon;

-- Funciones internas: no expuestas por la API.
revoke execute on function
  public.award_badges(uuid),
  public.premiar_caso_resuelto(uuid),
  public.handle_new_user(),
  public.sync_profile_points(),
  public.animals_asignar_colonia(),
  public.set_updated_at()
from public, anon, authenticated;

-- RPCs que requieren sesión.
revoke execute on function
  public.report_sighting(double precision, double precision, public.especie_animal, smallint,
    public.condicion_animal[], text, text, text, jsonb, uuid),
  public.change_animal_status(uuid, public.estado_animal, text),
  public.take_case(uuid)
from public, anon;
grant execute on function
  public.report_sighting(double precision, double precision, public.especie_animal, smallint,
    public.condicion_animal[], text, text, text, jsonb, uuid),
  public.change_animal_status(uuid, public.estado_animal, text),
  public.take_case(uuid)
to authenticated;
