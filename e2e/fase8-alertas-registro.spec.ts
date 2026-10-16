import { expect, test, type Browser } from "@playwright/test";
import { admin, animalIdDeExito, avanzarHastaPublicar, borrarAnimales, entrarComo, fotoDePrueba } from "./helpers";
import { DEMO_EMAILS } from "../src/lib/constants";

/**
 * Taller del 15 de octubre: alertas por colonia, avisos a la familia de una mascota perdida,
 * registro municipal de mascotas y vista previa de los links que se comparten en los grupos.
 */
const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

async function nuevaPantalla(browser: Browser, geo?: { latitude: number; longitude: number }) {
  const contexto = await browser.newContext({ ...test.info().project.use, ...(geo ? { geolocation: geo } : {}) });
  return { contexto, page: await contexto.newPage() };
}

async function vecinaId() {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === DEMO_EMAILS.vecino)!.id;
}

test.describe("Fase 8 · alertas, perdidos y registro", () => {
  test("un reporte en tu colonia te llega como aviso en vivo", async ({ browser }) => {
    test.setTimeout(90_000);
    // La vecina demo sigue Casco Urbano.
    const vecina = await nuevaPantalla(browser);
    await entrarComo(vecina.page, "vecino");
    await vecina.page.goto("/avisos");
    await expect(vecina.page.getByTestId("colonias-seguidas")).toContainText("Casco Urbano");
    await vecina.page.waitForTimeout(1500); // Realtime

    // Alguien más reporta un callejero en Casco Urbano.
    const otro = await nuevaPantalla(browser, { latitude: 25.6629, longitude: -100.4037 });
    await entrarComo(otro.page, "rescatista");
    await otro.page.goto("/reportar?tipo=callejero");
    await otro.page.getByTestId("foto-galeria").setInputFiles(await fotoDePrueba("perro-7"));
    await expect(otro.page.getByTestId("ai-resultado")).toBeVisible();
    await avanzarHastaPublicar(otro.page);
    // Si hay parecidos, se eligió "Siguiente" sin seleccionar: es un reporte nuevo.
    await otro.page.getByTestId("publicar").click();
    await expect(otro.page.getByTestId("avisos-enviados")).toContainText("Avisamos a");
    creados.push(await animalIdDeExito(otro.page));

    await expect(vecina.page.getByTestId("aviso-huellas").filter({ hasText: "Casco Urbano" })).toBeVisible();
    await expect(vecina.page.getByTestId("lista-avisos")).toContainText("necesita ayuda en Casco Urbano");

    await vecina.contexto.close();
    await otro.contexto.close();
  });

  test("si alguien ve a tu mascota perdida, te avisa al instante; luego la marcas en casa", async ({ browser }) => {
    test.setTimeout(90_000);
    const db = admin();
    const duena = await vecinaId();
    const { data: perdido } = await db
      .from("animals")
      .insert({
        tipo: "perdido",
        especie: "perro",
        apodo: "Bombón E2E",
        color: "Blanco",
        lat: 25.6512,
        lng: -100.3788,
        reportado_por: duena,
        total_avistamientos: 1,
        perdido_desde: new Date().toISOString(),
      })
      .select("id")
      .single();
    creados.push(perdido!.id);
    await db.from("sightings").insert({ animal_id: perdido!.id, user_id: duena, lat: 25.6512, lng: -100.3788 });
    await db.from("animal_contactos").insert({ animal_id: perdido!.id, nombre: "Vecina Demo", telefono: "8100000999" });

    const vecina = await nuevaPantalla(browser);
    await entrarComo(vecina.page, "vecino");
    await vecina.page.waitForTimeout(1500); // Realtime

    // Un rescatista lo ve y lo confirma desde la ficha ("¡Lo vi!").
    const otro = await nuevaPantalla(browser, { latitude: 25.652, longitude: -100.379 });
    await entrarComo(otro.page, "rescatista");
    await otro.page.goto(`/animal/${perdido!.id}`);
    await expect(otro.page.locator("header").getByText("Se busca", { exact: true })).toBeVisible();
    await otro.page.getByTestId("ver-contacto").click();
    await expect(otro.page.getByTestId("contacto")).toContainText("Vecina Demo");
    await otro.page.getByRole("link", { name: "¡Lo vi!" }).click();
    await avanzarHastaPublicar(otro.page);
    await otro.page.getByTestId("publicar").click();
    await expect(otro.page.getByTestId("avisos-enviados")).toContainText("Le avisamos a su familia");

    await expect(vecina.page.getByTestId("aviso-huellas").filter({ hasText: "¡Vieron a Bombón E2E!" })).toBeVisible();

    // La familia lo encontró: "¡Ya está en casa!" y quien ayudó gana huellas.
    await vecina.page.goto(`/animal/${perdido!.id}`);
    await vecina.page.getByTestId("marcar-reunido").click();
    await expect(vecina.page.getByLabel("Estado actual: En casa")).toBeVisible();
    const { data: premio } = await db
      .from("point_events")
      .select("puntos")
      .eq("animal_id", perdido!.id)
      .eq("motivo", "caso_resuelto");
    expect(premio).toEqual([{ puntos: 20 }]); // solo el rescatista; la familia no se premia a sí misma

    await vecina.contexto.close();
    await otro.contexto.close();
  });

  test("registro municipal: buscar por nombre llena el reporte de la mascota perdida", async ({ page }) => {
    const disponible = await fetch(`${process.env.REGISTRO_API_URL ?? "http://localhost:4000"}/salud`)
      .then((r) => r.ok)
      .catch(() => false);
    test.skip(!disponible, "La API del registro municipal no está corriendo (npm run registro)");

    await entrarComo(page, "vecino");
    await page.goto("/reportar?tipo=perdido");
    await page.getByTestId("abrir-registro").click();
    await page.getByTestId("buscar-registro").fill("SPGG-M-2024-00224");
    await page.getByRole("button", { name: /Canela/ }).click();
    await expect(page.getByText("Canela está en el registro municipal")).toBeVisible();

    await page.getByTestId("siguiente").click();
    await expect(page.getByTestId("nombre-mascota")).toHaveValue("Canela");
    await expect(page.getByTestId("resumen-datos")).toContainText("Mediano");
  });

  test("el link de la ficha trae vista previa para WhatsApp", async ({ request }) => {
    const { data } = await admin()
      .from("animals")
      .select("id, apodo")
      .eq("tipo", "perdido")
      .eq("estado", "avistado")
      .not("apodo", "is", null)
      .limit(1)
      .single();
    const html = await (await request.get(`/animal/${data!.id}`, { headers: { "User-Agent": "WhatsApp/2.23.20.0 A" } })).text();
    expect(html).toContain(`property="og:title" content="Se busca: ${data!.apodo}`);
    const og = html.match(/property="og:image" content="([^"]+)"/)?.[1].replaceAll("&amp;", "&");
    expect(og).toMatch(/\/animal\/[^/]+\/opengraph-image/);

    const imagen = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(imagen.headers()["content-type"]).toBe("image/png");
  });
});
