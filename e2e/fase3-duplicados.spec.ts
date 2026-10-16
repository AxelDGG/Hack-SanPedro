import { expect, test } from "@playwright/test";
import { admin, animalIdDeExito, avanzarHastaPublicar, borrarAnimales, entrarComo, fotoDePrueba } from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

async function idDe(nombre: string) {
  const { data } = await admin().from("profiles").select("id").eq("nombre", nombre).single();
  return data!.id;
}

test.describe("Fase 3 · duplicados", () => {
  test("sugiere el animal cercano y permite confirmarlo (+5)", async ({ page, context }) => {
    // Un perro reportado hace poco por otra persona, en un punto aislado.
    const punto = { lat: 25.6251, lng: -100.3663 };
    const db = admin();
    const otro = await idDe("Gabriela Ochoa");
    const { data: animal } = await db
      .from("animals")
      .insert({ especie: "perro", apodo: "Duplicado E2E", color: "Café oscuro", lat: punto.lat, lng: punto.lng, reportado_por: otro, total_avistamientos: 1 })
      .select("id")
      .single();
    creados.push(animal!.id);
    await db.from("sightings").insert({ animal_id: animal!.id, user_id: otro, lat: punto.lat, lng: punto.lng });

    await context.setGeolocation({ latitude: punto.lat + 0.0005, longitude: punto.lng });
    await entrarComo(page, "vecino");
    await page.goto("/reportar?tipo=callejero");
    await page.getByTestId("foto-galeria").setInputFiles(await fotoDePrueba("perro-4"));
    await expect(page.getByTestId("ai-resultado")).toBeVisible();

    await page.getByTestId("siguiente").click(); // dónde
    await page.getByTestId("siguiente").click(); // ¿es alguno de estos?
    const sugerencias = page.getByTestId("duplicados");
    await expect(sugerencias).toBeVisible();
    await expect(sugerencias.getByRole("button", { name: /Duplicado E2E/ })).toContainText("Mismo color");
    await sugerencias.getByRole("button", { name: /Duplicado E2E/ }).click();

    // Elegido el existente, solo falta "¿cómo lo viste hoy?" y se confirma (sin contacto).
    await page.getByTestId("siguiente").click();
    await expect(page.getByRole("heading", { name: "¿Cómo lo viste hoy?" })).toBeVisible();
    await expect(page.getByTestId("publicar")).toHaveText(/Confirmar/);
    await page.getByTestId("publicar").click();

    await expect(page.getByText("¡Gracias por confirmar!")).toBeVisible();
    await expect(page.getByText("+5 huellas")).toBeVisible();
    expect(await animalIdDeExito(page)).toBe(animal!.id);

    const { count } = await db.from("sightings").select("*", { count: "exact", head: true }).eq("animal_id", animal!.id);
    expect(count).toBe(2);
  });

  test("la misma foto reenviada se reconoce aunque sea en otra colonia", async ({ browser }) => {
    test.setTimeout(90_000);
    const foto = await fotoDePrueba("gato-2");

    // Una vecina reporta el gato…
    const a = await browser.newContext({ ...test.info().project.use, geolocation: { latitude: 25.6405, longitude: -100.3240 } });
    const pa = await a.newPage();
    await entrarComo(pa, "vecino");
    await pa.goto("/reportar?tipo=callejero");
    await pa.getByTestId("foto-galeria").setInputFiles(foto);
    await expect(pa.getByTestId("ai-resultado")).toBeVisible();
    await avanzarHastaPublicar(pa);
    await pa.getByTestId("publicar").click();
    creados.push(await animalIdDeExito(pa));

    // …y alguien más reenvía la misma foto desde 2 km de distancia.
    const b = await browser.newContext({ ...test.info().project.use, geolocation: { latitude: 25.6573, longitude: -100.3480 } });
    const pb = await b.newPage();
    await entrarComo(pb, "rescatista");
    await pb.goto("/reportar?tipo=encontrado");
    await pb.getByTestId("foto-galeria").setInputFiles(foto);
    await expect(pb.getByTestId("ai-resultado")).toBeVisible();
    await pb.getByTestId("siguiente").click();
    await pb.getByTestId("siguiente").click();
    await expect(pb.getByTestId("duplicados")).toContainText("¡Es la misma foto!");

    await a.close();
    await b.close();
  });

  test("'Lo vi también' desde la ficha vincula sin foto", async ({ page }) => {
    const db = admin();
    const { data: animal } = await db
      .from("animals")
      .insert({ especie: "gato", apodo: "Confirmar E2E", lat: 25.6373, lng: -100.3657, total_avistamientos: 1 })
      .select("id")
      .single();
    creados.push(animal!.id);

    await entrarComo(page, "vecino");
    await page.goto(`/reportar?animal=${animal!.id}`);
    await expect(page.getByText("Lo vi también")).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Le tomaste una foto hoy?" })).toBeVisible();
    await avanzarHastaPublicar(page);
    await page.getByTestId("publicar").click();
    await expect(page.getByText("¡Gracias por confirmar!")).toBeVisible();
  });

  test("un rescatista une dos reportes del mismo animal", async ({ page }) => {
    const db = admin();
    const otro = await idDe("Lucía Benavides");
    const base = { especie: "perro" as const, color: "Negro", tamano: "grande" as const, reportado_por: otro, total_avistamientos: 1 };
    const { data: duplicados } = await db
      .from("animals")
      .insert([
        { ...base, apodo: "Original E2E", lat: 25.6301, lng: -100.3801 },
        { ...base, apodo: "Copia E2E", lat: 25.6303, lng: -100.3802 },
      ])
      .select("id, apodo");
    const original = duplicados!.find((d) => d.apodo === "Original E2E")!.id;
    const copia = duplicados!.find((d) => d.apodo === "Copia E2E")!.id;
    creados.push(original, copia);
    await db.from("sightings").insert([
      { animal_id: original, user_id: otro, lat: 25.6301, lng: -100.3801 },
      { animal_id: copia, user_id: otro, lat: 25.6303, lng: -100.3802 },
    ]);

    await entrarComo(page, "rescatista");
    await page.goto(`/animal/${copia}`);
    await page.getByTestId("buscar-duplicado").click();
    await page.getByTestId("candidato-union").filter({ hasText: "Original E2E" }).getByRole("button", { name: "Unir" }).click();
    await expect(page).toHaveURL(new RegExp(`/animal/${original}`));

    const { data: c } = await db.from("animals").select("fusionado_en").eq("id", copia).single();
    expect(c!.fusionado_en).toBe(original);
    const { count } = await db.from("sightings").select("*", { count: "exact", head: true }).eq("animal_id", original);
    expect(count).toBe(2);

    // El link viejo manda al reporte que quedó.
    await page.goto(`/animal/${copia}`);
    await expect(page.getByTestId("ir-fusionado")).toHaveAttribute("href", `/animal/${original}`);
  });
});
