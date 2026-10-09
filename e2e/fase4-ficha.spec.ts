import { expect, test } from "@playwright/test";
import { admin, borrarAnimales } from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

test.describe("Fase 4 · ficha", () => {
  test("muestra fotos, progreso e historia de un caso con varios estados", async ({ page }) => {
    const db = admin();
    const { data: caso } = await db
      .from("animals")
      .select("id, apodo, especie")
      .eq("estado", "esterilizado")
      .gt("total_avistamientos", 1)
      .limit(1)
      .single();

    await page.goto(`/animal/${caso!.id}`);
    await expect(page.getByTestId("ficha")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("Estado actual: Esterilizado")).toBeVisible();

    const historia = page.getByTestId("linea-tiempo");
    await expect(historia.getByText("Primer reporte")).toBeVisible();
    await expect(historia.getByText("Lo vieron de nuevo").first()).toBeVisible();
    for (const estado of ["En atención", "Rescatado", "Esterilizado"]) {
      await expect(historia.getByText(estado, { exact: true })).toBeVisible();
    }
    await page.screenshot({ path: "test-results/ficha.png", fullPage: true });
  });

  test("se actualiza en vivo cuando cambia el estado", async ({ page }) => {
    const db = admin();
    const { data: animal } = await db
      .from("animals")
      .insert({ especie: "perro", apodo: "Ficha E2E", lat: 25.6629, lng: -100.4037, total_avistamientos: 1 })
      .select("id")
      .single();
    creados.push(animal!.id);

    await page.goto(`/animal/${animal!.id}`);
    await expect(page.getByLabel("Estado actual: Avistado")).toBeVisible();
    await page.waitForTimeout(1500); // suscripción de Realtime

    await db.from("animals").update({ estado: "rescatado" }).eq("id", animal!.id);
    await db.from("status_updates").insert({
      animal_id: animal!.id,
      estado_anterior: "avistado",
      estado_nuevo: "rescatado",
      nota: "Rescate de prueba",
    });

    await expect(page.getByLabel("Estado actual: Rescatado")).toBeVisible();
    await expect(page.getByText("Rescate de prueba", { exact: false })).toBeVisible();
    // Un animal rescatado ya no ofrece "Lo vi también".
    await expect(page.getByRole("link", { name: "Lo vi también" })).toHaveCount(0);
  });

  test("un id inexistente muestra un aviso", async ({ page }) => {
    await page.goto("/animal/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("Este animal ya no está en el mapa.")).toBeVisible();
  });
});
