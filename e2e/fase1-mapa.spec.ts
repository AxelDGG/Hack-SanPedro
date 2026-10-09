import { expect, test } from "@playwright/test";
import { admin, borrarAnimales } from "./helpers";

test.describe("Fase 1 · mapa", () => {
  test("muestra los animales, filtra por estado y abre la tarjeta", async ({ page }) => {
    await page.goto("/");
    const pines = page.locator(".cos-pin");
    await expect(pines.first()).toBeVisible();
    const total = await pines.count();
    expect(total).toBeGreaterThanOrEqual(50);

    // Ocultar "Adoptado" reduce los pines visibles.
    await page.getByRole("button", { name: "Adoptado" }).click();
    await expect.poll(() => pines.count()).toBeLessThan(total);
    await page.getByRole("button", { name: "Adoptado" }).click();

    // Capa de calor.
    await page.getByRole("button", { name: "Calor" }).click();
    await expect(page.locator("canvas.leaflet-heatmap-layer")).toBeVisible();
    await page.getByRole("button", { name: "Calor" }).click();

    // Tocar un pin abre la tarjeta con acciones.
    await pines.first().click({ force: true });
    await expect(page.getByRole("link", { name: "Ver ficha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lo vi también" })).toBeVisible();
  });

  test("un reporte nuevo aparece en vivo sin recargar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".cos-pin").first()).toBeVisible();
    const antes = await page.locator(".cos-pin").count();
    await page.waitForTimeout(1500); // deja que Realtime termine de suscribirse

    const db = admin();
    const { data } = await db
      .from("animals")
      .insert({ especie: "gato", lat: 25.6655, lng: -100.399, urgencia: 3, total_avistamientos: 1 })
      .select("id")
      .single();

    try {
      await expect(page.getByText(/Nuevo reporte: gato/)).toBeVisible();
      await expect(page.locator(".cos-pin--nuevo")).toHaveCount(1);
      await expect(page.locator(".cos-pin")).toHaveCount(antes + 1);
    } finally {
      await borrarAnimales([data!.id]);
    }
    await expect(page.locator(".cos-pin")).toHaveCount(antes);
  });
});
