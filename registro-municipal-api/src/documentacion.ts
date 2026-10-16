/** Página de documentación (GET /): HTML autocontenido, sin dependencias externas. */
import { colonias, mascotas } from "./datos.js";

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** JSON seguro para incrustar dentro de <script>. */
const jsonEnScript = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

type Endpoint = {
  metodo: "GET" | "POST" | "DELETE";
  ruta: string;
  titulo: string;
  descripcion: string;
  publico?: boolean;
  ejemplo: { ruta: string; cuerpo?: object };
};

// "Canela" (Tampiquito) es una de las mascotas fijas de la demo (ver scripts/generar-datos.ts).
const FOLIO_EJEMPLO =
  mascotas.find((m) => m.nombre === "Canela" && m.colonia.nombre === "Tampiquito")?.folio ?? mascotas[0].folio;

const ENDPOINTS: Endpoint[] = [
  {
    metodo: "GET", ruta: "/salud", titulo: "Estado del servicio", publico: true,
    descripcion: "Comprueba que el servicio responde. No requiere clave.",
    ejemplo: { ruta: "/salud" },
  },
  {
    metodo: "GET", ruta: "/v1/colonias", titulo: "Catálogo de colonias",
    descripcion: "Colonias de San Pedro Garza García con clave (COL-###), centro aproximado, código postal y distrito del Plan de Desarrollo Urbano.",
    ejemplo: { ruta: "/v1/colonias" },
  },
  {
    metodo: "GET", ruta: "/v1/mascotas", titulo: "Buscar mascotas registradas",
    descripcion: "Filtros opcionales: especie (perro|gato), colonia (clave), q (texto libre en nombre, raza, color o folio), limit (1–100, 20 por defecto) y offset.",
    ejemplo: { ruta: "/v1/mascotas?especie=perro&q=mestizo&limit=3" },
  },
  {
    metodo: "GET", ruta: "/v1/mascotas/{folio}", titulo: "Mascota por folio",
    descripcion: "Ficha completa de una mascota. 404 si el folio no existe.",
    ejemplo: { ruta: `/v1/mascotas/${FOLIO_EJEMPLO}` },
  },
  {
    metodo: "GET", ruta: "/v1/mascotas/microchip/{numero}", titulo: "Mascota por microchip",
    descripcion: "Busca por el número de microchip de 15 dígitos (≈60 % de las mascotas tiene uno).",
    ejemplo: { ruta: `/v1/mascotas/microchip/${mascotas.find((m) => m.folio === FOLIO_EJEMPLO)?.microchip ?? "484000000000000"}` },
  },
  {
    metodo: "POST", ruta: "/v1/mascotas/coincidencias", titulo: "Coincidencias con un reporte",
    descripcion: "Compara un animal visto en la calle con el registro: especie obligatoria; raza, color, tamano, sexo, lat/lng o colonia opcionales. Devuelve puntaje 0–1 (≥ 0.35) y motivos.",
    ejemplo: {
      ruta: "/v1/mascotas/coincidencias",
      cuerpo: { especie: "perro", raza: "criollo", color: "café claro", tamano: "mediano", lat: 25.6512, lng: -100.3788 },
    },
  },
  {
    metodo: "POST", ruta: "/v1/avisos-propietario", titulo: "Avisar al propietario (SMS simulado)",
    descripcion: "Registra un aviso para la familia de la mascota. No se envía ningún mensaje real. Responde 202.",
    ejemplo: {
      ruta: "/v1/avisos-propietario",
      cuerpo: { folio: FOLIO_EJEMPLO, mensaje: "Hola, una vecina reportó a un perro parecido a Canela en Tampiquito.", referencia_externa: "https://callejeros.example/animal/123" },
    },
  },
  {
    metodo: "GET", ruta: "/v1/avisos-propietario", titulo: "Avisos enviados",
    descripcion: "Lista en memoria, los más recientes primero.",
    ejemplo: { ruta: "/v1/avisos-propietario" },
  },
  {
    metodo: "POST", ruta: "/v1/extravios", titulo: "Reportar extravío",
    descripcion: "Marca la mascota como \"extraviado\" (en memoria). Responde 201.",
    ejemplo: {
      ruta: "/v1/extravios",
      cuerpo: { folio: FOLIO_EJEMPLO, lat: 25.6528, lng: -100.3816, fecha: "2026-10-14T18:30:00-06:00" },
    },
  },
  {
    metodo: "DELETE", ruta: "/v1/extravios/{folio}", titulo: "Cerrar extravío",
    descripcion: "La mascota vuelve a estatus \"activo\".",
    ejemplo: { ruta: `/v1/extravios/${FOLIO_EJEMPLO}` },
  },
];

