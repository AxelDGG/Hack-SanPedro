-- CallejerOS · esquema base: extensiones, enums, tablas principales
create extension if not exists postgis with schema extensions;

create type public.rol_usuario as enum ('vecino', 'rescatista', 'municipio');
create type public.especie_animal as enum ('perro', 'gato', 'otro');
create type public.estado_animal as enum ('avistado', 'en_atencion', 'rescatado', 'esterilizado', 'adoptado');
create type public.condicion_animal as enum ('sano', 'flaco', 'herido', 'cachorro');

-- Colonias con centro aproximado; cada animal se asigna a la más cercana.
create table public.colonias (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  lat double precision not null,
  lng double precision not null,
  centro extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  rol public.rol_usuario not null default 'vecino',
  puntos int not null default 0, -- total de point_events, lo mantiene un trigger
  colonia_id smallint references public.colonias,
  created_at timestamptz not null default now()
);

-- lat/lng son columnas normales (llegan completas en los eventos de Realtime);
-- la geografía se deriva de ellas para consultas espaciales.
create table public.animals (
  id uuid primary key default gen_random_uuid(),
  especie public.especie_animal not null,
  apodo text check (char_length(apodo) <= 40),
  rasgos text check (char_length(rasgos) <= 280),
  condiciones public.condicion_animal[] not null default '{}',
  estado public.estado_animal not null default 'avistado',
  urgencia smallint not null default 2 check (urgencia between 1 and 5),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  ubicacion_ultima extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  colonia_id smallint references public.colonias,
  foto_portada_url text,
  reportado_por uuid references public.profiles on delete set null,
  rescatista_id uuid references public.profiles on delete set null,
  total_avistamientos int not null default 0,
  visto_ultima_vez timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index animals_ubicacion_gix on public.animals using gist (ubicacion_ultima);
create index animals_estado_urgencia_idx on public.animals (estado, urgencia desc);
create index animals_rescatista_idx on public.animals (rescatista_id);

create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals on delete cascade,
  user_id uuid references public.profiles on delete set null,
  foto_url text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  ubicacion extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  notas text check (char_length(notas) <= 500),
  analisis_ia jsonb,
  es_confirmacion boolean not null default false,
  created_at timestamptz not null default now()
);
create index sightings_animal_idx on public.sightings (animal_id, created_at desc);
create index sightings_user_idx on public.sightings (user_id);
create index sightings_ubicacion_gix on public.sightings using gist (ubicacion);

create table public.status_updates (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals on delete cascade,
  user_id uuid references public.profiles on delete set null,
  estado_anterior public.estado_animal,
  estado_nuevo public.estado_animal not null,
  nota text check (char_length(nota) <= 500),
  created_at timestamptz not null default now()
);
create index status_updates_animal_idx on public.status_updates (animal_id, created_at);
create index status_updates_estado_fecha_idx on public.status_updates (estado_nuevo, created_at);

-- updated_at automático
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger animals_set_updated_at before update on public.animals
  for each row execute function public.set_updated_at();

-- Colonias de San Pedro Garza García (centros aproximados; sustituir por polígonos oficiales si se consiguen)
insert into public.colonias (nombre, lat, lng) values
  ('Casco Urbano', 25.6573, -100.4026),
  ('Tampiquito', 25.6608, -100.3965),
  ('Lucio Blanco', 25.6662, -100.4078),
  ('San Pedro 400', 25.6712, -100.4150),
  ('El Obispo', 25.6700, -100.4235),
  ('Vista Montaña', 25.6605, -100.4190),
  ('Los Pinos', 25.6640, -100.3870),
  ('Canteras', 25.6690, -100.3960),
  ('Mirasierra', 25.6520, -100.4140),
  ('Los Sauces', 25.6630, -100.4300),
  ('Valle de Santa Engracia', 25.6510, -100.3950),
  ('Colonial de la Sierra', 25.6355, -100.3970),
  ('Lomas del Valle', 25.6420, -100.3860),
  ('Fuentes del Valle', 25.6475, -100.3740),
  ('Del Valle', 25.6560, -100.3680),
  ('Carrizalejo', 25.6490, -100.3600),
  ('Valle de San Ángel', 25.6390, -100.3580),
  ('Bosques del Valle', 25.6625, -100.3560),
  ('Valle del Campestre', 25.6585, -100.3475),
  ('Residencial San Agustín', 25.6480, -100.3420),
  ('Valle Oriente', 25.6405, -100.3240);
