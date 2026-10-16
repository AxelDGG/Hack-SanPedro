import { expect, test, type Browser } from "@playwright/test";
import { animalIdDeExito, avanzarHastaPublicar, borrarAnimales, entrarComo, fotoDePrueba } from "./helpers";

/**
 * Criterio de éxito de la demo, de punta a punta y con varios dispositivos:
 * la vecina toma foto de un perro → la IA lo clasifica → aparece en vivo en el mapa de
 * otra pantalla → el rescatista lo marca como rescatado → el mapa de zonas del municipio
 * se actualiza y la vecina recibe sus huellas.
 */
const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

async function nuevaPantalla(browser: Browser, geo?: { latitude: number; longitude: number }) {
  const contexto = await browser.newContext({ ...test.info().project.use, ...(geo ? { geolocation: geo } : {}) });
  return { contexto, page: await contexto.newPage() };
}

test("criterio de éxito: reporte con IA → mapa en vivo → rescate → municipio actualizado", async ({ browser }) => {
  test.setTimeout(120_000);
  // Una zona sin reportes (sur de Valle de San Ángel) para que el cambio sea inequívoco.
  const lugar = { latitude: 25.6185, longitude: -100.3615 };

  const mapa = await nuevaPantalla(browser);
  await mapa.page.goto("/mapa");
  await expect(mapa.page.locator(".cos-pin").first()).toBeVisible();

  const municipio = await nuevaPantalla(browser);
  await entrarComo(municipio.page, "municipio");
  await municipio.page.goto("/municipio");
  const enCalle = () => municipio.page.getByTestId("kpi-En la calle").getByTestId("kpi-valor").innerText().then(Number);
  await expect.poll(enCalle).toBeGreaterThan(0);
  const antes = await enCalle();

  // 1. La vecina reporta desde su celular.
  const vecina = await nuevaPantalla(browser, lugar);
  await entrarComo(vecina.page, "vecino");
  await vecina.page.getByTestId("tipo-callejero").click();
  await vecina.page.getByTestId("foto-camara").setInputFiles(await fotoDePrueba("perro-1"));
  await expect(vecina.page.getByTestId("ai-resultado")).toContainText("La IA detectó: Perro");
  await avanzarHastaPublicar(vecina.page);
  await vecina.page.getByTestId("publicar").click();
  await expect(vecina.page.getByTestId("reporte-exitoso")).toBeVisible();
  const animalId = await animalIdDeExito(vecina.page);
  creados.push(animalId);
  await vecina.page.goto("/");

  // 2. Aparece en vivo en el mapa de otra pantalla y en el panel del municipio.
  await expect(mapa.page.getByText(/Nuevo reporte: perro/)).toBeVisible();
  await expect.poll(enCalle).toBe(antes + 1);

  // 3. El rescatista lo marca como rescatado.
  const rescatista = await nuevaPantalla(browser);
  await entrarComo(rescatista.page, "rescatista");
  await rescatista.page.goto(`/animal/${animalId}`);
  await rescatista.page.getByTestId("acciones-rescate").getByRole("button", { name: "Cambiar estado" }).click();
  await rescatista.page.getByRole("radio", { name: /Rescatado/ }).click();
  await rescatista.page.getByTestId("guardar-estado").click();
  await expect(rescatista.page.getByLabel("Estado actual: Rescatado")).toBeVisible();

  // 4. El mapa de zonas del municipio se actualiza y la vecina recibe +20 huellas.
  await expect.poll(enCalle).toBe(antes);
  await expect(vecina.page.getByTestId("aviso-huellas")).toContainText("+20 huellas");
  await municipio.page.screenshot({ path: "test-results/criterio-municipio.png" });

  for (const p of [mapa, municipio, vecina, rescatista]) await p.contexto.close();
});
