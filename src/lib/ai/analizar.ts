import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AnalisisSchema, normalizarAnalisis, type Analisis, type RespuestaAnalisis } from "./schema";

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

const SISTEMA = `Eres el asistente de CallejerOS, una red comunitaria de San Pedro Garza García (México) que ayuda a rescatar animales en situación de calle.
Recibes la foto que un vecino tomó de un animal en la calle. Descríbela para que un rescatista pueda priorizar el caso.

Escala de urgencia:
1 = se ve sano y tranquilo, sin riesgo aparente
2 = sano pero en la calle, sin dueño visible
3 = flaco, descuidado o con pelaje en mal estado
4 = herido visible, cachorro solo o en peligro inmediato (por ejemplo, en una avenida)
5 = herida grave, sangrado, no puede moverse o está en peligro de muerte

Si en la foto no hay ningún animal, responde es_animal = false y usa valores neutros (especie "otro", urgencia 1, confianza baja).
Escribe rasgos y resumen en español, en tono claro y sin alarmismo.`;

let cliente: Anthropic | null = null;

/** El análisis real solo corre con API key y modelo configurados y AI_MOCK distinto de "true". */
export function iaHabilitada() {
  return process.env.AI_MOCK !== "true" && !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;
}

export async function analizarFoto(imagen: Buffer, tipo: TipoImagen): Promise<RespuestaAnalisis> {
  if (!iaHabilitada()) return analisisSimulado(imagen);

  const modelo = process.env.ANTHROPIC_MODEL!;
  cliente ??= new Anthropic();

  const respuesta = await cliente.messages.parse(
    {
      model: modelo,
      max_tokens: 2000,
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

/** Respuesta plausible sin llamar a la API (desarrollo y demo sin key). Varía según la imagen. */
async function analisisSimulado(imagen: Buffer): Promise<RespuestaAnalisis> {
  await new Promise((r) => setTimeout(r, 1200));
  let h = 0;
  for (let i = 0; i < imagen.length; i += 997) h = (h * 31 + imagen[i]) >>> 0;

  const opciones: Analisis[] = [
    {
      es_animal: true,
      especie: "perro",
      rasgos: "Perro mediano café claro, orejas caídas, sin collar",
      condiciones: ["flaco"],
      urgencia: 3,
      confianza: 0.86,
      resumen: "Perro adulto delgado, camina bien pero se nota con hambre.",
    },
    {
      es_animal: true,
      especie: "perro",
      rasgos: "Cachorro negro con pecho blanco",
      condiciones: ["cachorro", "flaco"],
      urgencia: 4,
      confianza: 0.81,
      resumen: "Cachorro solo cerca de la banqueta; conviene atenderlo pronto.",
    },
    {
      es_animal: true,
      especie: "gato",
      rasgos: "Gato atigrado naranja, ojos verdes",
      condiciones: ["sano"],
      urgencia: 2,
      confianza: 0.9,
      resumen: "Gato adulto en buen estado aparente, descansando.",
    },
    {
      es_animal: true,
      especie: "perro",
      rasgos: "Perro grande gris, cojea de la pata delantera",
      condiciones: ["herido"],
      urgencia: 5,
      confianza: 0.78,
      resumen: "Posible lesión en la pata; requiere revisión veterinaria urgente.",
    },
  ];
  return { analisis: opciones[h % opciones.length], fuente: "simulado" };
}
