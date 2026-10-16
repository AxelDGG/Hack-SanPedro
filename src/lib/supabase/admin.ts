import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente con la llave secreta: se salta RLS. Solo para tareas del servidor que leen datos
 * privados de varios usuarios (p. ej. a quién mandar una alerta). Nunca en el navegador.
 */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
