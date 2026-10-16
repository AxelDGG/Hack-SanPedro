/**
 * Investiga el catálogo de colonias de San Pedro Garza García y escribe
 * data/fuentes/colonias-base.json (nombre, centro, código postal, distrito).
 *
 *   npm run investigar-colonias
 *
 * Este script SÍ usa la red (a diferencia de generar-datos.ts, que es 100 %
 * determinista y sólo lee el archivo que produce éste). Fuentes:
 *
 * 1. Plan de Desarrollo Urbano Municipal San Pedro Garza García 2024,
 *    capítulo "Diagnóstico y pronóstico" (aplicativos.sanpedro.gob.mx). Lista
 *    numerada de colonias por distrito (transcrita abajo, sin las "Zonas").
 * 2. Catálogo Nacional de Códigos Postales de Correos de México (SEPOMEX),
 *    asentamientos del municipio "San Pedro Garza García" (código postal y
 *    fraccionamientos recientes que el plan no lista).
 * 3. OpenStreetMap: áreas landuse=residential / place=* con nombre dentro del
 *    límite municipal (Overpass) para el centro de cada colonia, y Nominatim
 *    (1 petición por segundo) para las que no aparecen en Overpass.
 * 4. Polígonos de códigos postales de SEPOMEX (repositorio open-mexico/mexico-geojson):
 *    las colonias sin centro en OSM se ubican en el centroide de su código
 *    postal y se marcan con `aprox: true`.
 *
 * Reglas de consolidación (ver README):
 * - Los sectores se agrupan bajo su colonia madre ("Mirasierra 3er Sector" →
 *   "Mirasierra"), igual que las ampliaciones con sufijo ("San Pedro 400
 *   Ampliación Norte" → "San Pedro 400").
 * - Se omiten las "Zonas" de planeación, zonas industriales/comerciales y
 *   corporativos (no son colonias habitacionales).
 * - Los 19 nombres que ya usa la app principal se conservan con su ortografía
 *   y su centro tal como están en la app.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const CACHE = join(tmpdir(), "registro-municipal-cache");
const SALIDA = join(RAIZ, "data", "fuentes", "colonias-base.json");
const USER_AGENT = "registro-municipal-simulado/1.0 (hackathon CallejerOS; investigacion de colonias)";

const URL_SEPOMEX = "https://www.correosdemexico.gob.mx/datosabiertos/cp/cpdescarga.txt";
const URL_OVERPASS = "https://overpass-api.de/api/interpreter";
const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";
const URL_CP_GEOJSON = "https://raw.githubusercontent.com/open-mexico/mexico-geojson/main/19-NL.geojson";

const LIMITES = { latMin: 25.6, latMax: 25.7, lngMin: -100.45, lngMax: -100.3 };

// ---------------------------------------------------------------------------
// 1. Plan de Desarrollo Urbano 2024 — colonias por distrito (sin "Zonas").
// ---------------------------------------------------------------------------
const PDU: Record<string, string[]> = {
  Callejones: [
    "Conjunto habitacional Las Bugambilias", "La Joya", "Los Callejones",
    "Los Pinos 1er. Sector (asentamiento irregular)", "Los Pinos 2° Sector (asentamiento irregular)",
    "Los Sabinos (parcelación familiar)", "Residencial Santa Bárbara Poniente", "San Carlos",
  ],
  "El Obispo": [
    "El Obispo", "Revolución 1er. Sector", "Revolución 2° Sector", "Revolución 3er. Sector",
    "Revolución 4° Sector", "Revolución 5° Sector", "San Pedro 400", "Unidad Habitacional San Pedro",
    "Villa del Obispo", "Vista Montaña 1er. Sector", "Vista Montaña 2° Sector", "Vista Montaña 3er. Sector",
  ],
  Industrial: [
    "Echeverría (asentamiento irregular)", "Lucio Blanco 1er. Sector (asentamiento irregular)",
    "Lucio Blanco 2° Sector (asentamiento irregular)", "Plan de Ayala (asentamiento irregular)",
    "Valle del Seminario",
  ],
  Lomas: [
    "Ampliación Tampiquito", "Balcones del Valle", "Barrancas del Pedregal", "Bosques de la Sierra 1er Sector",
    "Bosques de la Sierra 2o Sector", "Bosques de la Sierra 3er Sector", "Bosques del Valle 1er Sector",
    "Bosques del Valle 2o Sector", "Bosques del Valle 3er Sector", "Bosques del Valle 4o Sector",
    "Bosques del Valle 5o Sector", "Bosques del Valle Ampliación 5o Sector", "Capistrano",
    "Colinas de la Sierra", "Colonial de la Sierra", "Cortijo del Valle", "Del Valle Sector Fátima", "Fátima",
    "Jerónimo Siller", "La Barranca", "Lomas de Tampiquito", "Lomas del Valle", "Lomas del Valle Sector Convento",
    "Pedregal del Valle", "Privada Sierra Madre", "Residencial Sierra del Valle", "Sierra Nevada", "Tampiquito",
    "Valle de Chipinque", "Valle de San Ángel Sector Jardines", "Villas de Terrasol", "Villas del Pedregal",
    "Villas del Valle",
  ],
  "San Agustín": [
    "Alto Eucalipto", "Colinas de San Agustín", "Colorines 1er Sector", "Colorines 2° Sector",
    "Colorines 3er Sector", "Colorines 4° Sector", "Colorines 5° Sector", "Jardines de San Agustín 1er Sector",
    "Jardines de San Agustín 2° Sector", "Misión de San Patricio", "San Agustín Campestre",
    "San Patricio 4º Sector", "Ampliación Jardines de San Agustín III Sector", "Colonial San Agustín",
    "Las Calzadas", "Jardines de San Agustín III Sector", "Misión de San Agustín",
  ],
  "San Ángel": [
    "Bosques de San Ángel, Ampliación Palmillas", "Bosques de San Ángel, Sector Palmillas", "Carrizalejo",
    "Colinas de San Ángel", "Comercial Alpino", "Comercial Gómez Morín", "Corporativo Santa Engracia, 1er. Sector",
    "Corporativo Santa Engracia, 2o. Sector", "El Santuario", "Hacienda Carrizalejo", "La Cañada", "Las Alondras",
    "Lomas de San Ángel", "Mesa de la Corona, 1er Sector", "Mesa de la Corona, 2o Sector", "Mirasilla",
    "Montebello", "Olinalá", "Residencial Chipinque, 1er Sector", "Residencial Chipinque, 2o Sector",
    "Residencial Chipinque, 3er Sector", "San Patricio, 1er Sector", "San Patricio, 2o Sector",
    "San Patricio, 3er Sector", "Valle Campestre", "Valle de San Ángel, Sector Español",
    "Valle de San Ángel, Sector Francés", "Valle de San Ángel, Sector Mexicano",
    "Valle de San Ángel, Sector Rincón Francés", "Veredalta", "Villa Chipinque", "Villas de Aragón",
  ],
  "San Pedro": [
    "Bosques de San Pedro", "Casco Urbano", "Jesús M. Garza", "Lázaro Garza Ayala", "Linda Vista",
    "Los Sauces 1er Sector", "Los Sauces 2o Sector", "Lucio Blanco 3er Sector", "Nemesio García Naranjo",
    "Palo Blanco", "Palo Blanco Sector el Edén", "Rincón Colonial", "Rincón de Corregidora",
    "Rincón de San Francisco", "San Francisco", "Santa Elena", "Valle de Vasconcelos", "Volkswagen",
  ],
  Valle: [
    "Colonia del Valle", "Del Valle sector norte", "Fuentes del David", "Fuentes del Valle",
    "Fuentes del Valle sector Colinas", "Jardines del Valle", "Santa Engracia Poniente",
    "Valle de Santa Engracia", "Villas de Santa Engracia",
  ],
  "Valle Oriente": [
    "Ampliación Canteras", "Ampliación Valle del Mirador", "Balcones de San Agustín", "Corporativo Prodesa",
    "Corporativo Proser", "Del Valle Oriente", "El Refugio", "Hacienda San Agustín", "Jardines del Campestre",
    "La Diana", "La Muralla", "Las Privanzas 1er. Sector", "Las Privanzas 2° Sector", "Las Privanzas 3er. Sector",
    "Lomas de San Agustín 1er. Sector", "Lomas de San Agustín 2° Sector", "Lomas de San Agustín 3er. Sector",
    "Lomas del Campestre 1er. Sector", "Lomas del Campestre 2° Sector", "Los Amates", "Los Arcángeles",
    "Los Quetzales", "Parque Corporativo Ucalli", "Privada Fundadores", "Privada Lomas de San Agustín",
    "Privada San Roberto", "Real del Valle", "Real San Agustín", "Residencial San Agustín 1er. Sector",
    "Residencial San Agustín 2° Sector", "Residencial Santa Bárbara Oriente 1er. Sector",
    "Residencial Santa Bárbara Oriente 2° Sector", "Santa Cruz", "Santa Engracia Oriente", "Santa Fe",
    "Valle de San Agustín", "Villa Las Palmas", "Mirador del Campestre", "Portal de Santa Engracia", "Vista Real",
  ],
  "Valle Poniente": [
    "Hacienda del valle", "Hacienda del Rosario", "Hacienda Palo Blanco", "Jardines Coloniales 1er Sector",
    "Jardines Coloniales 2o Sector", "Jardines Coloniales 3er Sector", "Jardines de Mirasierra", "La Cima 1er Sector",
    "La Cima 2o Sector", "La Cima 3er Sector", "La Cooperativa", "La Finca", "La Montaña", "La Ventana",
    "Las Campanas", "Lomas del Rosario", "Mansión del Rosario", "Mirasierra 1er Sector", "Mirasierra 2o Sector",
    "Mirasierra 3er Sector", "Mirasierra 4o Sector", "Mirasierra 5o Sector", "Olímpico", "Prados de la Sierra",
    "Rincón de la Montaña 1er Sector", "Rincón de la Montaña 2º Sector", "Rincón de la Montaña 3er Sector",
    "Valle del Mezquite", "Villa Montaña 1er Sector", "Villa Montaña 2o Sector", "Villa Montaña Campestre",
    "Las Sendas", "Misión del Valle III",
  ],
};

// Nombres y centros que ya usa la app principal (supabase/migrations/…_colonias_osm.sql).
const APP_PRINCIPAL: Record<string, [number, number]> = {
  "Casco Urbano": [25.6629, -100.4037],
  Tampiquito: [25.6528, -100.3816],
  "Lucio Blanco": [25.6712, -100.4046],
  "San Pedro 400": [25.684, -100.4142],
  "El Obispo": [25.6804, -100.4034],
  "Vista Montaña": [25.6816, -100.4064],
  "Los Pinos": [25.6717, -100.3951],
  "U.H. Revolución": [25.683, -100.4093],
  Mirasierra: [25.6528, -100.3897],
  "Los Sauces": [25.6604, -100.4114],
  "Colonial de la Sierra": [25.6349, -100.3848],
  "Lomas del Valle": [25.645, -100.3816],
  "Fuentes del Valle": [25.6654, -100.3657],
  "Del Valle": [25.6587, -100.3699],
  Carrizalejo: [25.6373, -100.3657],
  "Valle de San Ángel": [25.6251, -100.3663],
  "Bosques del Valle": [25.6441, -100.3745],
  "Residencial San Agustín": [25.6516, -100.3417],
  "Valle Oriente": [25.6449, -100.322],
};

// Clave normalizada (tras agrupar sectores) → nombre canónico. `null` = se descarta.
const ALIAS: Record<string, string | null> = {
  "san pedro garza garcia centro": "Casco Urbano",
  revolucion: "U.H. Revolución",
  "unidad habitacional revolucion": "U.H. Revolución",
  "colonia del valle": "Del Valle",
  "colonial la sierra": "Colonial de la Sierra",
  "del valle oriente": "Valle Oriente",
  "lomas valle": "Lomas del Valle",
  "barranca del pedregal": "Barrancas del Pedregal",
  "colinas de la sierra": "Colinas de la Sierra Madre",
  "hacienda de carrizalejo": "Hacienda Carrizalejo",
  lindavista: "Linda Vista",
  "los colorines": "Colorines",
  bugambilias: "Las Bugambilias",
  "conjunto habitacional las bugambilias": "Las Bugambilias",
  "residencial santa barbara": "Residencial Santa Bárbara Oriente",
  "santa engracia": "Santa Engracia Poniente",
  "valle campestre": "Valle del Campestre",
  "real san agustin": "Real de San Agustín",
  "privada real de san agustin": "Real de San Agustín",
  "mision del valle 3": "Misión del Valle",
  "mision del valle iii": "Misión del Valle",
  "hacienda el rosario": "Hacienda del Rosario",
  "hacienda las campanas": "Las Campanas",
  "jesus m garza": "Jesús M. Garza",
  "nemesio garcia naranjo": "Nemesio García Naranjo",
  "mision san patricio": "Misión de San Patricio",
  "jardines de campestre": "Jardines del Campestre",
  "villa del pedregal": "Villas del Pedregal",
  "residencial frida kahalo": "Residencial Frida Kahlo",
  "cojunto habitacional renzo": "Conjunto Habitacional Renzo",
  "la canada": "La Cañada",
  "valle de san angel rincon frances": "Valle de San Ángel",
  // Nombres genéricos o ambiguos con el nombre del municipio: se descartan.
  "san pedro": null,
  condominio: null,
  "las sendas": null, // cubierto por "Las Sendas Andalucía" y "Las Sendas Galicia"
};

// Clave de un área de OSM → clave de colonia (cuando OSM usa otra variante).
const ALIAS_OSM: Record<string, string> = {
  "san pedro 400 fomerrey 22": "san pedro 400",
  "hacienda los quetzales": "los quetzales",
  "nemecio garcia naranjo": "nemesio garcia naranjo",
  "las amapas": "residencial las amapas",
  "residencial los amates": "los amates",
  "san andres": "privada san andres",
  "20 de noviembre": "privada 20 de noviembre",
  "rio ebro": "privada rio ebro",
  "los cubos": "residencial los cubos",
  "villas del obispo": "villa del obispo",
  "residencial las canteras": "residencial canteras",
  frida: "residencial frida kahlo",
  "santa fe": "santa fe",
  "la ceiba": "las ceibas",
  "zona montebello": "montebello",
  "valle de campestre": "valle del campestre",
  "senda galicia": "las sendas galicia",
  "sierra madre": "privada sierra madre",
  "real de san agustin": "real de san agustin",
  "conjunto habitacional bugambilias": "las bugambilias",
  "residencial santa barbara": "residencial santa barbara oriente",
  "jardines coloniales 1 sector": "jardines coloniales",
  "unidad habitacional revolucion": "u h revolucion",
  "san pedro garza garcia centro": "casco urbano",
};

// Correcciones ortográficas menores de los catálogos (acentos, mayúsculas, erratas).
const ORTOGRAFIA: [RegExp, string][] = [
  [/\bAgustin\b/g, "Agustín"],
  [/\bAngel\b/g, "Ángel"],
  [/\bGarcia\b/g, "García"],
  [/\bBarbara\b/g, "Bárbara"],
  [/\bAragon\b/g, "Aragón"],
  [/\bFrances\b/g, "Francés"],
  [/\bEspanol\b/g, "Español"],
  [/\bOlinala\b/g, "Olinalá"],
  [/\bRio\b/g, "Río"],
  [/\bAndres\b/g, "Andrés"],
  [/\bMision\b/g, "Misión"],
  [/\bJesus\b/g, "Jesús"],
  [/\bGalicias\b/g, "Galicia"],
  [/\bClouhtier\b/g, "Clouthier"],
  [/\bVazconcelos\b/g, "Vasconcelos"],
];
const ARTICULOS = new Set(["la", "las", "los", "el"]);

function quitarAcentos(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function clave(nombre: string) {
  return quitarAcentos(nombre).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** "Mirasierra 3er Sector" → "Mirasierra"; quita notas entre paréntesis. */
