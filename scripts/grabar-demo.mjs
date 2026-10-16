/**
 * Graba el video demo de CallejerOS (~50 s): recorre la app real como vecina, rescatista y municipio
 * dentro de un marco de teléfono, con títulos cortos, sonidos en cada toque y música de fondo.
 *
 * Requisitos: `npm run dev` corriendo en :3000, ffmpeg en el PATH y .env.local con la secret key.
 * Uso: npm run demo:video  →  demo/CallejerOS-demo.mp4   (--sin-musica para dejar solo los efectos)
 *
 * Se graba en tiempo real y luego se edita solo: las esperas (logins, red, IA) se recortan y los
 * desplazamientos se aceleran. Crea datos de apoyo (un caso urgente y un gato "en vivo") y al
 * final borra todo lo que creó, igual que las pruebas e2e.
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BellRing, Camera, ChartColumn, HeartHandshake, Hexagon, MapIcon, PawPrint, Trophy, UserRound } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import sharp from "sharp";
import { renderizarAudio } from "./demo-audio.mjs";

process.loadEnvFile(".env.local");

const BASE = "http://localhost:3000";
const CARPETA = "demo";
const TEMPORAL = `${CARPETA}/.partes`;
const FINAL = `${CARPETA}/CallejerOS-demo.mp4`;
// El escenario se diseña a 1440×810 y se escala con CSS a 1920×1080: la captura de Chrome
// ignora deviceScaleFactor, pero sí rasteriza nítido el contenido escalado (incluido el iframe).
const ANCHO = 1440;
const ALTO = 810;
const ESCALA = 4 / 3;
const VIDEO = { width: ANCHO * ESCALA, height: ALTO * ESCALA };
const FPS = 30;
// Velocidad de los desplazamientos de pantalla en el video final.
const RAPIDO = 1.8;

const LUGAR_VECINA = { latitude: 25.6512, longitude: -100.3788 };
const CENTRO = { latitude: 25.6633, longitude: -100.4031 };

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const creados = [];

const icono = (Icono, size = 28) => renderToStaticMarkup(createElement(Icono, { size, strokeWidth: 2.2 }));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Datos de apoyo ────────────────────────────────────────────────────────────

async function perfilId(nombre) {
  const { data, error } = await db.from("profiles").select("id").eq("nombre", nombre).single();
  if (error) throw new Error(`No encontré el perfil "${nombre}": ${error.message}`);
  return data.id;
}

/** Animal con su primer avistamiento, como si alguien lo hubiera reportado hace `haceMin` minutos. */
async function crearAnimal({ reportero, haceMin = 0, foto, ...campos }) {
  const cuando = new Date(Date.now() - haceMin * 60_000).toISOString();
  const { data, error } = await db
    .from("animals")
    .insert({ ...campos, foto_portada_url: foto, reportado_por: reportero, total_avistamientos: 1, visto_ultima_vez: cuando })
    .select("id")
    .single();
  if (error) throw error;
  creados.push(data.id);
  await db
    .from("sightings")
    .insert({ animal_id: data.id, user_id: reportero, lat: campos.lat, lng: campos.lng, foto_url: foto, created_at: cuando });
  return data.id;
}

/** Igual que `borrarAnimales` de e2e/helpers.ts: animales, sus huellas y sus fotos en Storage. */
async function borrarCreados() {
  if (creados.length === 0) return;
  const { data: avistamientos } = await db.from("sightings").select("foto_url").in("animal_id", creados);
  const rutas = (avistamientos ?? [])
    .map((s) => s.foto_url?.split("/storage/v1/object/public/fotos/")[1])
    .filter(Boolean);
  if (rutas.length > 0) await db.storage.from("fotos").remove(rutas);
  await db.from("point_events").delete().in("animal_id", creados);
  await db.from("animals").delete().in("id", creados);
  creados.length = 0;
}

async function fotoDelPerro() {
  const buffer = await sharp("public/placeholders/perro-1.svg").resize(1600, 1200).jpeg({ quality: 90 }).toBuffer();
  return { name: "perro.jpg", mimeType: "image/jpeg", buffer };
}

// ─── Marco de presentación ────────────────────────────────────────────────────

