import { expect, test } from "@playwright/test";
import { admin, borrarAnimales } from "./helpers";

test.describe("Fase 1 · mapa", () => {
  test("muestra los casos abiertos, filtra por tipo y abre la tarjeta", async ({ page }) => {
    await page.goto("/mapa");
    const pines = page.locator(".cos-pin");
    await expect(pines.first()).toBeVisible();
    const abiertos = await pines.count();
    expect(abiertos).toBeGreaterThanOrEqual(35);

    // Los casos resueltos (rescatados, en casa…) se muestran aparte.
    await page.getByRole("button", { name: "Resueltos" }).click();
    await expect.poll(() => pines.count()).toBeGreaterThan(abiertos);
    await page.getByRole("button", { name: "Resueltos" }).click();

    // Ocultar los callejeros deja solo mascotas perdidas y encontradas.
    await page.getByTestId("filtro-callejero").click();
    await expect.poll(() => pines.count()).toBeLessThan(abiertos);
    await page.getByTestId("filtro-callejero").click();

    // Capa de calor.
    await page.getByRole("button", { name: "Calor" }).click();
    await expect(page.locator("canvas.leaflet-heatmap-layer")).toBeVisible();
    await page.getByRole("button", { name: "Calor" }).click();

    // Tocar un pin abre la tarjeta con acciones.
    // Un pin que quede dentro de la pantalla (algunos caen en el borde del mapa).
    const vista = page.viewportSize()!;
    for (const pin of await pines.all()) {
      const caja = await pin.boundingBox();
      if (caja && caja.y > 160 && caja.y + caja.height < vista.height - 120 && caja.x > 10 && caja.x + caja.width < vista.width - 10) {
        await pin.click({ force: true });
        break;
      }
    }
    await expect(page.getByRole("link", { name: "Ver ficha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lo vi también" })).toBeVisible();
  });

  test("un reporte nuevo aparece en vivo sin recargar", async ({ page }) => {
    await page.goto("/mapa");
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
