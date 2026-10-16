/**
 * Registro municipal de mascotas — SIMULACIÓN.
 * No es un servicio oficial del municipio de San Pedro Garza García.
 *
 * Punto de entrada para Vercel (exporta la app de Hono por defecto).
 * En local: `npm run dev` (src/local.ts) sirve en http://localhost:4000.
 */
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { buscarCoincidencias, normalizar, type Consulta } from "./coincidencias.js";
import {
  aPublica,
  avisos,
  buscarPorFolio,
  buscarPorMicrochip,
  cambiarEstatus,
  colonias,
  coloniaPorClave,
  extravios,
  fotos,
  mascotas,
} from "./datos.js";
import { paginaDocumentacion } from "./documentacion.js";
import { especificacionOpenApi } from "./openapi.js";
import type { AvisoPropietario, Especie, Sexo, Tamano } from "./tipos.js";

export const CLAVE_DEMO = "demo-callejeros-2026";
const VERSION = "1.0.0";
const RUTAS_PUBLICAS = [/^\/$/, /^\/openapi\.json$/, /^\/salud$/, /^\/fotos\//, /^\/favicon\.ico$/];

const claveApi = () => process.env.REGISTRO_API_KEY || CLAVE_DEMO;
const usaClaveDemo = () => !process.env.REGISTRO_API_KEY;
/** En un deploy (Vercel) la clave de demo no sirve: hay que configurar REGISTRO_API_KEY. */
const desplegadoSinClave = () => !!process.env.VERCEL && usaClaveDemo();

/** Compara la clave en tiempo constante (no revela cuántos caracteres coinciden). */
function claveValida(recibida: string) {
  const a = createHash("sha256").update(recibida).digest();
  const b = createHash("sha256").update(claveApi()).digest();
  return timingSafeEqual(a, b);
}

/** Orígenes de navegador autorizados (CORS), separados por coma. Sin lista, solo el propio dominio. */
const origenesPermitidos = () =>
  (process.env.CORS_ORIGENES ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Límite de peticiones por IP en memoria (por instancia): freno básico contra abuso. El límite
 * global lo pone el firewall de Vercel; la app principal además limita por usuario.
 */
const LIMITE_POR_MINUTO = 120;
const ventanas = new Map<string, { inicio: number; conteo: number }>();
function excedeLimite(ip: string) {
  const ahora = Date.now();
  const v = ventanas.get(ip);
  if (!v || ahora - v.inicio > 60_000) {
    ventanas.set(ip, { inicio: ahora, conteo: 1 });
    if (ventanas.size > 10_000) ventanas.clear();
    return false;
  }
  v.conteo++;
  return v.conteo > LIMITE_POR_MINUTO;
}

/** Origen público de la petición (respeta los encabezados del proxy de Vercel). */
function origen(c: Context) {
  const url = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.replace(":", "");
  const host = c.req.header("x-forwarded-host")?.split(",")[0].trim() || c.req.header("host") || url.host;
  return `${proto}://${host}`;
}

class ErrorPeticion extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 = 400,
  ) {
    super(message);
  }
}

async function leerJson(c: Context): Promise<Record<string, unknown>> {
  let cuerpo: unknown;
  try {
    cuerpo = await c.req.json();
  } catch {
    throw new ErrorPeticion("El cuerpo debe ser JSON válido (Content-Type: application/json).");
  }
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw new ErrorPeticion("El cuerpo debe ser un objeto JSON.");
  }
  return cuerpo as Record<string, unknown>;
}

function texto(v: unknown, campo: string, { requerido = false, max = 200 } = {}): string | undefined {
  if (v == null || v === "") {
    if (requerido) throw new ErrorPeticion(`Falta el campo "${campo}".`);
    return undefined;
  }
  if (typeof v !== "string") throw new ErrorPeticion(`"${campo}" debe ser texto.`);
  const t = v.trim();
  if (requerido && !t) throw new ErrorPeticion(`Falta el campo "${campo}".`);
  if (t.length > max) throw new ErrorPeticion(`"${campo}" admite máximo ${max} caracteres.`);
  return t || undefined;
}

function numero(v: unknown, campo: string, { requerido = false, min = -Infinity, max = Infinity } = {}) {
  if (v == null || v === "") {
    if (requerido) throw new ErrorPeticion(`Falta el campo "${campo}".`);
    return undefined;
  }
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new ErrorPeticion(`"${campo}" debe ser numérico.`);
  if (n < min || n > max) throw new ErrorPeticion(`"${campo}" debe estar entre ${min} y ${max}.`);
  return n;
}

function opcion<T extends string>(v: unknown, campo: string, valores: readonly T[], requerido = false): T | undefined {
  if (v == null || v === "") {
    if (requerido) throw new ErrorPeticion(`Falta el campo "${campo}" (${valores.join(" | ")}).`);
    return undefined;
  }
  if (typeof v !== "string" || !valores.includes(v as T)) {
    throw new ErrorPeticion(`"${campo}" debe ser uno de: ${valores.join(", ")}.`);
  }
  return v as T;
}

