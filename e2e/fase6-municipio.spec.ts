import { expect, test, type Page } from "@playwright/test";
import { admin, borrarAnimales, entrarComo } from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

const valorKpi = (page: Page, etiqueta: string) =>
  page.getByTestId(`kpi-${etiqueta}`).getByTestId("kpi-valor").innerText().then(Number);

test.describe("Fase 6 · municipio", () => {
  test("solo el municipio ve el panel", async ({ page }) => {
    await entrarComo(page, "rescatista");
    await page.goto("/municipio");
    await expect(page.getByText("Esta sección no es para tu rol")).toBeVisible();
  });

  test("indicadores, hexágonos, zonas prioritarias y métricas", async ({ page }) => {
    await entrarComo(page, "municipio");
    await page.goto("/municipio");

    await expect.poll(() => valorKpi(page, "En la calle")).toBeGreaterThan(0);
    const hexagonos = page.getByTestId("mapa-zonas").locator("path.leaflet-interactive");
    await expect.poll(() => hexagonos.count()).toBeGreaterThan(3);
    await expect(page.getByTestId("zonas-prioritarias").getByRole("listitem")).toHaveCount(5);
    await expect(page.getByText("Reportes por mes")).toBeVisible();
    await expect(page.getByText("Resultados por mes")).toBeVisible();

    // Cambiar tamaño de zona cambia la cantidad de hexágonos.
    const medianas = await hexagonos.count();
    await page.getByRole("button", { name: "Chicas" }).click();
    await expect.poll(() => hexagonos.count()).toBeGreaterThan(medianas);
    await page.getByRole("button", { name: "Medianas" }).click();

    await page.screenshot({ path: "test-results/municipio-movil.png", fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: "test-results/municipio-escritorio.png", fullPage: true });
  });

  test("el mapa de zonas se actualiza en vivo al reportar y al rescatar", async ({ page }) => {
    await entrarComo(page, "municipio");
    await page.goto("/municipio");
    await expect.poll(() => valorKpi(page, "En la calle")).toBeGreaterThan(0);
    const enCalle = await valorKpi(page, "En la calle");
    const hexagonos = page.getByTestId("mapa-zonas").locator("path.leaflet-interactive");
    const hexAntes = await hexagonos.count();
    await page.waitForTimeout(1500); // suscripción Realtime

    // Un animal nuevo en una zona sin reportes (Valle de San Ángel, al sur).
    const db = admin();
    const { data: animal } = await db
      .from("animals")
      .insert({ especie: "perro", apodo: "Zona E2E", lat: 25.6195, lng: -100.3605, total_avistamientos: 1 })
      .select("id")
      .single();
    creados.push(animal!.id);

    await expect.poll(() => valorKpi(page, "En la calle")).toBe(enCalle + 1);
    await expect.poll(() => hexagonos.count()).toBe(hexAntes + 1);

    // El rescatista lo marca como rescatado: sale de "en la calle" y su hexágono desaparece.
    await db.from("animals").update({ estado: "rescatado" }).eq("id", animal!.id);
    await expect.poll(() => valorKpi(page, "En la calle")).toBe(enCalle);
    await expect.poll(() => hexagonos.count()).toBe(hexAntes);
  });
});