const LOGO = `<svg viewBox="0 0 512 512" class="logo"><rect width="512" height="512" rx="112" fill="#e2583e"/><path d="M256 84c-72 0-130 57-130 128 0 95 130 212 130 212s130-117 130-212c0-71-58-128-130-128z" fill="#fff8ee"/><g fill="#e2583e"><path class="almohadilla" d="M256 214c-26 0-50 22-50 42 0 15 12 22 25 20 9-1 16-5 25-5s16 4 25 5c13 2 25-5 25-20 0-20-24-42-50-42z"/><ellipse class="dedo-logo" style="--i:0" cx="207" cy="186" rx="15" ry="20" transform="rotate(-22 207 186)"/><ellipse class="dedo-logo" style="--i:1" cx="238" cy="160" rx="15" ry="21" transform="rotate(-7 238 160)"/><ellipse class="dedo-logo" style="--i:2" cx="274" cy="160" rx="15" ry="21" transform="rotate(7 274 160)"/><ellipse class="dedo-logo" style="--i:3" cx="305" cy="186" rx="15" ry="20" transform="rotate(22 305 186)"/></g></svg>`;

const ROLES = {
  vecina: { nombre: "Vecina", color: "#e2583e", icono: icono(UserRound, 20) },
  rescatista: { nombre: "Rescatista", color: "#1f7a6d", icono: icono(HeartHandshake, 20) },
  municipio: { nombre: "Municipio", color: "#4a3aa7", icono: icono(Hexagon, 20) },
};

// Huellitas decorativas del fondo (posición, tamaño, giro).
const HUELLAS_FONDO = [
  [60, 640, 54, -20], [180, 720, 40, 10], [880, 60, 46, 25], [1010, 140, 34, -10],
  [760, 700, 38, 30], [640, 40, 30, -35], [1350, 720, 44, 15], [1380, 90, 36, -25],
]
  .map(
    ([x, y, s, r], i) =>
      `<span class="huella-fondo" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;--r:${r}deg;--d:${i * 0.7}s">${icono(PawPrint, s)}</span>`,
  )
  .join("");

/** "Reporta con *una foto*" → palabras animadas una por una; lo marcado con * va en color. */
function tituloAnimado(texto) {
  let i = 0;
  return texto
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((trozo) => {
      const resaltado = trozo.startsWith("*");
      return trozo
        .replaceAll("*", "")
        .split(" ")
        .filter(Boolean)
        .map((p) => `<span class="p${resaltado ? " r" : ""}" style="--i:${i++}">${p}</span>`)
        .join(" ");
    })
    .join(" ");
}

const HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>CallejerOS · demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
<style>
:root{--crema:#fff8ee;--arena:#f3e7d3;--arena-o:#e6d5ba;--tinta:#2b2118;--suave:#6b5b4d;--terracota:#e2583e;--suave-ease:cubic-bezier(.16,1,.3,1);--rebote:cubic-bezier(.34,1.56,.64,1)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${VIDEO.width}px;height:${VIDEO.height}px;overflow:hidden;background:var(--crema);color:var(--tinta);font-family:Nunito,ui-rounded,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.escenario{position:absolute;left:0;top:0;width:${ANCHO}px;height:${ALTO}px;transform:scale(${ESCALA});transform-origin:0 0}
.fondo{position:absolute;inset:0;background:radial-gradient(900px 620px at 78% 50%,#fbe3d3 0%,transparent 62%),radial-gradient(700px 500px at 0% 105%,#f3e7d3 0%,transparent 70%)}
.huella-fondo{position:absolute;color:var(--terracota);opacity:.07;transform:rotate(var(--r));animation:flotar 6s ease-in-out var(--d) infinite}
@keyframes flotar{50%{transform:rotate(var(--r)) translateY(-8px)}}
.marca{position:absolute;top:40px;left:96px;display:flex;align-items:center;gap:12px;font-family:Fredoka;font-weight:600;font-size:24px}
.marca .logo{width:40px;height:40px}
.marca b{color:var(--terracota);font-weight:600}
.panel{position:absolute;left:96px;top:0;bottom:0;width:720px;display:flex;flex-direction:column;justify-content:center;gap:26px;transition:opacity .2s,transform .2s}
.panel.fuera{opacity:0;transform:translateY(-14px)}
.meta{display:flex;align-items:center;gap:16px}
.insignia{width:76px;height:76px;border-radius:24px;display:grid;place-items:center;color:#fff;box-shadow:0 16px 30px -12px rgba(43,33,24,.45);animation:pop .55s var(--rebote) both}
.rol{display:inline-flex;align-items:center;gap:8px;padding:7px 15px 7px 12px;border-radius:999px;color:#fff;font-weight:800;font-size:16px;letter-spacing:.04em;animation:sube .5s var(--suave-ease) .12s both}
h1{font-family:Fredoka;font-weight:600;font-size:84px;line-height:1.02;letter-spacing:-.015em}
h1 .p{display:inline-block;animation:palabra .55s var(--suave-ease) both;animation-delay:calc(.1s + var(--i) * .07s)}
h1 .r{color:var(--terracota)}
@keyframes palabra{from{opacity:0;transform:translateY(.5em) rotate(3deg);filter:blur(8px)}}
.texto{font-size:30px;line-height:1.35;color:var(--suave);max-width:640px;animation:sube .6s var(--suave-ease) .35s both}
.progreso{position:absolute;left:96px;bottom:46px;width:620px;display:flex;gap:8px}
.progreso span{flex:1;height:6px;border-radius:9px;background:var(--arena-o);overflow:hidden}
.progreso i{display:block;height:100%;background:var(--terracota);transform-origin:left;transform:scaleX(0);transition:transform .6s var(--suave-ease)}
.telefono{position:absolute;right:130px;top:50%;margin-top:-372px;width:414px;height:744px;border-radius:56px;background:#1f1915;padding:12px;box-shadow:0 50px 90px -30px rgba(43,33,24,.55),0 0 0 2px #3b302a inset;transition:transform .7s var(--suave-ease)}
.telefono.cerca{transform:scale(1.07) rotate(-1deg)}
.telefono::before{content:"";position:absolute;top:5px;left:50%;width:56px;height:4px;margin-left:-28px;border-radius:9px;background:#3b302a}
.telefono iframe{width:390px;height:720px;border:0;border-radius:44px;background:var(--crema);display:block}
.dedo{position:absolute;left:0;top:0;z-index:60;pointer-events:none;opacity:0;transition:transform .42s var(--suave-ease),opacity .25s}
.dedo i{display:block;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:999px;background:rgba(43,33,24,.2);border:3px solid rgba(255,255,255,.95);box-shadow:0 6px 18px rgba(43,33,24,.35);transition:transform .12s}
.dedo.presionado i{transform:scale(.7);background:rgba(226,88,62,.4)}
.onda{position:absolute;z-index:59;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:999px;border:3px solid var(--terracota);pointer-events:none;animation:onda .5s ease-out forwards}
@keyframes onda{from{transform:scale(.6);opacity:.9}to{transform:scale(2.3);opacity:0}}
.cortina{position:absolute;inset:0;z-index:100;background:var(--crema);display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .35s var(--suave-ease)}
.cortina.visible{opacity:1}
.cortina .fondo{z-index:-1}
.centro{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px}
.centro .logo{width:150px;height:150px;animation:pop .6s var(--rebote) both;filter:drop-shadow(0 18px 30px rgba(226,88,62,.35))}
.dedo-logo{transform-box:fill-box;transform-origin:center;animation:dedito .5s var(--rebote) both;animation-delay:calc(.3s + var(--i) * .07s)}
.almohadilla{transform-box:fill-box;transform-origin:center;animation:dedito .5s var(--rebote) .2s both}
@keyframes dedito{from{transform:scale(0)}}
@keyframes pop{from{transform:scale(.3) rotate(-14deg);opacity:0}}
.sube{animation:sube .6s var(--suave-ease) both}
@keyframes sube{from{transform:translateY(22px);opacity:0}}
.titulo-grande{font-family:Fredoka;font-weight:600;font-size:118px;line-height:1;letter-spacing:-.02em}
.titulo-grande b,.titulo-medio b{color:var(--terracota);font-weight:600}
.lema{font-size:30px;color:var(--suave);max-width:860px;line-height:1.35}
.evento{margin-top:6px;display:inline-flex;gap:10px;align-items:center;padding:10px 20px;border-radius:999px;background:#fff;box-shadow:0 0 0 1.5px var(--arena-o);font-weight:800;font-size:17px;color:var(--suave);letter-spacing:.03em}
.evento svg{color:var(--terracota)}
.titulo-medio{font-family:Fredoka;font-weight:600;font-size:78px;line-height:1.05}
.icono-rol{width:124px;height:124px;border-radius:38px;display:grid;place-items:center;color:#fff;animation:pop .5s var(--rebote) both;box-shadow:0 20px 40px -12px rgba(43,33,24,.35)}
.pre{font-size:22px;font-weight:800;color:var(--suave);letter-spacing:.14em;text-transform:uppercase}
.tarjetas{display:flex;gap:22px;margin-top:10px}
.tarjeta{width:300px;padding:24px;border-radius:28px;background:#fff;box-shadow:0 0 0 1.5px var(--arena-o);text-align:left;display:flex;flex-direction:column;gap:10px}
.tarjeta .ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;color:#fff}
.tarjeta h3{font-family:Fredoka;font-weight:600;font-size:26px}
.tarjeta p{font-size:18px;color:var(--suave);line-height:1.4}
</style></head>
<body><div class="escenario">
<div class="fondo"></div>${HUELLAS_FONDO}
<div class="marca">${LOGO}<span>Callejer<b>OS</b></span></div>
<section class="panel fuera"></section>
<div class="progreso">${"<span><i></i></span>".repeat(6)}</div>
<div class="telefono"><iframe id="app" name="app" src="/login" allow="geolocation; camera"></iframe></div>
<div class="dedo"><i></i></div>
<div class="cortina visible"><div class="fondo"></div><div class="contenido"></div></div>
</div>
<script>
const $ = (s) => document.querySelector(s);
// Playwright da coordenadas reales (1920×1080); el escenario está dibujado a 1440×810.
const ESCALA = ${ESCALA};
window.escena = ({ n, total, html }) => new Promise((listo) => {
  $(".panel").classList.add("fuera");
  setTimeout(() => {
    $(".panel").innerHTML = html;
    document.querySelectorAll(".progreso i").forEach((el, i) => (el.style.transform = "scaleX(" + (i < n ? 1 : 0) + ")"));
    $(".panel").classList.remove("fuera");
    listo();
  }, 200);
});
window.cortina = (html) => {
  if (html) { $(".cortina .contenido").innerHTML = html; $(".cortina").classList.add("visible"); }
  else $(".cortina").classList.remove("visible");
};
window.acercar = (si) => $(".telefono").classList.toggle("cerca", si);
window.dedo = (x, y) => {
  const d = $(".dedo");
  d.style.opacity = 1;
  d.style.transform = "translate(" + x / ESCALA + "px," + y / ESCALA + "px)";
};
window.ocultarDedo = () => ($(".dedo").style.opacity = 0);
window.toque = (x, y) => {
  const o = document.createElement("span");
  o.className = "onda"; o.style.left = x / ESCALA + "px"; o.style.top = y / ESCALA + "px";
  $(".escenario").appendChild(o); setTimeout(() => o.remove(), 600);
  $(".dedo").classList.add("presionado"); setTimeout(() => $(".dedo").classList.remove("presionado"), 160);
};
</script>
</body></html>`;

const INTRO = `<div class="centro">
  ${LOGO}
  <h1 class="titulo-grande sube" style="animation-delay:.3s">Callejer<b>OS</b></h1>
  <p class="lema sube" style="animation-delay:.5s">Rescatemos juntos a los animales de la calle.</p>
  <span class="evento sube" style="animation-delay:.7s">${icono(PawPrint, 20)} Hackathon San Pedro · Bienestar animal</span>
</div>`;

const cambioDeRol = (rol, Icono, frase) => `<div class="centro">
  <span class="icono-rol" style="background:${rol.color}">${icono(Icono, 62)}</span>
  <p class="pre sube" style="animation-delay:.12s">Ahora, el</p>
  <h2 class="titulo-medio sube" style="animation-delay:.18s">${rol.nombre}</h2>
  <p class="lema sube" style="animation-delay:.28s">${frase}</p>
</div>`;

const OUTRO = `<div class="centro">
  ${LOGO}
  <h2 class="titulo-medio sube" style="animation-delay:.25s">Reporta. Rescata. <b>Adopta.</b></h2>
  <div class="tarjetas">
    ${[
      [ROLES.vecina.color, Camera, "Vecinos", "Reportan con una foto y ganan huellas."],
      [ROLES.rescatista.color, HeartHandshake, "Rescatistas", "Atienden primero lo más urgente."],
      [ROLES.municipio.color, ChartColumn, "Municipio", "Planea campañas con datos en vivo."],
    ]
      .map(
        ([color, Icono, titulo, texto], i) => `<div class="tarjeta sube" style="animation-delay:${0.45 + i * 0.1}s">
      <span class="ic" style="background:${color}">${icono(Icono, 26)}</span><h3>${titulo}</h3><p>${texto}</p></div>`,
      )
      .join("")}
  </div>
</div>`;

const ESCENAS = [
  { rol: ROLES.vecina, Icono: MapIcon, titulo: "Mapa *en vivo*", texto: "Cada animal reportado en San Pedro, en tiempo real." },
  { rol: ROLES.vecina, Icono: Camera, titulo: "Reporta con *una foto*", texto: "La IA detecta especie, condición y urgencia por ti." },
  { rol: ROLES.vecina, Icono: BellRing, titulo: "Te avisa cuando *lo rescatan*", texto: "Y ganas +20 huellas por ayudar." },
  { rol: ROLES.vecina, Icono: Trophy, titulo: "Ayudar es *un juego*", texto: "Huellas, insignias y ranking por colonia." },
  { rol: ROLES.rescatista, Icono: HeartHandshake, titulo: "Rescata lo *más urgente*", texto: "Casos por urgencia y cercanía, en un toque." },
  { rol: ROLES.municipio, Icono: ChartColumn, titulo: "Datos para *decidir*", texto: "Zonas críticas y tendencias para planear campañas." },
].map(({ rol, Icono, titulo, texto }) => ({
  html: `<div class="meta"><span class="insignia" style="background:${rol.color}">${icono(Icono, 40)}</span>
    <span class="rol" style="background:${rol.color}">${rol.icono}${rol.nombre}</span></div>
    <h1>${tituloAnimado(titulo)}</h1><p class="texto">${texto}</p>`,
}));

// ─── Captura (CDP screencast → ffmpeg) ─────────────────────────────────────────

function ffmpeg(args) {
  return new Promise((ok, mal) => {
    const p = spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg terminó con ${c}`))));
  });
}

async function iniciarGrabacion(page, archivo) {
  const cdp = await page.context().newCDPSession(page);
  const proceso = spawn(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-g", "15", archivo],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  let t0 = null;
  let ultimo = null;
  let escritos = 0;
  // Cada cuadro nuevo "cierra" al anterior: se repite hasta cubrir el tiempo que estuvo en pantalla.
  const rellenarHasta = (t) => {
    const objetivo = Math.round((t - t0) * FPS);
    for (; escritos < objetivo; escritos++) proceso.stdin.write(ultimo);
  };
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    const t = metadata.timestamp ?? Date.now() / 1000;
    if (t0 === null) t0 = t;
    else rellenarHasta(t);
    ultimo = Buffer.from(data, "base64");
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: VIDEO.width, maxHeight: VIDEO.height });
  while (t0 === null) await pausa(20);
  return {
    /** Segundos desde el primer cuadro grabado. */
    reloj: () => Date.now() / 1000 - t0,
    async detener() {
      await cdp.send("Page.stopScreencast");
      rellenarHasta(Date.now() / 1000);
      proceso.stdin.end();
      await new Promise((ok, mal) => proceso.on("close", (c) => (c === 0 ? ok() : mal(new Error(`ffmpeg terminó con ${c}`)))));
    },
  };
}

/**
 * Edición: la grabación se divide en tramos con su velocidad (0 = se recorta). Cada tramo se
 * exporta con un número exacto de cuadros para que los sonidos caigan justo donde deben.
 */
async function editar({ crudo, tramos, fin, eventos }) {
  const partes = [];
  let salida = 0;
  for (let i = 0; i < tramos.length; i++) {
    const { t: desde, v } = tramos[i];
    const hasta = tramos[i + 1]?.t ?? fin;
    if (v <= 0 || hasta - desde < 0.03) continue;
    const cuadros = Math.max(1, Math.round(((hasta - desde) / v) * FPS));
    partes.push({ desde, hasta, v, cuadros, inicio: salida / FPS });
    salida += cuadros;
  }
  const duracion = salida / FPS;
  /** Tiempo de grabación → tiempo en el video final (un instante recortado cae al inicio del siguiente tramo). */
  const enVideo = (t) => {
    for (const p of partes) {
      if (t < p.desde) return p.inicio;
      if (t <= p.hasta) return Math.min(p.inicio + (t - p.desde) / p.v, p.inicio + p.cuadros / FPS);
    }
    return duracion;
  };

  const lista = [];
  for (const [i, p] of partes.entries()) {
    const archivo = `${TEMPORAL}/parte-${String(i).padStart(3, "0")}.mp4`;
    await ffmpeg([
      "-ss", p.desde.toFixed(3), "-i", crudo, "-t", (p.hasta - p.desde + 0.5).toFixed(3),
      "-vf", `setpts=(PTS-STARTPTS)/${p.v},fps=${FPS}`, "-frames:v", String(p.cuadros), "-an",
      "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p", archivo,
    ]);
    lista.push(`file '${archivo.split("/").pop()}'`);
  }
  writeFileSync(`${TEMPORAL}/lista.txt`, lista.join("\n"));

  const audio = `${TEMPORAL}/audio.wav`;
  writeFileSync(
    audio,
    renderizarAudio({
      duracion,
      eventos: eventos.map((e) => ({ tipo: e.tipo, t: enVideo(e.t) })),
      conMusica: !process.argv.includes("--sin-musica"),
    }),
  );

  await ffmpeg([
    "-f", "concat", "-safe", "0", "-i", `${TEMPORAL}/lista.txt`, "-i", audio,
    "-vf", `fade=t=in:st=0:d=0.25,fade=t=out:st=${(duracion - 0.5).toFixed(2)}:d=0.5,format=yuv420p`,
    "-af", "loudnorm=I=-15:TP=-1.5:LRA=11",
    "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "19",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", FINAL,
  ]);
  return duracion;
}

// ─── Guion ────────────────────────────────────────────────────────────────────

const ETIQUETA_DEMO = { vecina: "Vecina", rescatista: "Rescatista", municipio: "Municipio" };

async function entrarDemo(page, rol) {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: ETIQUETA_DEMO[rol], exact: true }).click();
  await page.waitForURL(`${BASE}/`);
}

