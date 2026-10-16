import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "../src/types/database.types";
import type { Rol } from "../src/lib/constants";

const ETIQUETA_DEMO: Record<Rol, string> = { vecino: "Vecina", rescatista: "Rescatista", municipio: "Municipio" };

/** Entra con el botón de modo demo del rol indicado. */
export async function entrarComo(page: Page, rol: Rol) {
  await page.goto("/login");
  await page.getByRole("button", { name: ETIQUETA_DEMO[rol], exact: true }).click();
  await page.waitForURL("/");
}

/** JPEG generado a partir de una ilustración placeholder (como si fuera una foto del celular). */
export async function fotoDePrueba(nombre = "perro-4") {
  const buffer = await sharp(`public/placeholders/${nombre}.svg`).resize(1600, 1200).jpeg({ quality: 90 }).toBuffer();
  return { name: `${nombre}.jpg`, mimeType: "image/jpeg", buffer };
}

/** Cliente con secret key para preparar y limpiar datos de prueba. */
export function admin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

/** Borra animales creados por las pruebas, sus huellas (para no inflar puntos) y sus fotos en Storage. */
export async function borrarAnimales(ids: string[]) {
  if (ids.length === 0) return;
  const db = admin();
  const { data: avistamientos } = await db.from("sightings").select("foto_url").in("animal_id", ids);
  const rutas = (avistamientos ?? [])
    .map((s) => s.foto_url?.split("/storage/v1/object/public/fotos/")[1])
    .filter((r): r is string => !!r);
  if (rutas.length > 0) await db.storage.from("fotos").remove(rutas);
  await db.from("point_events").delete().in("animal_id", ids);
  await db.from("animals").delete().in("id", ids);
}

/**
 * Avanza el asistente con "Siguiente" hasta que el botón de abajo diga Publicar/Confirmar
 * (sin tocarlo). Devuelve los títulos de los pasos por los que pasó.
 */
export async function avanzarHastaPublicar(page: Page, maxPasos = 8) {
  const titulos: string[] = [];
  for (let i = 0; i < maxPasos; i++) {
    await page.waitForTimeout(450); // transición entre pasos
    titulos.push((await page.getByRole("heading", { level: 2 }).first().textContent()) ?? "");
    if (await page.getByTestId("publicar").isVisible()) return titulos;
    await page.getByTestId("siguiente").click();
  }
  throw new Error(`El asistente no llegó a Publicar. Pasos: ${titulos.join(" → ")}`);
}

/** ¿El proyecto de Supabase permite sesiones anónimas (reportar sin cuenta)? */
export async function invitadosHabilitados() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
  });
  const json = await res.json();
  return json?.external?.anonymous_users === true;
}

/** Id del animal desde el enlace "Ver ficha" de la pantalla de éxito. */
export async function animalIdDeExito(page: Page) {
  const href = await page.getByRole("link", { name: "Ver ficha" }).getAttribute("href");
  expect(href).toMatch(/^\/animal\//);
  return href!.split("/").pop()!;
}
