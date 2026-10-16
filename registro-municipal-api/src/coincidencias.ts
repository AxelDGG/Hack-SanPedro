/**
 * Búsqueda de coincidencias: compara la descripción de un animal reportado en la
 * calle con las mascotas registradas y devuelve las más parecidas.
 *
 * Puntaje (0..1) = promedio ponderado de los criterios que se envían:
 *   raza 0.25 · color 0.30 · tamaño 0.10 · sexo 0.10 · ubicación 0.25
 * La especie es filtro obligatorio. Una mascota reportada como extraviada por su
 * familia recibe +0.10 (es la coincidencia más valiosa). Sólo se devuelven
 * resultados con puntaje >= 0.35.
 */
import { coloniaPorClave, estatusDe } from "./datos.js";
import type { Especie, MascotaRegistro, Sexo, Tamano } from "./tipos.js";

export type Consulta = {
  especie: Especie;
  raza?: string;
  color?: string;
  tamano?: Tamano;
  sexo?: Sexo;
  lat?: number;
  lng?: number;
  colonia?: string;
  limite?: number;
};

export type Resultado = { mascota: MascotaRegistro; puntaje: number; motivos: string[] };

export const PUNTAJE_MINIMO = 0.35;
const PESOS = { raza: 0.25, color: 0.3, tamano: 0.1, sexo: 0.1, ubicacion: 0.25 };
const BONO_EXTRAVIADA = 0.1;
const MEDIA_DISTANCIA_KM = 1.5; // a 1.5 km el criterio de ubicación vale la mitad

export function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Raza
// ---------------------------------------------------------------------------
const SINONIMOS_RAZA: [string, string[]][] = [
  ["mestizo", ["mestizo", "mestiza", "criollo", "criolla", "cruza", "sin raza", "callejero", "callejera", "corriente", "mezcla", "mixto", "mix", "cruzado"]],
  ["domestico pelo corto", ["domestico pelo corto", "domestico", "domestica", "comun", "europeo", "pelo corto"]],
  ["french poodle", ["french poodle", "poodle", "caniche", "french"]],
  ["pastor aleman", ["pastor aleman", "pastor", "german shepherd"]],
  ["labrador", ["labrador retriever", "labrador", "lab"]],
  ["golden retriever", ["golden retriever", "golden"]],
  ["husky", ["husky siberiano", "siberian husky", "husky"]],
  ["pitbull", ["pitbull", "pit bull", "american pitbull", "pit"]],
  ["yorkshire", ["yorkshire terrier", "yorkshire", "yorkie"]],
  ["bulldog frances", ["bulldog frances", "french bulldog", "frenchie"]],
  ["dachshund", ["dachshund", "salchicha", "teckel"]],
  ["shih tzu", ["shih tzu", "shitzu", "shih"]],
  ["schnauzer", ["schnauzer miniatura", "schnauzer", "schnauser"]],
  ["chihuahua", ["chihuahua", "chihuahueno", "chiwawa"]],
  ["pug", ["pug", "carlino"]],
  ["beagle", ["beagle"]],
  ["siames", ["siames", "siamesa", "siamese"]],
  ["persa", ["persa", "persian"]],
  ["angora", ["angora turco", "angora"]],
  ["bengali", ["bengali", "bengal"]],
  ["maine coon", ["maine coon", "maine"]],
];
const SIN_RAZA = new Set(["mestizo", "domestico pelo corto"]);

function canonRaza(raza: string) {
  const n = normalizar(raza);
  for (const [canon, variantes] of SINONIMOS_RAZA) {
    if (variantes.some((v) => n === v || n.startsWith(`${v} `) || n.endsWith(` ${v}`))) return canon;
  }
  // "criollo", "cruza de …" en cualquier parte del texto
  if (/\b(cruza|mestiz|criol|mezcla)/.test(n)) return "mestizo";
  return n;
}

function bigramas(s: string) {
  const t = ` ${s} `;
  const r: string[] = [];
  for (let i = 0; i < t.length - 1; i++) r.push(t.slice(i, i + 2));
  return r;
}