function curl(e: Endpoint, origen: string, clave: string) {
  const partes = [`curl${e.metodo === "GET" ? "" : ` -X ${e.metodo}`} "${origen}${e.ejemplo.ruta}"`];
  if (!e.publico) partes.push(`-H "X-Api-Key: ${clave}"`);
  if (e.ejemplo.cuerpo) {
    partes.push(`-H "Content-Type: application/json"`);
    partes.push(`-d '${JSON.stringify(e.ejemplo.cuerpo)}'`);
  }
  return partes.join(" \\\n  ");
}

export function paginaDocumentacion({ origen, claveDemo }: { origen: string; claveDemo: string | null }) {
  const clave = claveDemo ?? "TU_CLAVE";
  const perros = mascotas.filter((m) => m.especie === "perro").length;
  const tarjetas = ENDPOINTS.map(
    (e, i) => `
      <article class="endpoint" id="ep-${i}">
        <header>
          <span class="metodo ${e.metodo.toLowerCase()}">${e.metodo}</span>
          <code class="ruta">${escapar(e.ruta)}</code>
          ${e.publico ? '<span class="chip">pública</span>' : ""}
        </header>
        <h3>${escapar(e.titulo)}</h3>
        <p>${escapar(e.descripcion)}</p>
        <div class="codigo">
          <pre><code>${escapar(curl(e, origen, clave))}</code></pre>
          <div class="acciones">
            <button type="button" class="boton-sec" data-copiar="${i}">Copiar</button>
            <button type="button" class="boton-sec" data-probar="${i}">Probar ↓</button>
          </div>
        </div>
      </article>`,
  ).join("");

  const ejemplos = ENDPOINTS.map((e) => ({
    metodo: e.metodo,
    ruta: e.ejemplo.ruta,
    cuerpo: e.ejemplo.cuerpo ? JSON.stringify(e.ejemplo.cuerpo, null, 2) : "",
    titulo: e.titulo,
    curl: curl(e, origen, clave),
  }));

  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Registro de Mascotas · API (simulación)</title>
<meta name="description" content="Simulación del registro municipal de mascotas de San Pedro Garza García para CallejerOS. No es un servicio oficial.">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#14532d"/><g fill="#facc15"><circle cx="11" cy="12" r="2.6"/><circle cx="16" cy="9.5" r="2.6"/><circle cx="21" cy="12" r="2.6"/><path d="M16 15c-4 0-7 3.5-7 6.3 0 2 1.6 2.9 3.3 2.6 1.4-.3 2.4-.8 3.7-.8s2.3.5 3.7.8c1.7.3 3.3-.6 3.3-2.6 0-2.8-3-6.3-7-6.3z"/></g></svg>')}">
<style>
:root{
  --fondo:#f5f3ee; --superficie:#ffffff; --borde:#e2ddd2; --texto:#1c2321; --suave:#5b6560;
  --primario:#14532d; --primario-2:#1f7a45; --acento:#b45309; --oro:#facc15;
  --aviso-fondo:#fef3c7; --aviso-texto:#78350f; --aviso-borde:#f59e0b;
  --get:#1d4ed8; --post:#15803d; --delete:#b91c1c; --codigo:#0f1a14; --codigo-texto:#e6efe9;
  --sombra:0 1px 2px rgba(20,30,25,.06),0 8px 24px -12px rgba(20,30,25,.18);
}
@media (prefers-color-scheme: dark){
  :root{
    --fondo:#0e1411; --superficie:#151d19; --borde:#26332c; --texto:#e7eee9; --suave:#9fb0a6;
    --primario:#4ade80; --primario-2:#86efac; --acento:#fbbf24;
    --aviso-fondo:#3a2a06; --aviso-texto:#fde68a; --aviso-borde:#b45309;
    --get:#93c5fd; --post:#86efac; --delete:#fca5a5; --codigo:#0a0f0c; --codigo-texto:#d7e6dc;
    --sombra:0 1px 2px rgba(0,0,0,.4),0 8px 24px -12px rgba(0,0,0,.6);
  }
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--primario-2)}
code,pre,textarea,input,select{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
.aviso{background:var(--aviso-fondo);color:var(--aviso-texto);border-bottom:2px solid var(--aviso-borde);padding:10px 16px;text-align:center;font-weight:700;font-size:15px}
.aviso span{font-weight:500}
.cabecera{background:linear-gradient(135deg,#0f3d22,#14532d 55%,#1f6b3c);color:#fff;padding:36px 0 72px}
.contenedor{max-width:1040px;margin:0 auto;padding:0 16px}
.marca{display:flex;align-items:center;gap:14px}
.escudo{width:52px;height:58px;flex:none}
.marca small{display:block;opacity:.85;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.marca strong{display:block;font-size:clamp(22px,4vw,30px);line-height:1.15}
.cabecera p.lema{max-width:680px;opacity:.92;margin:18px 0 0}
.etiquetas{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.etiquetas span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:4px 12px;font-size:13px}
.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:-44px}
.cifra{background:var(--superficie);border:1px solid var(--borde);border-radius:14px;padding:16px;box-shadow:var(--sombra)}
.cifra b{display:block;font-size:28px;color:var(--primario)}
.cifra span{color:var(--suave);font-size:14px}
section{margin:40px 0}
h2{font-size:22px;margin:0 0 6px}
h2+p{color:var(--suave);margin:0 0 18px}
.panel{background:var(--superficie);border:1px solid var(--borde);border-radius:14px;padding:18px;box-shadow:var(--sombra)}
.auth{display:grid;gap:10px}
.auth code{background:var(--fondo);border:1px solid var(--borde);border-radius:6px;padding:2px 6px;font-size:14px;word-break:break-all}
.endpoints{display:grid;gap:14px}
.endpoint{background:var(--superficie);border:1px solid var(--borde);border-radius:14px;padding:16px;box-shadow:var(--sombra);min-width:0}
.endpoint header{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.endpoint h3{margin:10px 0 4px;font-size:17px}
.endpoint p{margin:0 0 12px;color:var(--suave);font-size:15px}
.metodo{font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;padding:6px 8px;border-radius:6px;color:#fff;letter-spacing:.04em}
.metodo.get{background:var(--get)} .metodo.post{background:var(--post)} .metodo.delete{background:var(--delete)}
@media (prefers-color-scheme: dark){.metodo{color:#0b0f0d}}
.ruta{font-size:15px;font-weight:600;word-break:break-all}
.chip{font-size:12px;border:1px solid var(--borde);border-radius:999px;padding:2px 8px;color:var(--suave)}
.codigo{position:relative;background:var(--codigo);border-radius:10px;overflow:hidden}
.codigo pre{margin:0;padding:14px;overflow-x:auto;color:var(--codigo-texto);font-size:13px;line-height:1.5}
.acciones{display:flex;gap:8px;justify-content:flex-end;padding:0 10px 10px}
button{font:inherit;cursor:pointer}
.boton-sec{background:transparent;color:var(--codigo-texto);border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:5px 10px;font-size:13px}
.boton-sec:hover{background:rgba(255,255,255,.08)}
.boton{background:var(--primario);color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700}
@media (prefers-color-scheme: dark){.boton{color:#06210f}}
.boton:disabled{opacity:.6;cursor:wait}
.probar{display:grid;gap:12px}
.fila{display:grid;grid-template-columns:120px 1fr;gap:10px}
label{font-size:13px;font-weight:600;color:var(--suave);display:block;margin-bottom:4px}
input,select,textarea{width:100%;background:var(--fondo);color:var(--texto);border:1px solid var(--borde);border-radius:8px;padding:9px 10px;font-size:14px}
textarea{min-height:130px;resize:vertical}
.respuesta{background:var(--codigo);color:var(--codigo-texto);border-radius:10px;padding:14px;font-size:13px;max-height:460px;overflow:auto;white-space:pre-wrap;word-break:break-word;margin:0}
.estado{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:14px;color:var(--suave)}
.estado b{color:var(--texto)}
.ok{color:var(--post)!important} .mal{color:var(--delete)!important}
.fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.fotos img{width:100%;aspect-ratio:4/3;border-radius:8px;border:1px solid var(--borde);background:var(--fondo)}
footer{border-top:1px solid var(--borde);padding:24px 0 48px;color:var(--suave);font-size:14px}
footer ul{padding-left:18px}
@media (max-width:640px){.fila{grid-template-columns:1fr}.cabecera{padding-top:28px}}
</style>
</head>
<body>
<div class="aviso" role="note">Simulación — no es un servicio oficial del municipio. <span>Datos de mascotas y propietarios ficticios.</span></div>
<header class="cabecera">
  <div class="contenedor">
    <div class="marca">
      <svg class="escudo" viewBox="0 0 52 58" aria-hidden="true"><path d="M26 2 48 9v18c0 14-9.5 24-22 29C13.5 51 4 41 4 27V9z" fill="#facc15"/><path d="M26 7 43 12.5V27c0 11-7.3 19-17 23.3C16.3 46 9 38 9 27V12.5z" fill="#14532d"/><g fill="#facc15"><circle cx="19" cy="23" r="3.2"/><circle cx="26" cy="19.5" r="3.2"/><circle cx="33" cy="23" r="3.2"/><path d="M26 27.5c-5.5 0-9.5 4.8-9.5 8.6 0 2.7 2.2 4 4.5 3.6 1.9-.4 3.2-1.1 5-1.1s3.1.7 5 1.1c2.3.4 4.5-.9 4.5-3.6 0-3.8-4-8.6-9.5-8.6z"/></g></svg>
      <div><small>San Pedro Garza García, N. L. · Entorno de pruebas</small><strong>Registro Municipal de Mascotas · API</strong></div>
    </div>
    <p class="lema">API de demostración para que <b>CallejerOS</b> consulte el padrón de mascotas, busque coincidencias con animales reportados en la calle y avise a sus familias. Todas las respuestas incluyen el encabezado <code>X-Simulacion: true</code>.</p>
    <div class="etiquetas"><span>v1.0.0</span><span>JSON · CORS abierto</span><span><a href="/openapi.json" style="color:#fff">OpenAPI 3.1</a></span><span>Estado en memoria</span></div>
  </div>
</header>

<main class="contenedor">
  <div class="cifras">
    <div class="cifra"><b>${colonias.length}</b><span>colonias en el catálogo</span></div>
    <div class="cifra"><b>${mascotas.length}</b><span>mascotas ficticias registradas</span></div>
    <div class="cifra"><b>${perros}</b><span>perros</span></div>
    <div class="cifra"><b>${mascotas.length - perros}</b><span>gatos</span></div>
  </div>

  <section>
    <h2>Autenticación</h2>
    <p>Envía tu clave en el encabezado <code>X-Api-Key</code>. <code>/</code>, <code>/salud</code>, <code>/openapi.json</code> y <code>/fotos/*</code> son públicas.</p>
    <div class="panel auth">
      <div>URL base: <code>${escapar(origen)}</code></div>
      ${
        claveDemo
          ? `<div>Clave de demostración (activa porque <code>REGISTRO_API_KEY</code> no está definida): <code>${escapar(claveDemo)}</code></div>`
          : `<div>Este despliegue usa una clave propia definida en <code>REGISTRO_API_KEY</code>. Pídela al equipo de CallejerOS.</div>`
      }
      <div>Sin clave o con una clave incorrecta la respuesta es <code>401 {"error": "…"}</code>.</div>
    </div>
  </section>

  <section>
    <h2>Endpoints</h2>
    <p>Ejemplos listos para copiar; el botón «Probar» los carga en la consola de abajo.</p>
    <div class="endpoints">${tarjetas}</div>
  </section>

  <section id="probar">
    <h2>Probar en vivo</h2>
    <p>Hace la petición desde tu navegador contra este mismo servicio.</p>
    <form class="panel probar" id="formulario">
      <div><label for="ejemplo">Ejemplo</label><select id="ejemplo"></select></div>
      <div class="fila">
        <div><label for="metodo">Método</label><select id="metodo"><option>GET</option><option>POST</option><option>DELETE</option></select></div>
        <div><label for="ruta">Ruta</label><input id="ruta" autocomplete="off" spellcheck="false"></div>
      </div>
      <div><label for="clave">X-Api-Key</label><input id="clave" autocomplete="off" spellcheck="false" value="${escapar(claveDemo ?? "")}" placeholder="Tu clave"></div>
      <div><label for="cuerpo">Cuerpo JSON (POST)</label><textarea id="cuerpo" spellcheck="false"></textarea></div>
      <div><button class="boton" id="enviar" type="submit">Enviar petición</button></div>
      <div class="estado" id="estado" aria-live="polite">Sin enviar.</div>
      <pre class="respuesta" id="respuesta">—</pre>
    </form>
  </section>

  <section>
    <h2>Ilustraciones</h2>
    <p>Las mascotas reutilizan estas ilustraciones (<code>/fotos/*.svg</code>); su raza y color en el registro coinciden con el dibujo.</p>
    <div class="panel fotos">
      ${["perro-1", "perro-2", "perro-3", "perro-4", "perro-5", "perro-6", "perro-7", "perro-8", "gato-1", "gato-2", "gato-3", "gato-4", "gato-5", "gato-6", "gato-siames"]
        .map((f) => `<img src="/fotos/${f}.svg" alt="${f}" loading="lazy" width="120" height="90">`)
        .join("")}
    </div>
  </section>
</main>

<footer>
  <div class="contenedor">
    <p><b>Simulación — no es un servicio oficial del municipio de San Pedro Garza García.</b> Los nombres de propietarios, teléfonos, mascotas y folios son ficticios; no se envía ningún SMS.</p>
    <p>Fuentes del catálogo de colonias:</p>
    <ul>
      <li>Plan de Desarrollo Urbano Municipal San Pedro Garza García 2024 — Diagnóstico y pronóstico (colonias por distrito).</li>
      <li>Catálogo Nacional de Códigos Postales, Correos de México (SEPOMEX).</li>
      <li>© colaboradores de OpenStreetMap (ODbL) — centros de colonias vía Overpass y Nominatim.</li>
      <li>Polígonos de códigos postales: repositorio open-mexico/mexico-geojson.</li>
    </ul>
  </div>
</footer>

<script>
const EJEMPLOS = ${jsonEnScript(ejemplos)};
const $ = (id) => document.getElementById(id);
const sel = $("ejemplo");
EJEMPLOS.forEach((e, i) => { const o = document.createElement("option"); o.value = i; o.textContent = e.metodo + " " + e.ruta.split("?")[0] + " — " + e.titulo; sel.appendChild(o); });
function cargar(i) { const e = EJEMPLOS[i]; sel.value = i; $("metodo").value = e.metodo; $("ruta").value = e.ruta; $("cuerpo").value = e.cuerpo; }
sel.addEventListener("change", () => cargar(Number(sel.value)));
cargar(5);
document.querySelectorAll("[data-probar]").forEach((b) => b.addEventListener("click", () => { cargar(Number(b.dataset.probar)); $("probar").scrollIntoView({ behavior: "smooth" }); }));
document.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(EJEMPLOS[Number(b.dataset.copiar)].curl); b.textContent = "Copiado"; } catch { b.textContent = "No se pudo copiar"; }
  setTimeout(() => (b.textContent = "Copiar"), 1500);
}));
$("formulario").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const metodo = $("metodo").value, ruta = $("ruta").value.trim() || "/";
  const opciones = { method: metodo, headers: {} };
  if ($("clave").value.trim()) opciones.headers["X-Api-Key"] = $("clave").value.trim();
  if (metodo === "POST") { opciones.headers["Content-Type"] = "application/json"; opciones.body = $("cuerpo").value; }
  $("enviar").disabled = true; $("estado").textContent = "Enviando…";
  const inicio = performance.now();
  try {
    const r = await fetch(ruta.startsWith("/") ? ruta : "/" + ruta, opciones);
    const ms = Math.round(performance.now() - inicio);
    const tipo = r.headers.get("content-type") || "";
    const texto = await r.text();
    let salida = texto;
    if (tipo.includes("json")) { try { salida = JSON.stringify(JSON.parse(texto), null, 2); } catch {} }
    $("estado").innerHTML = '<b class="' + (r.ok ? "ok" : "mal") + '">' + r.status + " " + r.statusText + "</b><span>" + ms + " ms</span><span>X-Simulacion: " + (r.headers.get("x-simulacion") ?? "—") + "</span>";
    $("respuesta").textContent = salida.length > 60000 ? salida.slice(0, 60000) + "\\n… (recortado)" : salida;
  } catch (err) {
    $("estado").innerHTML = '<b class="mal">Error de red</b>';
    $("respuesta").textContent = String(err);
  } finally { $("enviar").disabled = false; }
});
</script>
</body>
</html>`;
}
