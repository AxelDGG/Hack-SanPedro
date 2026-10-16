import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import { DEMO_EMAILS } from "../src/lib/constants";
import { admin, borrarAnimales, entrarComo } from "./helpers";

/** Lo que no debe poder hacer un vecino cualquiera (o un invitado) aunque llame a la API directo. */
const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

async function comoVecina() {
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await db.auth.signInWithPassword({ email: DEMO_EMAILS.vecino, password: process.env.DEMO_PASSWORD! });
  if (error) throw error;
  return db;
}

async function animalAjeno(extra: Partial<Database["public"]["Tables"]["animals"]["Insert"]> = {}) {
  const db = admin();
  const { data: otro } = await db.from("profiles").select("id").eq("nombre", "Lucía Benavides").single();
  const { data } = await db
    .from("animals")
    .insert({ especie: "perro", lat: 25.631, lng: -100.381, reportado_por: otro!.id, total_avistamientos: 1, ...extra })
    .select("id")
    .single();
  creados.push(data!.id);
  return { id: data!.id, duenoId: otro!.id };
}

test.describe("Seguridad", () => {
  test("los teléfonos no se pueden descargar en bloque; solo de uno en uno", async () => {
    const { id } = await animalAjeno({ tipo: "perdido", apodo: "Privado E2E" });
    await admin().from("animal_contactos").insert({ animal_id: id, nombre: "Dueña E2E", telefono: "8100000777" });

    const vecina = await comoVecina();
    const { data: enBloque, error } = await vecina.from("animal_contactos").select("telefono");
    expect(error ?? enBloque?.length === 0).toBeTruthy();

    const { data: uno } = await vecina.rpc("ver_contacto", { p_animal_id: id });
    expect(uno).toEqual([{ nombre: "Dueña E2E", telefono: "8100000777" }]);
    // Y quedó en la bitácora.
    const { count } = await admin().from("accesos_contacto").select("*", { count: "exact", head: true }).eq("animal_id", id);
    expect(count).toBe(1);
  });

  test("las funciones internas no se pueden llamar desde el navegador", async () => {
    const vecina = await comoVecina();
    const { error } = await vecina.rpc("consumir_cuota", { p_clave: "x", p_limite: 1 });
    expect(error).not.toBeNull();
    const { error: e2 } = await vecina.rpc("reasignar_colonias");
    expect(e2).not.toBeNull();
  });

  test("un vecino no puede absorber el reporte de otra persona", async () => {
    const ajeno = await animalAjeno({ apodo: "Ajeno E2E" });
    const vecina = await comoVecina();
    const { data: yo } = await vecina.auth.getUser();
    const { data: mio } = await admin()
      .from("animals")
      .insert({ especie: "perro", lat: 25.6311, lng: -100.3811, reportado_por: yo.user!.id, total_avistamientos: 1 })
      .select("id")
      .single();
    creados.push(mio!.id);

    const { error } = await vecina.rpc("fusionar_animales", { p_origen: ajeno.id, p_destino: mio!.id });
    expect(error?.message).toMatch(/Solo puedes unir un reporte tuyo/);
    const { data } = await admin().from("animals").select("fusionado_en").eq("id", ajeno.id).single();
    expect(data!.fusionado_en).toBeNull();
  });

  test("no se puede mandar el SMS del registro con un reporte ajeno", async ({ page }) => {
    const { id } = await animalAjeno({ tipo: "encontrado" });
    await entrarComo(page, "vecino");
    const res = await page.request.post("/api/registro", {
      data: { accion: "avisar", folio: "SPGG-M-2024-00224", animal_id: id },
    });
    // 403 con el registro conectado; 503 si la API del registro no está corriendo.
    expect([403, 503]).toContain(res.status());
  });

  test("la app manda encabezados de seguridad", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("las rutas con IA piden sesión", async ({ request }) => {
    expect((await request.post("/api/analyze")).status()).toBe(401);
    expect((await request.post("/api/analizar-publicacion", { data: { texto: "hola mundo, un perro" } })).status()).toBe(401);
    expect((await request.post("/api/alertas", { data: { animal_id: "x" } })).status()).toBe(401);
  });
});
