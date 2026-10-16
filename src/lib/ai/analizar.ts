import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AnalisisSchema,
  PublicacionSchema,
  normalizarAnalisis,
  type Analisis,
  type Publicacion,
  type RespuestaAnalisis,
} from "./schema";
import { distanciaHuellas } from "@/lib/image/huella";
import FOTOS_DEMO from "./huellas-demo.json";

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

const SISTEMA = `Eres el asistente de CallejerOS, la red de San Pedro Garza García (México) que centraliza los reportes de perros y gatos perdidos, encontrados y en situación de calle.
Recibes la foto que un vecino tomó (o reenvió de un grupo de WhatsApp o Facebook). Llena la ficha para que otros vecinos lo reconozcan y un rescatista pueda priorizar el caso.
Muchos usuarios son personas mayores: tus datos se usan para que no tengan que escribir. Sé concreto: raza, color, tamaño y señas que sirvan para distinguirlo de otros animales parecidos.

Escala de urgencia:
1 = se ve sano y tranquilo, sin riesgo aparente
2 = sano pero en la calle, sin dueño visible
3 = flaco, descuidado o con pelaje en mal estado
4 = herido visible, cachorro solo o en peligro inmediato (por ejemplo, en una avenida)
5 = herida grave, sangrado, no puede moverse o está en peligro de muerte

Solo atendemos perros y gatos. Si en la foto no hay un perro ni un gato (otro animal, una persona, un objeto), responde es_animal = false y usa valores neutros (especie "perro", raza "", color "", urgencia 1, confianza baja).
Si la foto es una captura de pantalla de una publicación, analiza al animal que aparece en ella.
Escribe todo en español, en tono claro y sin alarmismo.`;

const SISTEMA_PUBLICACION = `Eres el asistente de CallejerOS, la red de San Pedro Garza García (México) que centraliza los avisos de perros y gatos que circulan en grupos de WhatsApp, Facebook e Instagram.
Recibes el texto de una publicación copiada de un grupo. Extrae los datos para crear el reporte sin que la persona tenga que escribir.
No inventes: si un dato no aparece, déjalo vacío o "desconocido". El teléfono va solo con dígitos (10 dígitos de México, sin +52).`;

let cliente: Anthropic | null = null;

/** El análisis real solo corre con API key y modelo configurados y AI_MOCK distinto de "true". */
export function iaHabilitada() {
  return process.env.AI_MOCK !== "true" && !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;
}

/** Huella y color promedio que calcula el navegador; solo los usa el análisis simulado. */
export interface PistasFoto {
  huella: number | null;
  color: [number, number, number] | null;
}

export async function analizarFoto(imagen: Buffer, tipo: TipoImagen, pistas?: PistasFoto): Promise<RespuestaAnalisis> {
  if (!iaHabilitada()) return analisisSimulado(imagen, pistas);

  const modelo = process.env.ANTHROPIC_MODEL!;
  cliente ??= new Anthropic();

  const respuesta = await cliente.messages.parse(
    {
      model: modelo,
      // Holgado a propósito: Haiku 5.5 siempre piensa un poco y eso cuenta dentro de max_tokens;
      // solo se cobra lo que se usa (unos cientos de tokens por foto).
      max_tokens: 8000,
      system: SISTEMA,
      // Clasificar una foto no requiere razonamiento profundo: esfuerzo bajo = más rápido y barato.
      output_config: { effort: "low", format: zodOutputFormat(AnalisisSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipo, data: imagen.toString("base64") } },
            { type: "text", text: "Analiza este avistamiento." },
          ],
        },
      ],
    },
    { timeout: 25_000, maxRetries: 1 },
  );

  if (respuesta.stop_reason === "refusal") throw new Error("La IA no pudo analizar esta foto.");
  if (!respuesta.parsed_output) throw new Error("La IA devolvió una respuesta incompleta.");

  return { analisis: normalizarAnalisis(respuesta.parsed_output), fuente: "ia", modelo };
}

/**
 * Respuesta plausible sin llamar a la API (desarrollo y demo sin key). Si la foto es una de las
 * ilustraciones demo la "reconoce": el color promedio la identifica y la huella confirma la forma
 * (entre el navegador y el script que generó las huellas varían unos bits, el color casi nada).
 * Con cualquier otra foto elige una respuesta de ejemplo según la imagen.
 */
