-- CallejerOS · centros de colonias corregidos con datos de OpenStreetMap (Nominatim).
-- Sustituye estimaciones previas que caían fuera del municipio o en el cauce del río.

-- Colonias que se retiran: primero se desvinculan.
update public.animals set colonia_id = null
where colonia_id in (select id from public.colonias where nombre in ('Valle de Santa Engracia', 'Valle del Campestre'));
update public.profiles set colonia_id = null
where colonia_id in (select id from public.colonias where nombre in ('Valle de Santa Engracia', 'Valle del Campestre'));
delete from public.colonias where nombre in ('Valle de Santa Engracia', 'Valle del Campestre');

-- "Canteras" (estimada) pasa a ser la Unidad Habitacional Revolución.
update public.colonias set nombre = 'U.H. Revolución' where nombre = 'Canteras';

update public.colonias c set lat = v.lat, lng = v.lng
from (values
  ('Casco Urbano', 25.6629, -100.4037),
  ('Tampiquito', 25.6528, -100.3816),
  ('Lucio Blanco', 25.6712, -100.4046),
  ('San Pedro 400', 25.6840, -100.4142),
  ('El Obispo', 25.6804, -100.4034),
  ('Vista Montaña', 25.6816, -100.4064),
  ('Los Pinos', 25.6717, -100.3951),
  ('U.H. Revolución', 25.6830, -100.4093),
  ('Mirasierra', 25.6528, -100.3897),
  ('Los Sauces', 25.6604, -100.4114),
  ('Colonial de la Sierra', 25.6349, -100.3848),
  ('Lomas del Valle', 25.6450, -100.3816),
  ('Fuentes del Valle', 25.6654, -100.3657),
  ('Del Valle', 25.6587, -100.3699),
  ('Carrizalejo', 25.6373, -100.3657),
  ('Valle de San Ángel', 25.6251, -100.3663),
  ('Bosques del Valle', 25.6441, -100.3745),
  ('Residencial San Agustín', 25.6516, -100.3417),
  ('Valle Oriente', 25.6449, -100.3220)
) as v(nombre, lat, lng)
where c.nombre = v.nombre;

-- Reasigna la colonia de los animales existentes con los nuevos centros.
update public.animals set colonia_id = public.colonia_mas_cercana(lat, lng);
