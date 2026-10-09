-- CallejerOS · Storage para fotos y publicación Realtime

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario sube solo dentro de su carpeta: fotos/{user_id}/archivo.jpg
create policy "fotos: subir a carpeta propia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "fotos: borrar las propias" on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- El mapa escucha cambios en vivo.
alter publication supabase_realtime add table public.animals, public.sightings, public.status_updates;
