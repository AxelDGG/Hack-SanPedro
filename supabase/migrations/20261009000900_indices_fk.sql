-- CallejerOS · índices para llaves foráneas (sugeridos por el advisor de rendimiento).
create index if not exists animals_colonia_idx on public.animals (colonia_id);
create index if not exists animals_reportado_por_idx on public.animals (reportado_por);
create index if not exists point_events_animal_idx on public.point_events (animal_id);
create index if not exists profiles_colonia_idx on public.profiles (colonia_id);
create index if not exists status_updates_user_idx on public.status_updates (user_id);
create index if not exists user_badges_badge_idx on public.user_badges (badge_codigo);
