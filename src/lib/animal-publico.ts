import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ESPECIES, TIPOS, etiquetaEstado } from "@/lib/constants";
import type { Database } from "@/types/database.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Datos públicos de un animal para la vista previa de links (sin sesión ni cookies). */
export async function animalPublico(id: string) {
  if (!UUID.test(id)) return null;
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await db
    .from("animals")
    .select("id, tipo, especie, apodo, raza, color, rasgos, estado, foto_portada_url, colonia:colonias(nombre)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type AnimalPublico = NonNullable<Awaited<ReturnType<typeof animalPublico>>>;

/** "Se busca: Luna", "Encontrado: perro en Del Valle"… */
export function tituloPublico(a: AnimalPublico) {
  const especie = ESPECIES[a.especie].label.toLowerCase();
  const donde = a.colonia?.nombre ? ` en ${a.colonia.nombre}` : "";
  if (a.tipo === "perdido") return `${etiquetaEstado(a.estado, a.tipo)}: ${a.apodo ?? `${especie} perdido`}${donde}`;
  if (a.tipo === "encontrado") return `${TIPOS.encontrado.label}: ${a.apodo ?? especie}${donde}`;
  return `${a.apodo ?? `Un ${especie}`} necesita ayuda${donde}`;
}

export function descripcionPublica(a: AnimalPublico) {
  const rasgos = [a.raza, a.color, a.rasgos].filter(Boolean).join(" · ");
  const llamado =
    a.tipo === "perdido"
      ? "Si lo ves, avisa en CallejerOS. No necesitas cuenta."
      : a.tipo === "encontrado"
        ? "¿Es tuyo o sabes de quién es? Mira la ficha."
        : "Mira dónde está y cómo ayudar.";
  return rasgos ? `${rasgos}. ${llamado}` : llamado;
}
