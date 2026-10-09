import { expect, test } from "@playwright/test";
import { admin, entrarComo } from "./helpers";

test.describe("Fase 7 · gamificación", () => {
  test("perfil con huellas, insignias, actividad y colonia editable", async ({ page }) => {
    await entrarComo(page, "vecino");
    await page.goto("/perfil");

    await expect(page.getByTestId("huellas")).not.toHaveText("0");
    const insignias = page.getByTestId("insignias").getByRole("listitem");
    await expect(insignias).toHaveCount(7);
    await expect(page.getByTestId("insignias").getByLabel(/obtenida/).first()).toBeVisible();
    await expect(page.getByText("Actividad reciente")).toBeVisible();

    // Cambiar de colonia y volver a la original.
    const selector = page.getByTestId("colonia");
    const original = await selector.inputValue();
    await selector.selectOption({ label: "Del Valle" });
    await page.reload();
    await expect(page.getByTestId("colonia").locator("option:checked")).toHaveText("Del Valle");
    await page.getByTestId("colonia").selectOption(original);
    await page.screenshot({ path: "test-results/perfil.png", fullPage: true });
  });

  test("Mi Manada muestra los animales ayudados", async ({ page }) => {
    await entrarComo(page, "vecino");
    await page.goto("/manada");
    await expect(page.getByTestId("manada-resumen")).toHaveText(/\d+ de \d+ a salvo/);
    await expect(page.getByTestId("manada").getByRole("listitem").first()).toBeVisible();
    await page.getByRole("tab", { name: "A salvo" }).click();
    await expect(page.getByTestId("manada").getByText("A salvo").first()).toBeVisible();
    await page.screenshot({ path: "test-results/manada.png", fullPage: true });
  });

  test("ranking de vecinos (con filtro por colonia) y de colonias", async ({ page }) => {
    await entrarComo(page, "vecino");
    await page.goto("/ranking");
    const vecinos = page.getByTestId("ranking-vecinos").getByRole("listitem");
    await expect(vecinos.first()).toBeVisible();
    await expect(page.getByTestId("ranking-vecinos").locator('[aria-current="true"]')).toContainText("Vecina Demo");

    await page.getByTestId("filtro-colonia").selectOption({ label: "Casco Urbano" });
    await expect(vecinos.first()).toContainText("Casco Urbano");

    await page.getByRole("tab", { name: "Colonias" }).click();
    await expect(page.getByTestId("ranking-colonias").getByRole("listitem").first()).toBeVisible();
    await page.screenshot({ path: "test-results/ranking.png", fullPage: true });
  });

  test("la vecina recibe un aviso en vivo cuando su caso se resuelve", async ({ page, browser }) => {
    const db = admin();
    const { data: vecina } = await db.from("profiles").select("id").eq("nombre", "Vecina Demo").single();
    const punto = { lat: 25.6587, lng: -100.3699 };
    const { data: animal } = await db
      .from("animals")
      .insert({ especie: "gato", apodo: "Aviso E2E", ...punto, reportado_por: vecina!.id, total_avistamientos: 1 })
      .select("id")
      .single();
    await db.from("sightings").insert({ animal_id: animal!.id, user_id: vecina!.id, ...punto });

    try {
      await entrarComo(page, "vecino");
      await page.waitForTimeout(1500); // suscripción Realtime de avisos

      // El rescatista, en otro dispositivo, lo marca como rescatado.
      const rescatista = await browser.newContext({ ...test.info().project.use });
      const pagina2 = await rescatista.newPage();
      await entrarComo(pagina2, "rescatista");
      await pagina2.goto(`/animal/${animal!.id}`);
      await pagina2.getByTestId("acciones-rescate").getByRole("button", { name: "Cambiar estado" }).click();
      await pagina2.getByRole("radio", { name: /Rescatado/ }).click();
      await pagina2.getByTestId("guardar-estado").click();
      await rescatista.close();

      const aviso = page.getByTestId("aviso-huellas").filter({ hasText: "Aviso E2E" });
      await expect(aviso).toBeVisible();
      await expect(aviso).toContainText("+20 huellas");
    } finally {
      await db.from("point_events").delete().eq("animal_id", animal!.id);
      await db.from("animals").delete().eq("id", animal!.id);
    }
  });
});