async function analisisSimulado(imagen: Buffer, pistas?: PistasFoto): Promise<RespuestaAnalisis> {
  await new Promise((r) => setTimeout(r, 1200));
  const { huella, color } = pistas ?? {};
  if (huella && color) {
    const demo = (FOTOS_DEMO as { huella: number; color: number[]; analisis: Analisis }[])
      .map((d) => ({ d, tono: Math.hypot(...d.color.map((c, i) => c - color[i])), bits: distanciaHuellas(d.huella, huella) }))
      .filter(({ tono, bits }) => tono <= 12 && bits <= 16)
      .sort((a, b) => a.tono - b.tono)[0];
    if (demo) return { analisis: demo.d.analisis, fuente: "simulado" };
  }
  let h = 0;
  for (let i = 0; i < imagen.length; i += 997) h = (h * 31 + imagen[i]) >>> 0;

  const opciones: Analisis[] = [
    {
      es_animal: true,
      especie: "perro",
      raza: "Mestizo",
      color: "café claro",
      tamano: "mediano",
      sexo: "desconocido",
      collar: false,
      rasgos: "Orejas caídas, mancha oscura en el ojo, sin collar",
      condiciones: ["flaco"],
      urgencia: 3,
      confianza: 0.86,
      resumen: "Perro adulto delgado, camina bien pero se nota con hambre.",
    },
    {
      es_animal: true,
      especie: "perro",
      raza: "Mestizo",
      color: "negro con pecho blanco",
      tamano: "chico",
      sexo: "desconocido",
      collar: false,
      rasgos: "Cachorro de patas blancas y orejas paradas",
      condiciones: ["cachorro", "flaco"],
      urgencia: 4,
      confianza: 0.81,
      resumen: "Cachorro solo cerca de la banqueta; conviene atenderlo pronto.",
    },
    {
      es_animal: true,
      especie: "gato",
      raza: "Doméstico pelo corto",
      color: "naranja atigrado",
      tamano: "mediano",
      sexo: "macho",
      collar: false,
      rasgos: "Ojos verdes, punta de la cola blanca",
      condiciones: ["sano"],
      urgencia: 2,
      confianza: 0.9,
      resumen: "Gato adulto en buen estado aparente, descansando.",
    },
    {
      es_animal: true,
      especie: "perro",
      raza: "Schnauzer",
      color: "gris",
      tamano: "chico",
      sexo: "hembra",
      collar: true,
      rasgos: "Barba gris, collar rojo, bien cuidada: parece tener dueño",
      condiciones: ["sano"],
      urgencia: 2,
      confianza: 0.84,
      resumen: "Perrita de raza con collar, desorientada; probablemente está perdida.",
    },
    {
      es_animal: true,
      especie: "perro",
      raza: "Labrador",
      color: "dorado",
      tamano: "grande",
      sexo: "desconocido",
      collar: false,
      rasgos: "Cojea de la pata delantera derecha",
      condiciones: ["herido"],
      urgencia: 5,
      confianza: 0.78,
      resumen: "Posible lesión en la pata; requiere revisión veterinaria urgente.",
    },
  ];
  return { analisis: opciones[h % opciones.length], fuente: "simulado" };
}

/** Extrae los datos de una publicación copiada de un grupo (WhatsApp, Facebook, Instagram). */
export async function analizarPublicacion(texto: string): Promise<{ publicacion: Publicacion; fuente: "ia" | "simulado" }> {
  if (!iaHabilitada()) return { publicacion: publicacionSimulada(texto), fuente: "simulado" };

  cliente ??= new Anthropic();
  const respuesta = await cliente.messages.parse(
    {
      model: process.env.ANTHROPIC_MODEL!,
      max_tokens: 8000,
      system: SISTEMA_PUBLICACION,
      output_config: { effort: "low", format: zodOutputFormat(PublicacionSchema) },
      messages: [{ role: "user", content: `Publicación:\n"""\n${texto.slice(0, 3000)}\n"""` }],
    },
    { timeout: 20_000, maxRetries: 1 },
  );
  if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) {
    return { publicacion: publicacionSimulada(texto), fuente: "simulado" };
  }
  return { publicacion: respuesta.parsed_output, fuente: "ia" };
}

const NO_SON_NOMBRES = new Set(["ayer", "hoy", "anoche", "en", "el", "la", "los", "las", "un", "una", "mi", "nuestro", "nuestra", "por", "este", "esta", "perro", "perrito", "perrita", "gato", "gatito", "gatita", "cachorro", "cachorra"]);

