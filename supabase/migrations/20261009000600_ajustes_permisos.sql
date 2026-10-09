-- CallejerOS · mi_rol() solo la necesitan las políticas de usuarios con sesión.
revoke execute on function public.mi_rol() from public, anon;
grant execute on function public.mi_rol() to authenticated;