/** Coeficiente de Dice sobre bigramas: tolera errores de dedo ("chiuahua"). */
function dice(a: string, b: string) {
  if (!a || !b) return 0;
  const ba = bigramas(a);
  const bb = bigramas(b);
  const conteo = new Map<string, number>();
  for (const x of ba) conteo.set(x, (conteo.get(x) ?? 0) + 1);
  let comunes = 0;
  for (const x of bb) {
    const n = conteo.get(x) ?? 0;
    if (n > 0) {
      comunes++;
      conteo.set(x, n - 1);
    }
  }
  return (2 * comunes) / (ba.length + bb.length);
}

export function similitudRaza(consulta: string, registrada: string) {
  const a = canonRaza(consulta);
  const b = canonRaza(registrada);
  if (a === b) return 1;
  // Mestizo vs. raza definida: la gente confunde cruzas con razas puras.
  if (SIN_RAZA.has(a) || SIN_RAZA.has(b)) return 0.25;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const d = dice(a, b);
  return d >= 0.6 ? d : 0;
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
const FAMILIAS_COLOR: [string, string[]][] = [
  ["negro", ["negro", "negra", "azabache"]],
  ["blanco", ["blanco", "blanca", "nieve"]],
  ["gris", ["gris", "grisaceo", "plata", "plateado", "ceniza", "plomo", "sal y pimienta", "azulado", "azul"]],
  ["cafe", ["cafe", "marron", "chocolate", "castano", "cafecito", "higado"]],
  ["canela", ["canela", "caramelo", "leonado", "fuego", "tostado"]],
  ["beige", ["beige", "arena", "bayo"]],
  ["crema", ["crema", "hueso", "marfil"]],
  ["dorado", ["dorado", "dorada", "amarillo", "amarilla", "rubio", "guero", "miel"]],
  ["rojizo", ["rojizo", "rojiza", "rojo", "roja", "colorado", "cobrizo", "pelirrojo"]],
  ["naranja", ["naranja", "anaranjado", "anaranjada", "mandarina"]],
  ["atigrado", ["atigrado", "atigrada", "rayado", "rayada", "rayas", "tabby", "rosetas", "brindle"]],
  ["tricolor", ["tricolor", "calico", "carey"]],
  ["manchado", ["manchas", "manchado", "manchada", "pinto", "pinta", "moteado"]],
  ["puntas", ["puntas", "point", "mascara"]],
];
const PATRONES = new Set(["atigrado", "tricolor", "manchado", "puntas"]);

// Parecido entre familias distintas (simétrico).
const PARECIDO: Record<string, number> = {
  "cafe|canela": 0.6, "canela|beige": 0.7, "beige|crema": 0.8, "crema|blanco": 0.5, "canela|dorado": 0.6,
  "beige|dorado": 0.6, "crema|dorado": 0.5, "rojizo|cafe": 0.5, "rojizo|canela": 0.6, "rojizo|naranja": 0.6,
  "naranja|dorado": 0.4, "naranja|canela": 0.4, "gris|blanco": 0.2, "gris|negro": 0.2, "cafe|negro": 0.15,
  "manchado|tricolor": 0.5, "atigrado|manchado": 0.3,
};
function parecido(a: string, b: string) {
  if (a === b) return 1;
  return PARECIDO[`${a}|${b}`] ?? PARECIDO[`${b}|${a}`] ?? 0;
}

export function familiasColor(color: string) {
  const n = ` ${normalizar(color)} `;
  const fams = new Set<string>();
  for (const [familia, palabras] of FAMILIAS_COLOR) {
    if (palabras.some((p) => n.includes(` ${p} `) || n.includes(` ${p}s `) || n.includes(` ${p}es `))) fams.add(familia);
  }
  return fams;
}

function tono(color: string) {
  const n = ` ${normalizar(color)} `;
  if (/ (claro|clara|bajito) /.test(n)) return "claro";
  if (/ (oscuro|oscura|fuerte) /.test(n)) return "oscuro";
  return null;
}

function cobertura(desde: Set<string>, hacia: Set<string>) {
  let suma = 0;
  let pesos = 0;
  for (const f of desde) {
    const peso = PATRONES.has(f) ? 0.5 : 1;
    let mejor = 0;
    for (const g of hacia) mejor = Math.max(mejor, parecido(f, g));
    suma += peso * mejor;
    pesos += peso;
  }
  return pesos ? suma / pesos : 0;
}

export function similitudColor(consulta: string, registrado: string) {
  const a = familiasColor(consulta);
  const b = familiasColor(registrado);
  if (a.size === 0 || b.size === 0) return dice(normalizar(consulta), normalizar(registrado)) >= 0.7 ? 0.7 : 0;
  const s = (cobertura(a, b) + cobertura(b, a)) / 2;
  // "café claro" vs. "café oscuro": misma familia, tono distinto.
  const ta = tono(consulta);
  const tb = tono(registrado);
  return ta && tb && ta !== tb ? s * 0.85 : s;
}

// ---------------------------------------------------------------------------
// Ubicación
// ---------------------------------------------------------------------------
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function textoDistancia(km: number) {
  if (km < 1) return `${Math.max(100, Math.round(km * 10) * 100)} m`;
  return `${km.toFixed(1)} km`;
}

const ORDEN_TAMANO: Tamano[] = ["chico", "mediano", "grande"];

// ---------------------------------------------------------------------------
// Puntaje
// ---------------------------------------------------------------------------
export function buscarCoincidencias(consulta: Consulta, mascotas: MascotaRegistro[]): Resultado[] {
  const origenColonia = consulta.colonia ? coloniaPorClave.get(consulta.colonia) : undefined;
  const tienePunto = consulta.lat != null && consulta.lng != null;
  const resultados: Resultado[] = [];

  for (const m of mascotas) {
    if (m.especie !== consulta.especie) continue;
    let suma = 0;
    let pesos = 0;
    const motivos: string[] = [];

    if (consulta.raza) {
      const s = similitudRaza(consulta.raza, m.raza);
      suma += PESOS.raza * s;
      pesos += PESOS.raza;
      if (s >= 0.95) motivos.push("Misma raza");
      else if (s >= 0.5) motivos.push("Raza parecida");
    }
    if (consulta.color) {
      const s = similitudColor(consulta.color, m.color);
      suma += PESOS.color * s;
      pesos += PESOS.color;
      if (s >= 0.95) motivos.push("Mismo color");
      else if (s >= 0.5) motivos.push("Color parecido");
    }
    if (consulta.tamano) {
      const dif = Math.abs(ORDEN_TAMANO.indexOf(consulta.tamano) - ORDEN_TAMANO.indexOf(m.tamano));
      const s = dif === 0 ? 1 : dif === 1 ? 0.4 : 0;
      suma += PESOS.tamano * s;
      pesos += PESOS.tamano;
      if (dif === 0) motivos.push("Mismo tamaño");
    }
    if (consulta.sexo) {
      const s = consulta.sexo === m.sexo ? 1 : 0;
      suma += PESOS.sexo * s;
      pesos += PESOS.sexo;
      if (s) motivos.push("Mismo sexo");
    }
    if (tienePunto || consulta.colonia) {
      const centro = coloniaPorClave.get(m.colonia.clave);
      let s = 0;
      let motivo: string | null = null;
      if (consulta.colonia && consulta.colonia === m.colonia.clave) {
        s = 1;
        motivo = `Registrada en la misma colonia (${m.colonia.nombre})`;
      }
      const referencia = tienePunto ? { lat: consulta.lat!, lng: consulta.lng! } : origenColonia;
      if (centro && referencia) {
        const km = distanciaKm(referencia.lat, referencia.lng, centro.lat, centro.lng);
        const decaimiento = Math.pow(0.5, km / MEDIA_DISTANCIA_KM);
        if (decaimiento > s) {
          s = decaimiento;
          if (km <= 5) motivo = `Registrada a ${textoDistancia(km)}`;
        }
      }
      suma += PESOS.ubicacion * s;
      pesos += PESOS.ubicacion;
      if (motivo) motivos.push(motivo);
    }

    if (pesos === 0) continue;
    let puntaje = suma / pesos;
    if (estatusDe(m) === "extraviado") {
      puntaje = Math.min(1, puntaje + BONO_EXTRAVIADA);
      motivos.push("Su familia reportó su extravío");
    }
    puntaje = Math.round(puntaje * 100) / 100;
    if (puntaje >= PUNTAJE_MINIMO) resultados.push({ mascota: m, puntaje, motivos });
  }

  return resultados
    .sort((a, b) => b.puntaje - a.puntaje || (a.mascota.folio < b.mascota.folio ? -1 : 1))
    .slice(0, consulta.limite ?? 5);
}
