-- CallejerOS · gamificación: historial de puntos (huellas) e insignias

create table public.point_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  motivo text not null check (motivo in ('reporte', 'confirmacion', 'caso_resuelto')),
  puntos int not null,
  animal_id uuid references public.animals on delete set null,
  created_at timestamptz not null default now()
);
create index point_events_user_idx on public.point_events (user_id, created_at desc);
-- Anti-trampa: una confirmación y un "caso resuelto" por usuario y animal.
create unique index point_events_unico_idx on public.point_events (user_id, animal_id, motivo)
  where motivo in ('confirmacion', 'caso_resuelto');

-- Mantiene profiles.puntos sincronizado con el historial.
create function public.sync_profile_points() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set puntos = puntos + new.puntos where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set puntos = puntos - old.puntos where id = old.user_id;
  end if;
  return null;
end $$;

create trigger point_events_sync after insert or delete on public.point_events
  for each row execute function public.sync_profile_points();

create table public.badges (
  codigo text primary key,
  nombre text not null,
  descripcion text not null,
  icono text not null,
  metrica text not null check (metrica in ('reportes', 'confirmaciones', 'casos_resueltos', 'puntos')),
  umbral int not null check (umbral > 0),
  orden smallint not null default 0
);

create table public.user_badges (
  user_id uuid not null references public.profiles on delete cascade,
  badge_codigo text not null references public.badges on delete cascade,
  otorgada_at timestamptz not null default now(),
  primary key (user_id, badge_codigo)
);

insert into public.badges (codigo, nombre, descripcion, icono, metrica, umbral, orden) values
  ('primer-huellazo', 'Primer Huellazo', 'Hiciste tu primer reporte.', 'huella', 'reportes', 1, 1),
  ('ojo-de-barrio', 'Ojo de Barrio', 'Reportaste 5 animales.', 'ojo', 'reportes', 5, 2),
  ('vigia-de-colonia', 'Vigía de la Colonia', 'Reportaste 15 animales.', 'faro', 'reportes', 15, 3),
  ('segunda-mirada', 'Segunda Mirada', 'Confirmaste 3 reportes de otros vecinos.', 'lupa', 'confirmaciones', 3, 4),
  ('final-feliz', 'Final Feliz', 'Un animal que reportaste fue rescatado.', 'corazon', 'casos_resueltos', 1, 5),
  ('red-de-rescate', 'Red de Rescate', 'Cinco animales que reportaste fueron rescatados.', 'red', 'casos_resueltos', 5, 6),
  ('corazon-callejero', 'Corazón Callejero', 'Juntaste 200 huellas.', 'estrella', 'puntos', 200, 7);