/** Primera palabra con mayúscula inicial después de alguna frase disparadora ("se llama", "se nos perdió"…). */
function palabraTras(texto: string, disparadores: RegExp): string {
  for (const m of texto.matchAll(disparadores)) {
    const w = texto.slice(m.index + m[0].length).match(/^\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/)?.[1];
    if (w && !NO_SON_NOMBRES.has(w.toLowerCase())) return w;
  }
  return "";
}

const RAZAS = [
  "schnauzer", "chihuahua", "labrador", "golden", "pastor alemán", "poodle", "french poodle", "pug", "beagle",
  "husky", "pitbull", "yorkshire", "bulldog", "dachshund", "salchicha", "shih tzu", "boxer", "rottweiler",
  "siamés", "persa", "angora", "bengalí", "maine coon", "mestizo", "criollo",
];
const COLORES = [
  "negro", "negra", "blanco", "blanca", "café", "cafe", "gris", "dorado", "dorada", "atigrado", "atigrada",
  "naranja", "tricolor", "canela", "beige", "crema", "chocolate", "manchas",
];

/**
 * Extracción por reglas para el modo simulado: suficiente para la demo con publicaciones típicas
 * ("Se busca a Luna, schnauzer gris, se perdió en Del Valle, informes al 81 1234 5678").
 */
function publicacionSimulada(texto: string): Publicacion {
  const t = texto.toLowerCase();
  const sinAcentos = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const tipo: Publicacion["tipo"] = /se busca|perdi|extravi|se escap|no ha regresado|ayudanos a encontrar/.test(sinAcentos)
    ? "perdido"
    : /encontr|lo tengo|la tengo|resguard|busca a su (dueno|familia)|anda suelt|alguien lo conoce/.test(sinAcentos)
      ? "encontrado"
      : "callejero";
  const especie: Publicacion["especie"] = /\b(gat[oa]s?|michi|minino)\b/.test(sinAcentos)
    ? "gato"
    : /\b(perr[oa]s?|perrit[oa]|lomito|cachorr[oa]|can)\b/.test(sinAcentos) || RAZAS.slice(0, 18).some((r) => t.includes(r))
      ? "perro"
      : "desconocido";

  const digitos = texto.match(/(?:\+?52[\s-]*)?(?:\d[\s.-]*){10}/)?.[0].replace(/\D/g, "") ?? "";
  const telefono = digitos.length >= 10 ? digitos.slice(-10) : "";
  const nombre = palabraTras(
    texto,
    /se llama|responde al nombre de|su nombre es|se busca a|buscamos a|nombre:|se (?:nos |me |le |les )?(?:perdi[oó]|extravi[oó]|escap[oó])/gi,
  );
  const colonia =
    texto.match(/(?:colonia|col\.|en la|en el|por la|por el|rumbo a)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+(?:de|del|la|las|los|[A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)){0,3})/)?.[1]?.trim() ?? "";
  const fecha = t.match(/\b(hoy|ayer|anoche|antier|el (?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)|hace \w+ días?)\b[^.,\n]*/)?.[0] ?? "";

  return {
    tipo,
    especie,
    nombre,
    raza: RAZAS.find((r) => t.includes(r))?.replace(/^\w/, (c) => c.toUpperCase()) ?? "",
    color: COLORES.filter((c) => t.includes(c)).slice(0, 2).join(" y "),
    tamano: /\b(chiquit|pequeñ|chico|chica|mini)/.test(t) ? "chico" : /\b(grande|grandote)/.test(t) ? "grande" : /mediano|mediana/.test(t) ? "mediano" : "desconocido",
    sexo: /\b(macho|perro|gato|niño)\b/.test(t) && !/\b(hembra|perrita|gatita|perra|gata)\b/.test(t)
      ? "macho"
      : /\b(hembra|perrita|gatita|perra|gata)\b/.test(t)
        ? "hembra"
        : "desconocido",
    colonia,
    telefono,
    contacto: texto.match(/(?:con|llamar a|comunicarse con|preguntar por)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/)?.[1] ?? "",
    fecha,
    rasgos: texto.match(/(?:collar|placa|cicatriz|mancha|cojea|le falta)[^.,\n]*/i)?.[0] ?? "",
  };
}