async function main() {
  rmSync(TEMPORAL, { recursive: true, force: true });
  mkdirSync(TEMPORAL, { recursive: true });
  const crudo = `${TEMPORAL}/crudo.mp4`;

  const [gabrielaId, valeriaId] = await Promise.all([perfilId("Gabriela Ochoa"), perfilId("Valeria Leal")]);
  // Un caso urgente para el panel del rescatista.
  await crearAnimal({
    especie: "perro", apodo: "Bombón", urgencia: 5, condiciones: ["herido"],
    rasgos: "Perro mediano negro, cojea de la pata trasera",
    lat: 25.6641, lng: -100.4019, foto: "/placeholders/perro-6.svg", reportero: valeriaId, haceMin: 40,
  });

  const browser = await chromium.launch();
  try {
    // Rescatista "fuera de cámara": atiende el reporte de la vecina mientras ella mira la ficha.
    const fuera = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: "es-MX", serviceWorkers: "block" });
    const rescatistaFuera = await fuera.newPage();
    await entrarDemo(rescatistaFuera, "rescatista");

    const contexto = await browser.newContext({
      viewport: VIDEO,
      locale: "es-MX",
      timezoneId: "America/Monterrey",
      geolocation: LUGAR_VECINA,
      permissions: ["geolocation"],
      serviceWorkers: "block",
    });
    // Dentro del teléfono: sin barras de desplazamiento ni el indicador de desarrollo de Next.
    await contexto.addInitScript(() => {
      if (window.top === window) return;
      const poner = () => {
        const s = document.createElement("style");
        s.textContent = "nextjs-portal{display:none!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}";
        document.documentElement.appendChild(s);
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poner, { once: true });
      else poner();
    });
    const page = await contexto.newPage();
    await page.route(`${BASE}/__demo__`, (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: HTML }));

    const grabacion = await iniciarGrabacion(page, crudo);
    const tramos = [{ t: 0, v: 0 }];
    const eventos = [];
    const velocidad = (v) => tramos.push({ t: grabacion.reloj(), v });
    const actual = () => tramos.at(-1).v;
    const sonido = (tipo, despues = 0) => eventos.push({ tipo, t: grabacion.reloj() + despues });
    /** Lo que pase dentro no sale en el video (esperas de red, logins, la IA pensando). */
    const sinTiempo = async (fn) => {
      const v = actual();
      velocidad(0);
      const r = await fn();
      velocidad(v);
      return r;
    };
    const acelerado = async (fn, v = RAPIDO) => {
      const antes = actual();
      velocidad(v);
      await fn();
      velocidad(antes);
    };

    await page.goto(`${BASE}/__demo__`);
    await page.evaluate(() => document.fonts.ready);
    const frame = page.frame({ name: "app" });
    const app = page.frameLocator("#app");
    const nav = app.getByRole("navigation", { name: "Navegación principal" });

    // ── Ayudantes de cámara ──
    const centro = async (loc) => {
      const b = await loc.boundingBox();
      return [b.x + b.width / 2, b.y + b.height / 2];
    };
    const ocultarDedo = () => page.evaluate(() => window.ocultarDedo());
    /** Centra el elemento (acelerado) si queda fuera de la pantalla del teléfono o bajo la barra inferior. */
    const enPantalla = async (loc) => {
      await loc.waitFor({ state: "visible", timeout: 30_000 });
      const fuera = await loc.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top < 70 || r.bottom > innerHeight - 96;
      });
      if (!fuera) return;
      await acelerado(async () => {
        await ocultarDedo();
        await loc.evaluate((el) => {
          const r = el.getBoundingClientRect();
          window.scrollBy({ top: r.top - innerHeight / 2 + r.height / 2, behavior: "smooth" });
        });
        await pausa(850);
      });
    };
    const senalar = async (loc, { fijo = false, espera = 600 } = {}) => {
      if (!fijo) await enPantalla(loc);
      const [x, y] = await centro(loc);
      await page.evaluate(([x, y]) => window.dedo(x, y), [x, y]);
      await page.mouse.move(x, y, { steps: 6 });
      await pausa(espera);
      return [x, y];
    };
    const tocar = async (loc, { fijo = false, despues = 600 } = {}) => {
      const [x, y] = await senalar(loc, { fijo, espera: 460 });
      await page.evaluate(([x, y]) => window.toque(x, y), [x, y]);
      sonido("toque");
      await page.mouse.click(x, y);
      await pausa(despues);
    };
    const desplazarA = (loc, ajuste = 0) =>
      acelerado(async () => {
        await loc.waitFor({ state: "visible", timeout: 30_000 });
        await ocultarDedo();
        await loc.evaluate((el, ajuste) => {
          const r = el.getBoundingClientRect();
          window.scrollBy({ top: r.top - 80 + ajuste, behavior: "smooth" });
        }, ajuste);
        await pausa(950);
      });
    let numero = 0;
    const escena = async () => {
      numero++;
      sonido("whoosh");
      await page.evaluate((e) => window.escena(e), { ...ESCENAS[numero - 1], n: numero, total: ESCENAS.length });
      await pausa(450);
    };
    const cortina = async (html) => {
      await ocultarDedo();
      await page.evaluate((h) => window.cortina(h), html);
    };
    const acercar = (si) => page.evaluate((si) => window.acercar(si), si);
    const cambiarDeRol = async (rol, Icono, frase, ruta, listo) => {
      sonido("whoosh");
      await cortina(cambioDeRol(ROLES[rol], Icono, frase));
      await pausa(1250);
      await sinTiempo(async () => {
        await contexto.clearCookies();
        await frame.goto(`${BASE}/login`);
        await app.getByRole("button", { name: ETIQUETA_DEMO[rol], exact: true }).click();
        await frame.waitForURL(`${BASE}/`);
        await frame.goto(`${BASE}${ruta}`);
        await listo.waitFor({ timeout: 30_000 });
        await pausa(1500);
      });
      await cortina(null);
    };

    // La vecina entra antes de que empiece el video.
    await app.getByRole("button", { name: "Vecina", exact: true }).click();
    await app.locator(".cos-pin").first().waitFor({ timeout: 30_000 });
    await pausa(1500);

    // ── Portada ──
    velocidad(1);
    sonido("intro");
    await cortina(INTRO);
    await pausa(2500);
    await cortina(null);

    // ── 1. Mapa en vivo ──
    await escena();
    await pausa(700);
    await tocar(app.getByRole("button", { name: "Calor" }), { fijo: true, despues: 1200 });
    await tocar(app.getByRole("button", { name: "Calor" }), { fijo: true, despues: 150 });
    velocidad(1.4);
    await crearAnimal({
      especie: "gato", apodo: "Michi", urgencia: 2, condiciones: ["sano"], rasgos: "Gato blanco con manchas grises",
      lat: 25.6655, lng: -100.399, foto: "/placeholders/gato-2.svg", reportero: gabrielaId,
    });
    const avisoNuevo = app.getByRole("button", { name: /Nuevo reporte: gato/ });
    await avisoNuevo.waitFor({ timeout: 20_000 });
    sonido("pop");
    velocidad(1);
    await pausa(600);
    await tocar(avisoNuevo, { fijo: true, despues: 1100 });

    // ── 2. Reportar ──
    await escena();
    await tocar(app.getByRole("link", { name: "Reportar un animal" }), { fijo: true, despues: 0 });
    const tomarFoto = app.getByText("Toma una foto del animal");
    await sinTiempo(() => tomarFoto.waitFor());
    await pausa(250);
    const [selector] = await Promise.all([page.waitForEvent("filechooser"), tocar(tomarFoto, { despues: 0 })]);
    await selector.setFiles(await fotoDelPerro());
    await pausa(700);
    await sinTiempo(() => app.getByTestId("ai-resultado").waitFor({ timeout: 30_000 }));
    sonido("magia");
    await pausa(1700);
    await tocar(app.getByTestId("publicar"), { despues: 0 });
    await sinTiempo(async () => {
      await app.getByTestId("reporte-exitoso").waitFor({ timeout: 30_000 });
      await frame.evaluate(() => window.scrollTo(0, 0));
    });
    sonido("exito");
    sonido("monedas", 0.75);
    await ocultarDedo();
    await acercar(true);
    await pausa(2200);
    await acercar(false);

    // ── 3. El rescate llega en vivo ──
    await escena();
    const verFicha = app.getByRole("link", { name: "Ver ficha" });
    const nuevoId = (await verFicha.getAttribute("href")).split("/").pop();
    creados.push(nuevoId);
    await tocar(verFicha, { despues: 0 });
    await sinTiempo(() => app.getByTestId("ficha").waitFor());
    await pausa(900);
    await sinTiempo(async () => {
      await rescatistaFuera.goto(`${BASE}/animal/${nuevoId}`);
      await rescatistaFuera.getByTestId("acciones-rescate").getByRole("button", { name: "Cambiar estado" }).click();
      await rescatistaFuera.getByRole("radio", { name: /Rescatado/ }).click();
      await rescatistaFuera.getByPlaceholder("Nota para la comunidad (opcional)").fill("Ya está a salvo en el refugio.");
    });
    velocidad(1.3);
    await rescatistaFuera.getByTestId("guardar-estado").click();
    await app.getByTestId("aviso-huellas").waitFor({ timeout: 40_000 });
    sonido("aviso");
    velocidad(1);
    await ocultarDedo();
    await acercar(true);
    await pausa(2300);
    await acercar(false);

    // ── 4. Gamificación ──
    await escena();
    await tocar(nav.getByRole("link", { name: "Perfil" }), { fijo: true, despues: 0 });
    await sinTiempo(() => app.getByTestId("huellas").waitFor());
    sonido("monedas", 0.35);
    await pausa(1500);
    await desplazarA(app.getByTestId("insignias"), -40);
    await pausa(1000);
    await tocar(nav.getByRole("link", { name: "Ranking" }), { fijo: true, despues: 0 });
    await sinTiempo(() => app.getByTestId("ranking-vecinos").waitFor());
    await pausa(1400);

    // ── 5. Rescatista ──
    await contexto.setGeolocation(CENTRO);
    await cambiarDeRol("rescatista", HeartHandshake, "Atiende primero lo más urgente.", "/rescate", app.getByTestId("caso").first());
    await escena();
    await pausa(700);
    const bombon = app.getByTestId("caso").filter({ hasText: "Bombón" });
    await tocar(bombon.getByRole("button", { name: "Tomar caso" }), { despues: 0 });
    await sinTiempo(() => bombon.getByRole("button", { name: "Cambiar estado" }).waitFor());
    sonido("aviso");
    await pausa(900);
    await tocar(bombon.getByRole("button", { name: "Cambiar estado" }), { despues: 0 });
    sonido("desliza");
    await pausa(550);
    await tocar(app.getByRole("radio", { name: /Rescatado/ }), { fijo: true, despues: 250 });
    await tocar(app.getByTestId("guardar-estado"), { fijo: true, despues: 0 });
    await sinTiempo(() => app.getByRole("status").filter({ hasText: "ganó huellas" }).waitFor());
    sonido("exito");
    await ocultarDedo();
    await pausa(1700);

    // ── 6. Municipio ──
    await cambiarDeRol("municipio", ChartColumn, "Decide con datos en tiempo real.", "/municipio", app.getByTestId("kpi-valor").first());
    await escena();
    await pausa(1300);
    await desplazarA(app.getByRole("toolbar", { name: "Filtros del mapa" }));
    await tocar(app.getByRole("button", { name: "Chicas" }), { despues: 1300 });
    const grafica = app.locator("figure").first();
    await desplazarA(grafica);
    const meses = grafica.locator('g[role="img"]');
    const totalMeses = await meses.count();
    await senalar(meses.nth(totalMeses - 2), { fijo: true, espera: 700 });
    await senalar(meses.nth(totalMeses - 1), { fijo: true, espera: 900 });

    // ── Cierre ──
    sonido("final");
    await cortina(OUTRO);
    await pausa(3400);
    const fin = grabacion.reloj();
    await grabacion.detener();

    console.log("Editando…");
    const duracion = await editar({ crudo, tramos, fin, eventos });
    rmSync(TEMPORAL, { recursive: true, force: true });
    console.log(`Video: ${FINAL} (${duracion.toFixed(1)} s)`);
  } finally {
    await browser.close();
    await borrarCreados();
  }
}

main().catch(async (error) => {
  console.error(error);
  await borrarCreados().catch(() => {});
  process.exit(1);
});