function agruparSector(nombre: string) {
  let n = nombre.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  n = n.replace(/^(.+?),?\s+ampliaci[oó]n\b.*$/i, "$1"); // "San Pedro 400 Ampliación Norte"
  n = n.replace(/^(.+?),?\s+(\d{1,2}|I{1,3}|IV|V)\s*(er|ro|do|to|o|º|°)?\.?\s+sector\.?$/i, "$1"); // "3er. Sector"
  n = n.replace(/^(.+?),?\s+sect(or)?\b.*$/i, "$1"); // "Sector Fátima", "Sect Frances"
  n = n.replace(/^(.+?)\s+(\d|I{1,3})$/i, "$1"); // "Misión del Valle III", "Misión del Valle 3"
  return n.trim();
}

function pulir(nombre: string) {
  let n = nombre;
  for (const [re, rep] of ORTOGRAFIA) n = n.replace(re, rep);
  // "de", "del" y "y" en minúscula; el artículo sólo tras "de" ("Prados de la Sierra",
  // pero "Villa Las Palmas"); el resto de las palabras con mayúscula inicial.
  const palabras = n.split(" ");
  return palabras
    .map((p, i) => {
      const min = p.toLowerCase();
      if (i > 0 && ["de", "del", "y"].includes(min)) return min;
      if (i > 0 && ARTICULOS.has(min) && palabras[i - 1].toLowerCase() === "de") return min;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

function dentro(lat: number, lng: number) {
  return lat >= LIMITES.latMin && lat <= LIMITES.latMax && lng >= LIMITES.lngMin && lng <= LIMITES.lngMax;
}

async function cacheado(nombre: string, obtener: () => Promise<string>) {
  await mkdir(CACHE, { recursive: true });
  const ruta = join(CACHE, nombre);
  if (existsSync(ruta)) return readFile(ruta, "utf8");
  const texto = await obtener();
  await writeFile(ruta, texto);
  return texto;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Candidata = {
  nombre: string;
  distrito: string | null;
  votosDistrito: Map<string, number>;
  codigos_postales: Set<string>;
  fuentes: Set<string>;
};

async function main() {
  const candidatas = new Map<string, Candidata>();
  const agregar = (nombreBruto: string, fuente: string, distrito: string | null, cp: string | null) => {
    const agrupado = agruparSector(nombreBruto);
    const k0 = clave(agrupado);
    let nombre: string;
    if (k0 in ALIAS) {
      const destino = ALIAS[k0];
      if (destino === null) return;
      nombre = destino;
    } else {
      const app = Object.keys(APP_PRINCIPAL).find((n) => clave(n) === k0);
      nombre = app ?? pulir(agrupado);
    }
    const k = clave(nombre);
    const c = candidatas.get(k) ?? {
      nombre,
      distrito: null,
      votosDistrito: new Map<string, number>(),
      codigos_postales: new Set<string>(),
      fuentes: new Set<string>(),
    };
    if (distrito) {
      // Una colonia con sectores en dos distritos se queda con el que tiene más sectores.
      c.votosDistrito.set(distrito, (c.votosDistrito.get(distrito) ?? 0) + 1);
      c.distrito = [...c.votosDistrito].sort((a, b) => b[1] - a[1])[0][0];
    }
    if (cp) c.codigos_postales.add(cp);
    c.fuentes.add(fuente);
    candidatas.set(k, c);
  };

  // --- PDU 2024
  const noHabitacional = /^(comercial|corporativo|parque corporativo)\b/i;
  for (const [distrito, nombres] of Object.entries(PDU)) {
    for (const n of nombres) if (!noHabitacional.test(n)) agregar(n, "pdu2024", distrito, null);
  }

  // --- SEPOMEX
  const sepomex = await cacheado("cpdescarga.txt", async () => {
    console.log("Descargando catálogo SEPOMEX…");
    const r = await fetch(URL_SEPOMEX, { headers: { "User-Agent": USER_AGENT } });
    if (!r.ok) throw new Error(`SEPOMEX ${r.status}`);
    return new TextDecoder("latin1").decode(await r.arrayBuffer());
  });
  const filas = sepomex
    .split(/\r?\n/)
    .map((l) => l.split("|"))
    .filter((f) => f[3] === "San Pedro Garza García" && f[4] === "Nuevo León");
  console.log(`SEPOMEX: ${filas.length} asentamientos en San Pedro Garza García`);
  for (const f of filas) {
    const [cp, nombreSepomex, tipo] = f;
    // SEPOMEX registra "Tampiquito" con tipo "Ampliación": es la Ampliación Tampiquito del plan.
    const nombre = tipo === "Ampliación" && !/^ampliaci/i.test(nombreSepomex) ? `Ampliación ${nombreSepomex}` : nombreSepomex;
    if (/^zona\b/i.test(nombre) || /zona (industrial|comercial)/i.test(tipo) || noHabitacional.test(nombre)) continue;
    agregar(nombre, "sepomex", null, cp);
  }
  // CP para nombres del PDU que SEPOMEX escribe distinto o como "Zona …".
  for (const f of filas) {
    const k = clave(agruparSector(f[1].replace(/^zona\s+/i, "")));
    const destino = k in ALIAS ? ALIAS[k] : null;
    const c = candidatas.get(destino ? clave(destino) : k);
    if (c && c.codigos_postales.size === 0) c.codigos_postales.add(f[0]);
  }

  // --- OpenStreetMap (Overpass)
  const consulta = `[out:json][timeout:90];
area["boundary"="administrative"]["name"="San Pedro Garza García"]["admin_level"="6"]->.a;
(
  nwr(area.a)["place"~"^(neighbourhood|suburb|quarter|hamlet|village)$"]["name"];
  way(area.a)["landuse"="residential"]["name"];
  relation(area.a)["landuse"="residential"]["name"];
);
out center tags;`;
  const osm = JSON.parse(
    await cacheado("overpass-colonias.json", async () => {
      console.log("Consultando Overpass…");
      const r = await fetch(URL_OVERPASS, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: consulta }),
      });
      if (!r.ok) throw new Error(`Overpass ${r.status}`);
      return r.text();
    }),
  ) as { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }[] };

  const puntosOsm = new Map<string, [number, number][]>();
  for (const e of osm.elements) {
    const lat = e.center?.lat ?? e.lat;
    const lng = e.center?.lon ?? e.lon;
    if (lat == null || lng == null || !dentro(lat, lng)) continue;
    let k = clave(agruparSector(e.tags.name));
    k = ALIAS_OSM[k] ?? k;
    if (k in ALIAS && ALIAS[k]) k = clave(ALIAS[k]!);
    const lista = puntosOsm.get(k) ?? [];
    lista.push([lat, lng]);
    puntosOsm.set(k, lista);
  }
  console.log(`OSM: ${osm.elements.length} elementos, ${puntosOsm.size} nombres distintos`);

  // --- Coordenadas
  type Resultado = Candidata & { lat?: number; lng?: number; aprox?: boolean; fuente_coordenadas?: string };
  const resultados: Resultado[] = [...candidatas.values()];
  const nominatimCache = JSON.parse(await cacheado("nominatim.json", async () => "{}")) as Record<
    string,
    [number, number] | null
  >;
  for (const c of resultados) {
    const k = clave(c.nombre);
    if (APP_PRINCIPAL[c.nombre]) {
      [c.lat, c.lng] = APP_PRINCIPAL[c.nombre];
      c.fuente_coordenadas = "app-principal (OSM/Nominatim)";
      continue;
    }
    const pts = puntosOsm.get(k);
    if (pts?.length) {
      c.lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      c.lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      c.fuente_coordenadas = "osm-overpass";
      continue;
    }
    if (!(c.nombre in nominatimCache) && !process.env.SIN_NOMINATIM) {
      const params = new URLSearchParams({
        q: `${c.nombre}, San Pedro Garza García, Nuevo León`,
        format: "jsonv2",
        limit: "5",
        countrycodes: "mx",
        viewbox: `${LIMITES.lngMin},${LIMITES.latMax},${LIMITES.lngMax},${LIMITES.latMin}`,
        bounded: "1",
      });
      await esperar(1100);
      const r = await fetch(`${URL_NOMINATIM}?${params}`, { headers: { "User-Agent": USER_AGENT } });
      const datos = r.ok ? ((await r.json()) as { lat: string; lon: string; category: string; name: string }[]) : [];
      const bueno = datos.find(
        (d) =>
          ["place", "landuse", "boundary"].includes(d.category) &&
          clave(d.name ?? "").includes(clave(c.nombre).replace(/^(privada|residencial|colonia) /, "")),
      );
      nominatimCache[c.nombre] = bueno ? [Number(bueno.lat), Number(bueno.lon)] : null;
      console.log(`Nominatim "${c.nombre}": ${bueno ? "encontrada" : "sin resultado"}`);
      await writeFile(join(CACHE, "nominatim.json"), JSON.stringify(nominatimCache, null, 1));
    }
    const hit = nominatimCache[c.nombre];
    if (hit && dentro(hit[0], hit[1])) {
      [c.lat, c.lng] = hit;
      c.fuente_coordenadas = "osm-nominatim";
    }
  }

  // Distrito para nombres que sólo vienen de SEPOMEX: el distrito mayoritario de su código postal.
  const distritoPorCp = new Map<string, Map<string, number>>();
  for (const c of resultados) {
    if (!c.distrito) continue;
    for (const cp of c.codigos_postales) {
      const m = distritoPorCp.get(cp) ?? new Map();
      m.set(c.distrito, (m.get(c.distrito) ?? 0) + 1);
      distritoPorCp.set(cp, m);
    }
  }
  for (const c of resultados) {
    if (c.distrito) continue;
    const votos = new Map<string, number>();
    for (const cp of c.codigos_postales)
      for (const [d, n] of distritoPorCp.get(cp) ?? []) votos.set(d, (votos.get(d) ?? 0) + n);
    const mejor = [...votos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (mejor) c.distrito = mejor[0];
  }

  // Sin coordenadas: centroide del polígono de su código postal (SEPOMEX, vía
  // open-mexico/mexico-geojson) o, si no hay, promedio de las colonias de su distrito.
  const poligonosCp = JSON.parse(
    await cacheado("19-NL.geojson", async () => {
      console.log("Descargando polígonos de códigos postales de Nuevo León…");
      const r = await fetch(URL_CP_GEOJSON, { headers: { "User-Agent": USER_AGENT } });
      if (!r.ok) throw new Error(`mexico-geojson ${r.status}`);
      return r.text();
    }),
  ) as { features: { properties: { d_codigo: number | string }; geometry: { type: string; coordinates: unknown } }[] };
  const centroideCp = new Map<string, [number, number]>();
  for (const f of poligonosCp.features) {
    const cp = String(f.properties.d_codigo).padStart(5, "0");
    if (!cp.startsWith("662")) continue;
    const poligonos = (
      f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates
    ) as [number, number][][][];
    let area = 0, cx = 0, cy = 0;
    for (const anillo of poligonos.map((p) => p[0])) {
      for (let i = 0; i < anillo.length - 1; i++) {
        const [x0, y0] = anillo[i];
        const [x1, y1] = anillo[i + 1];
        const cruz = x0 * y1 - x1 * y0;
        area += cruz / 2;
        cx += (x0 + x1) * cruz;
        cy += (y0 + y1) * cruz;
      }
    }
    const centro: [number, number] = [cy / (6 * area), cx / (6 * area)];
    if (dentro(centro[0], centro[1])) centroideCp.set(cp, centro);
  }
  const promedio = (xs: Resultado[]) =>
    xs.length
      ? ([xs.reduce((s, x) => s + x.lat!, 0) / xs.length, xs.reduce((s, x) => s + x.lng!, 0) / xs.length] as const)
      : null;
  const conCoords = resultados.filter((c) => c.lat != null);
  for (const c of resultados) {
    if (c.lat != null) continue;
    const cp = [...c.codigos_postales].sort().find((x) => centroideCp.has(x));
    const mismoDistrito = conCoords.filter((o) => c.distrito && o.distrito === c.distrito);
    const p = (cp ? centroideCp.get(cp) : null) ?? promedio(mismoDistrito) ?? [25.6573, -100.4026];
    [c.lat, c.lng] = p;
    c.aprox = true;
    c.fuente_coordenadas = cp ? `aprox: centroide del código postal ${cp}` : "aprox: centro del distrito";
  }

  // Sin distrito todavía: el de la colonia (con centro real) más cercana.
  const referencias = resultados.filter((o) => o.distrito && !o.aprox);
  for (const c of resultados) {
    if (c.distrito) continue;
    const d2 = (o: Resultado) => (o.lat! - c.lat!) ** 2 + (o.lng! - c.lng!) ** 2;
    const cercana = [...referencias].sort((a, b) => d2(a) - d2(b))[0];
    if (cercana) c.distrito = cercana.distrito;
  }

  const salida = resultados
    .map((c) => ({
      nombre: c.nombre,
      lat: Number(c.lat!.toFixed(5)),
      lng: Number(c.lng!.toFixed(5)),
      codigo_postal: [...c.codigos_postales].sort()[0] ?? null,
      distrito: c.distrito,
      ...(c.aprox ? { aprox: true } : {}),
      fuentes: [...c.fuentes].sort(),
      fuente_coordenadas: c.fuente_coordenadas,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  await mkdir(join(RAIZ, "data", "fuentes"), { recursive: true });
  await writeFile(SALIDA, JSON.stringify(salida, null, 2) + "\n");
  const aprox = salida.filter((c) => c.aprox).length;
  console.log(`\n${salida.length} colonias escritas en ${SALIDA} (${aprox} con centro aproximado)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
