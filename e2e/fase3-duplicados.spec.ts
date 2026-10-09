import { expect, test } from "@playwright/test";
import { admin, animalIdDeExito, borrarAnimales, entrarComo, fotoDePrueba } from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

test.describe("Fase 3 · duplicados", () => {
  test("sugiere el animal cercano y permite confirmarlo (+5)", async ({ page, context }) => {
    // Un perro reportado hace poco por otra persona, en un punto aislado.
    const punto = { lat: 25.6251, lng: -100.3663 };
    const db = admin();
    const { data: otro } = await db.from("profiles").select("id").eq("nombre", "Gabriela Ochoa").single();
    const { data: animal } = await db
      .from("animals")
      .insert({
        especie: "perro",
        apodo: "Duplicado E2E",
        lat: punto.lat,
        lng: punto.lng,
        reportado_por: otro!.id,
        total_avistamientos: 1,
      })
      .select("id")
      .single();
    creados.push(animal!.id);
    await db.from("sightings").insert({ animal_id: animal!.id, user_id: otro!.id, lat: punto.lat, lng: punto.lng });

    await context.setGeolocation({ latitude: punto.lat + 0.0005, longitude: punto.lng });
    await entrarComo(page, "vecino");
    await page.goto("/reportar");
    await page.getByTestId("foto-galeria").setInputFiles(await fotoDePrueba("perro-4"));

    const sugerencias = page.getByTestId("duplicados");
    await expect(sugerencias).toBeVisible();
    await sugerencias.getByRole("button", { name: /Duplicado E2E/ }).click();

    await expect(page.getByTestId("publicar")).toHaveText(/Confirmar avistamiento/);
    await page.getByTestId("publicar").click();

    await expect(page.getByText("¡Gracias por confirmar!")).toBeVisible();
    await expect(page.getByText("+5 huellas")).toBeVisible();
    expect(await animalIdDeExito(page)).toBe(animal!.id);

    const { count } = await db.from("sightings").select("*", { count: "exact", head: true }).eq("animal_id", animal!.id);
    expect(count).toBe(2);
  });

  test("'Lo vi también' desde el mapa vincula sin foto", async ({ page }) => {
    const db = admin();
    const { data: animal } = await db
      .from("animals")
      .insert({ especie: "gato", apodo: "Confirmar E2E", lat: 25.6373, lng: -100.3657, total_avistamientos: 1 })
      .select("id")
      .single();
    creados.push(animal!.id);

    await entrarComo(page, "vecino");
    await page.goto(`/reportar?animal=${animal!.id}`);
    await expect(page.getByRole("heading", { name: "Lo vi también" })).toBeVisible();
    await expect(page.getByText("Vas a confirmar a Confirmar E2E", { exact: false })).toBeVisible();
    await page.getByTestId("publicar").click();
    await expect(page.getByText("¡Gracias por confirmar!")).toBeVisible();
  });
});
