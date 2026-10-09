import { z } from "zod";

/** Lo que la IA devuelve al analizar una foto. Compartido entre servidor y cliente. */
export const AnalisisSchema = z.object({
  es_animal: z.boolean().describe("true si en la foto aparece al menos un perro, gato u otro animal"),
  especie: z.enum(["perro", "gato", "otro"]).describe("especie del animal principal"),
  rasgos: z
    .string()
    .describe("color, tamaño y rasgos distintivos en una frase corta en español (máx. 120 caracteres)"),
  condiciones: z
    .array(z.enum(["sano", "flaco", "herido", "cachorro"]))
    .describe("todas las que apliquen; 'sano' solo si no aplica 'flaco' ni 'herido'"),
  urgencia: z.number().describe("entero de 1 a 5 según la escala indicada"),
  confianza: z.number().describe("qué tan seguro estás del análisis, de 0 a 1"),
  resumen: z.string().describe("una frase en español para el rescatista sobre lo que se observa"),
});

export type Analisis = z.infer<typeof AnalisisSchema>;

export interface RespuestaAnalisis {
  analisis: Analisis;
  fuente: "ia" | "simulado";
  modelo?: string;
}

/** Ajusta valores numéricos y textos a rangos válidos (la IA puede salirse un poco). */
export function normalizarAnalisis(a: Analisis): Analisis {
  const condiciones = [...new Set(a.condiciones)];
  const sinSano = condiciones.filter((c) => c !== "sano");
  return {
    ...a,
    rasgos: a.rasgos.trim().slice(0, 140),
    resumen: a.resumen.trim().slice(0, 240),
    condiciones: sinSano.length > 0 && condiciones.includes("sano") ? sinSano : condiciones,
    urgencia: Math.min(5, Math.max(1, Math.round(a.urgencia))),
    confianza: Math.min(1, Math.max(0, a.confianza)),
  };
}
