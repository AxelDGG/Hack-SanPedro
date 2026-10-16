-- CallejerOS · estado "reunido": la mascota perdida volvió con su familia.
-- Va en su propia migración: un valor nuevo de enum no se puede usar en la misma transacción que lo crea.
alter type public.estado_animal add value if not exists 'reunido';
