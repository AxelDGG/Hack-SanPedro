import { expect, test } from "@playwright/test";
import { animalIdDeExito, borrarAnimales, entrarComo, fotoDePrueba } from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

test.describe("Fase 2 · reportar", () => {
  test("sin sesión pide iniciar sesión", async ({ page }) => {
    await page.goto("/reportar");
    await expect(page.getByText("Inicia sesión para reportar un animal")).toBeVisible();
  });

  test("foto → IA prellena → publicar → +10 huellas", async ({ page, context }) => {
    // Lejos de otros reportes para que no haya sugerencias de duplicado.
    await context.setGeolocation({ latitude: 25.6449, longitude: -100.322 });
    await entrarComo(page, "vecino");
    await page.goto("/reportar");

    await page.getByTestId("foto-galeria").setInputFiles(await fotoDePrueba());
    await expect(page.getByText("La IA está analizando la foto…")).toBeVisible();
    await expect(page.getByTestId("ai-resultado")).toBeVisible();

    // La IA prellenó rasgos y marcó alguna condición.
    await expect(page.getByPlaceholder("Ej. café claro, orejas caídas, collar rojo")).not.toHaveValue("");
    await expect(page.getByText(/Tu ubicación actual/)).toBeVisible();

    await page.getByPlaceholder("¿Dónde exactamente?").fill("Prueba e2e");
    await page.getByTestId("publicar").click();

    await expect(page.getByTestId("reporte-exitoso")).toBeVisible();
    await expect(page.getByText("+10 huellas")).toBeVisible();
    creados.push(await animalIdDeExito(page));
  });
});
