-- CallejerOS · avisos en vivo de huellas e insignias.
-- Realtime respeta RLS: cada usuario solo recibe sus propios point_events;
-- user_badges es pública y el cliente filtra por su usuario.
alter publication supabase_realtime add table public.point_events, public.user_badges;
