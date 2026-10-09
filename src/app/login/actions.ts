"use server";

import { createClient } from "@/lib/supabase/server";
import { DEMO_EMAILS, type Rol } from "@/lib/constants";

/** Inicia sesión con un usuario demo; la contraseña nunca sale del servidor. */
export async function entrarComoDemo(rol: Rol): Promise<{ error?: string }> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return { error: "El modo demo está desactivado." };
  if (!Object.hasOwn(DEMO_EMAILS, rol)) return { error: "Rol inválido." };

  const password = process.env.DEMO_PASSWORD;
  if (!password) return { error: "Falta DEMO_PASSWORD en el servidor." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAILS[rol], password });
  if (error) return { error: "No se pudo entrar con el usuario demo. ¿Ya corriste el seed?" };
  return {};
}