const ESPECIES = ["perro", "gato"] as const satisfies readonly Especie[];
const TAMANOS = ["chico", "mediano", "grande"] as const satisfies readonly Tamano[];
const SEXOS = ["macho", "hembra"] as const satisfies readonly Sexo[];

const app = new Hono();

// --- Middleware: seguridad, CORS restringido, marca de simulación y autenticación por clave
app.use(
  "*",
  secureHeaders({
    // Las fotos se muestran dentro de la app principal (otro dominio).
    crossOriginResourcePolicy: "cross-origin",
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  "*",
  cors({
    // Es una API de servidor a servidor: el navegador solo entra desde los orígenes autorizados.
    origin: (o) => (origenesPermitidos().includes(o) ? o : null),
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Api-Key"],
    exposeHeaders: ["X-Simulacion"],
    maxAge: 86400,
  }),
);
app.use("/v1/*", bodyLimit({ maxSize: 16 * 1024, onError: (c) => c.json({ error: "El cuerpo es demasiado grande." }, 413) }));
app.use("/v1/*", async (c, next) => {
  const ip = c.req.header("x-vercel-forwarded-for") ?? c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (excedeLimite(ip)) return c.json({ error: "Demasiadas peticiones. Intenta en un minuto." }, 429);
  return next();
});

app.use("*", async (c, next) => {
  c.header("X-Simulacion", "true");
  await next();
  try {
    c.res.headers.set("X-Simulacion", "true");
  } catch {
    // encabezados inmutables: ya se fijaron antes de next()
  }
});

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS" || RUTAS_PUBLICAS.some((r) => r.test(c.req.path))) return next();
  if (desplegadoSinClave()) return c.json({ error: "Servicio sin configurar: falta REGISTRO_API_KEY." }, 503);
  const clave = c.req.header("x-api-key");
  if (!clave) return c.json({ error: "Falta el encabezado X-Api-Key." }, 401);
  if (!claveValida(clave)) return c.json({ error: "X-Api-Key inválida." }, 401);
  return next();
});

// --- Públicas
app.get("/", (c) => c.html(paginaDocumentacion({ origen: origen(c), claveDemo: usaClaveDemo() ? CLAVE_DEMO : null })));

app.get("/openapi.json", (c) => c.json(especificacionOpenApi(origen(c))));

app.get("/salud", (c) =>
  c.json({ ok: true, servicio: "registro-municipal-mascotas", version: VERSION, simulacion: true }),
);

app.get("/fotos/:archivo", (c) => {
  const svg = fotos[c.req.param("archivo")];
  if (!svg) return c.json({ error: "Foto no encontrada." }, 404);
  c.header("Content-Type", "image/svg+xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=86400, immutable");
  return c.body(svg);
});

// --- Catálogos
app.get("/v1/colonias", (c) => c.json({ data: colonias, total: colonias.length }));

app.get("/v1/mascotas", (c) => {
  const especie = opcion(c.req.query("especie"), "especie", ESPECIES);
  const colonia = texto(c.req.query("colonia"), "colonia", { max: 20 });
  const q = texto(c.req.query("q"), "q", { max: 100 });
  const limit = numero(c.req.query("limit"), "limit", { min: 1, max: 100 }) ?? 20;
  const offset = numero(c.req.query("offset"), "offset", { min: 0 }) ?? 0;
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) throw new ErrorPeticion('"limit" y "offset" deben ser enteros.');
  if (colonia && !coloniaPorClave.has(colonia)) throw new ErrorPeticion(`No existe la colonia "${colonia}".`);

  const busqueda = q ? normalizar(q) : null;
  const filtradas = mascotas.filter((m) => {
    if (especie && m.especie !== especie) return false;
    if (colonia && m.colonia.clave !== colonia) return false;
    if (busqueda) {
      const pajar = normalizar(`${m.nombre} ${m.raza} ${m.color} ${m.folio}`);
      if (!busqueda.split(" ").every((palabra) => pajar.includes(palabra))) return false;
    }
    return true;
  });
  const o = origen(c);
  return c.json({ data: filtradas.slice(offset, offset + limit).map((m) => aPublica(m, o)), total: filtradas.length });
});

app.get("/v1/mascotas/microchip/:numero", (c) => {
  const m = buscarPorMicrochip(c.req.param("numero"));
  if (!m) return c.json({ error: "No hay ninguna mascota registrada con ese microchip." }, 404);
  return c.json(aPublica(m, origen(c)));
});

app.get("/v1/mascotas/:folio", (c) => {
  const m = buscarPorFolio(c.req.param("folio"));
  if (!m) return c.json({ error: "No existe una mascota con ese folio." }, 404);
  return c.json(aPublica(m, origen(c)));
});

