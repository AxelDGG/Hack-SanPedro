/**
 * Sincroniza el catálogo de colonias con el Registro Municipal (GET /v1/colonias) y vuelve a
 * asignar cada animal a su colonia más cercana.
 *
 *   npm run sync:colonias
 *
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, REGISTRO_API_URL y REGISTRO_API_KEY.
 * Con la API simulada: `cd registro-municipal-api && npm run dev` en otra terminal.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import type { ColoniaRegistro } from "../src/lib/registro/tipos";

const { NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET, REGISTRO_API_URL: API, REGISTRO_API_KEY: KEY } = process.env;
if (!URL || !SECRET || !API) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY o REGISTRO_API_URL en .env.local");
  process.exit(1);
}

const db = createClient<Database>(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const res = await fetch(`${API!.replace(/\/$/, "")}/v1/colonias`, { headers: { "X-Api-Key": KEY ?? "" } });
  if (!res.ok) throw new Error(`El registro respondió ${res.status}: ${await res.text()}`);
  const { data } = (await res.json()) as { data: (ColoniaRegistro & { aprox?: boolean })[] };
  console.log(`📥 ${data.length} colonias del registro municipal`);

  // El nombre es la llave: las colonias que ya existían conservan su id (y sus reportes).
  const { error } = await db.from("colonias").upsert(
    data.map((c) => ({
      nombre: c.nombre,
      clave: c.clave,
      lat: c.lat,
      lng: c.lng,
      codigo_postal: c.codigo_postal,
      distrito: c.distrito,
      centro_aproximado: c.aprox ?? false,
    })),
    { onConflict: "nombre" },
  );
  if (error) throw error;

  const { data: cambiados, error: e2 } = await db.rpc("reasignar_colonias");
  if (e2) throw e2;
  const { count } = await db.from("colonias").select("id", { count: "exact", head: true });
  console.log(`✅ ${count} colonias en la base · ${cambiados} animales cambiaron de colonia`);
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
