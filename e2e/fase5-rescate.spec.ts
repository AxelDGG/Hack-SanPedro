import { expect, test } from "@playwright/test";
import { admin, borrarAnimales, entrarComo } from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

/** Caso urgente reportado por la vecina demo, cerca del centro. */
async function crearCasoUrgente(apodo: string) {
  const db = admin();
  const { data: vecina } = await db.from("profiles").select("id, puntos").eq("nombre", "Vecina Demo").single();
  const punto = { lat: 25.6633, lng: -100.4031 };
  const { data: animal } = await db
    .from("animals")
    .insert({ especie: "perro", apodo, urgencia: 5, condiciones: ["herido"], ...punto, reportado_por: vecina!.id, total_avistamientos: 1 })
    .select("id")
    .single();
  creados.push(animal!.id);
  await db.from("sightings").insert({ animal_id: animal!.id, user_id: vecina!.id, ...punto });
  return { animalId: animal!.id, vecinaId: vecina!.id, puntosAntes: vecina!.puntos };
}

test.describe("Fase 5 · rescate", () => {
  test("un vecino no ve el panel de rescate", async ({ page }) => {
    await entrarComo(page, "vecino");
    await page.goto("/rescate");
    await expect(page.getByText("Esta sección no es para tu rol")).toBeVisible();
  });

  test("tomar un caso urgente y marcarlo como rescatado reparte huellas", async ({ page }) => {
    const { animalId, vecinaId, puntosAntes } = await crearCasoUrgente("Urgente E2E");
    await entrarComo(page, "rescatista");
    await page.goto("/rescate");

    const caso = page.getByTestId("caso").filter({ hasText: "Urgente E2E" });
    await expect(caso).toBeVisible();
    // Urgencia 5 al tope de la lista.
    await expect(page.getByTestId("caso").first()).toContainText("Crítica");
    await page.screenshot({ path: "test-results/panel-rescate.png" });

    await caso.getByRole("button", { name: "Tomar caso" }).click();
    await expect(page.getByRole("status")).toContainText("Tomaste el caso");
    await expect(caso.getByText("Caso a tu cargo")).toBeVisible();

    await page.getByRole("tab", { name: "Mis casos" }).click();
    const mio = page.getByTestId("caso").filter({ hasText: "Urgente E2E" });
    await mio.getByRole("button", { name: "Cambiar estado" }).click();
    await page.getByRole("radio", { name: /Rescatado/ }).click();
    await page.getByPlaceholder("Nota para la comunidad (opcional)").fill("Rescate e2e");
    await page.getByTestId("guardar-estado").click();
    await expect(page.getByRole("status")).toContainText("1 vecino ganó huellas");

    const db = admin();
    const { data: animal } = await db.from("animals").select("estado, rescatista_id").eq("id", animalId).single();
    expect(animal!.estado).toBe("rescatado");
    const { data: vecina } = await db.from("profiles").select("puntos").eq("id", vecinaId).single();
    expect(vecina!.puntos).toBe(puntosAntes + 20);
  });

  test("desde la ficha también se puede cambiar el estado", async ({ page }) => {
    const { animalId } = await crearCasoUrgente("Ficha Rescate E2E");
    await entrarComo(page, "rescatista");
    await page.goto(`/animal/${animalId}`);

    const acciones = page.getByTestId("acciones-rescate");
    await acciones.getByRole("button", { name: "Tomar caso" }).click();
    await expect(page.getByLabel("Estado actual: En atención")).toBeVisible();

    await acciones.getByRole("button", { name: "Cambiar estado" }).click();
    await page.getByRole("radio", { name: /Esterilizado/ }).click();
    await page.getByTestId("guardar-estado").click();
    await expect(page.getByLabel("Estado actual: Esterilizado")).toBeVisible();
    await page.screenshot({ path: "test-results/ficha-rescatista.png" });
  });
});