app.post("/v1/mascotas/coincidencias", async (c) => {
  const b = await leerJson(c);
  const consulta: Consulta = {
    especie: opcion(b.especie, "especie", ESPECIES, true)!,
    raza: texto(b.raza, "raza", { max: 80 }),
    color: texto(b.color, "color", { max: 120 }),
    tamano: opcion(b.tamano, "tamano", TAMANOS),
    sexo: opcion(b.sexo, "sexo", SEXOS),
    lat: numero(b.lat, "lat", { min: -90, max: 90 }),
    lng: numero(b.lng, "lng", { min: -180, max: 180 }),
    colonia: texto(b.colonia, "colonia", { max: 20 }),
    limite: numero(b.limite, "limite", { min: 1, max: 50 }) ?? 5,
  };
  if ((consulta.lat == null) !== (consulta.lng == null)) throw new ErrorPeticion('Envía "lat" y "lng" juntos.');
  if (consulta.colonia && !coloniaPorClave.has(consulta.colonia)) {
    throw new ErrorPeticion(`No existe la colonia "${consulta.colonia}".`);
  }
  if (!consulta.raza && !consulta.color && !consulta.tamano && !consulta.sexo && consulta.lat == null && !consulta.colonia) {
    throw new ErrorPeticion("Incluye al menos un criterio además de la especie (raza, color, tamano, sexo, lat/lng o colonia).");
  }
  consulta.limite = Math.floor(consulta.limite!);
  const o = origen(c);
  const data = buscarCoincidencias(consulta, mascotas).map((r) => ({
    mascota: aPublica(r.mascota, o),
    puntaje: r.puntaje,
    motivos: r.motivos,
  }));
  return c.json({ data });
});

// --- Avisos al propietario (SMS simulado)
app.post("/v1/avisos-propietario", async (c) => {
  const b = await leerJson(c);
  const folio = texto(b.folio, "folio", { requerido: true, max: 40 })!;
  const mensaje = texto(b.mensaje, "mensaje", { requerido: true, max: 480 })!;
  const referencia = texto(b.referencia_externa, "referencia_externa", { max: 500 }) ?? null;
  const m = buscarPorFolio(folio);
  if (!m) throw new ErrorPeticion("No existe una mascota con ese folio.", 404);
  const aviso: AvisoPropietario = {
    id: randomUUID(),
    folio: m.folio,
    canal: "sms",
    estatus: "enviado",
    simulacion: true,
    enviado_at: new Date().toISOString(),
    mensaje,
    referencia_externa: referencia,
  };
  avisos.unshift(aviso);
  const { id, canal, estatus, simulacion, enviado_at } = aviso;
  return c.json({ id, folio: m.folio, canal, estatus, simulacion, enviado_at }, 202);
});

app.get("/v1/avisos-propietario", (c) => c.json({ data: avisos, total: avisos.length }));

// --- Extravíos
app.post("/v1/extravios", async (c) => {
  const b = await leerJson(c);
  const folio = texto(b.folio, "folio", { requerido: true, max: 40 })!;
  const lat = numero(b.lat, "lat", { requerido: true, min: -90, max: 90 })!;
  const lng = numero(b.lng, "lng", { requerido: true, min: -180, max: 180 })!;
  const fecha = texto(b.fecha, "fecha", { requerido: true, max: 40 })!;
  if (Number.isNaN(Date.parse(fecha))) throw new ErrorPeticion('"fecha" debe ser una fecha ISO 8601.');
  const referencia = texto(b.referencia_externa, "referencia_externa", { max: 500 }) ?? null;
  const m = buscarPorFolio(folio);
  if (!m) throw new ErrorPeticion("No existe una mascota con ese folio.", 404);
  const id = randomUUID();
  extravios.set(m.folio, {
    id,
    folio: m.folio,
    estatus: "registrado",
    lat,
    lng,
    fecha: new Date(fecha).toISOString(),
    referencia_externa: referencia,
    registrado_at: new Date().toISOString(),
  });
  cambiarEstatus(m.folio, "extraviado");
  return c.json({ id, folio: m.folio, estatus: "registrado" }, 201);
});

app.delete("/v1/extravios/:folio", (c) => {
  const m = buscarPorFolio(c.req.param("folio"));
  if (!m) return c.json({ error: "No existe una mascota con ese folio." }, 404);
  extravios.delete(m.folio);
  cambiarEstatus(m.folio, "activo");
  return c.json({ folio: m.folio, estatus: "activo" });
});

// --- Errores
app.notFound((c) => c.json({ error: `Ruta no encontrada: ${c.req.method} ${c.req.path}` }, 404));

app.onError((err, c) => {
  if (err instanceof ErrorPeticion) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Error interno de la simulación." }, 500);
});

export default app;
