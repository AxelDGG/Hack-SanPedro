import { expect, test } from "@playwright/test";
import {
  admin,
  animalIdDeExito,
  avanzarHastaPublicar,
  borrarAnimales,
  entrarComo,
  fotoDePrueba,
  invitadosHabilitados,
} from "./helpers";

const creados: string[] = [];
test.afterAll(() => borrarAnimales(creados));

test.describe("Fase 2 · reportar", () => {
  test("inicio con tres botones grandes y links cortos para los grupos", async ({ page }) => {
    await page.goto("/");
    for (const t of ["perdido", "encontrado", "callejero"]) await expect(page.getByTestId(`tipo-${t}`)).toBeVisible();

    await page.goto("/r/vi?de=wa");
    await expect(page).toHaveURL(/\/reportar\?tipo=encontrado&origen=whatsapp/);
  });

  test("sin cuenta: entra como invitado (o pide sesión si el proyecto no lo permite)", async ({ page }) => {
    await page.goto("/r/callejero");
    if (await invitadosHabilitados()) {
      await expect(page.getByTestId("asistente")).toBeVisible();
      await expect(page.getByText("Toma una foto del animal")).toBeVisible();
    } else {
      await expect(page.getByText("Inicia sesión para reportar")).toBeVisible();
    }
  });

  test("callejero: foto → la IA describe → un toque → publicar (+10)", async ({ page, context }) => {
    // Lejos de otros reportes para que no haya sugerencias de duplicado.
    await context.setGeolocation({ latitude: 25.6449, longitude: -100.322 });
    await entrarComo(page, "vecino");
    await page.goto("/reportar?tipo=callejero");

    await page.getByTestId("foto-galeria").setInputFiles(await fotoDePrueba("perro-4"));
    await expect(page.getByText("La IA está analizando la foto…")).toBeVisible();
    // El modo simulado reconoce las ilustraciones demo por su huella.
    await expect(page.getByTestId("ai-resultado")).toContainText("La IA detectó: Perro");

    await avanzarHastaPublicar(page);
    await expect(page.getByTestId("resumen-datos")).toContainText("Café oscuro");
    await page.getByTestId("publicar").click();

    await expect(page.getByTestId("reporte-exitoso")).toBeVisible();
    await expect(page.getByText("+10 huellas")).toBeVisible();
    await expect(page.getByTestId("compartir-whatsapp")).toHaveAttribute("href", /api\.whatsapp\.com\/send\?text=/);
    const id = await animalIdDeExito(page);
    creados.push(id);

    const { data } = await admin().from("animals").select("tipo, raza, color, tamano").eq("id", id).single();
    expect(data).toMatchObject({ tipo: "callejero", color: "Café oscuro", tamano: "mediano" });
  });

  test("mascota perdida desde un mensaje de WhatsApp: se llena sola", async ({ page }) => {
    await entrarComo(page, "vecino");
    await page.goto("/reportar?pegar=1");
    await page
      .getByTestId("texto-publicacion")
      .fill(
        "SE BUSCA 🙏 Se nos perdió Rocky, schnauzer gris con collar rojo, ayer en la tarde por la colonia Del Valle. Es muy miedoso. Informes con Laura al 81 0000 0456",
      );
    await page.getByTestId("leer-publicacion").click();

    const leido = page.getByTestId("leido-publicacion");
    await expect(leido).toContainText("Rocky");
    await expect(leido).toContainText("Schnauzer");
    await expect(leido).toContainText("Del Valle");
    await expect(leido).toContainText("8100000456");

    // Sin foto: Seguir sin foto → datos → dónde → (parecidos) → contacto.
    await expect(page.getByTestId("siguiente")).toHaveText(/Seguir sin foto/);
    await page.getByTestId("siguiente").click();
    await expect(page.getByTestId("nombre-mascota")).toHaveValue("Rocky");
    await avanzarHastaPublicar(page);
    await expect(page.getByTestId("contacto-telefono")).toHaveValue("8100000456");
    await page.getByTestId("publicar").click();

    await expect(page.getByTestId("reporte-exitoso")).toBeVisible();
    const id = await animalIdDeExito(page);
    creados.push(id);
    const db = admin();
    const { data } = await db.from("animals").select("tipo, apodo, raza, origen, perdido_desde, colonias(nombre)").eq("id", id).single();
    expect(data).toMatchObject({ tipo: "perdido", apodo: "Rocky", raza: "Schnauzer", origen: "whatsapp" });
    expect(data!.colonias?.nombre).toBe("Del Valle");
    expect(data!.perdido_desde).not.toBeNull();
    const { data: contacto } = await db.from("animal_contactos").select("nombre, telefono").eq("animal_id", id).single();
    expect(contacto).toEqual({ nombre: "Laura", telefono: "8100000456" });
  });
});
