import { z } from "zod";

/** Lo que la IA devuelve al analizar una foto. Compartido entre servidor y cliente. */
export const AnalisisSchema = z.object({
  es_animal: z.boolean().describe("true solo si en la foto aparece un perro o un gato"),
  especie: z.enum(["perro", "gato"]).describe("especie del animal principal"),
  raza: z
    .string()
    .describe("raza probable en español (p. ej. 'Labrador', 'Schnauzer', 'Siamés'); 'Mestizo' si no es clara"),
  color: z.string().describe("colores del pelaje en pocas palabras, p. ej. 'café con pecho blanco'"),
  tamano: z.enum(["chico", "mediano", "grande"]).describe("tamaño aproximado del animal adulto o cachorro"),
  sexo: z.enum(["macho", "hembra", "desconocido"]).describe("solo si se nota con claridad; si no, 'desconocido'"),
  collar: z.boolean().describe("true si trae collar, pañoleta o arnés"),
  rasgos: z
    .string()
    .describe("señas particulares para reconocerlo en una frase corta en español (máx. 120 caracteres)"),
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
    raza: a.raza.trim().slice(0, 60),
    color: a.color.trim().slice(0, 60),
    rasgos: a.rasgos.trim().slice(0, 140),
    resumen: a.resumen.trim().slice(0, 240),
    condiciones: sinSano.length > 0 && condiciones.includes("sano") ? sinSano : condiciones,
    urgencia: Math.min(5, Math.max(1, Math.round(a.urgencia))),
    confianza: Math.min(1, Math.max(0, a.confianza)),
  };
}

/**
 * Lo que la IA extrae de una publicación copiada de WhatsApp, Facebook o Instagram
 * ("Se busca a Luna, schnauzer gris, se perdió en Del Valle, tel 81…").
 */
export const PublicacionSchema = z.object({
  tipo: z
    .enum(["perdido", "encontrado", "callejero"])
    .describe("perdido = su familia lo busca; encontrado = alguien lo vio o lo tiene y busca al dueño; callejero = vive en la calle"),
  especie: z.enum(["perro", "gato", "desconocido"]),
  nombre: z.string().describe("nombre de la mascota si se menciona; vacío si no"),
  raza: z.string().describe("raza si se menciona; vacío si no"),
  color: z.string().describe("color si se menciona; vacío si no"),
  tamano: z.enum(["chico", "mediano", "grande", "desconocido"]),
  sexo: z.enum(["macho", "hembra", "desconocido"]),
  colonia: z.string().describe("colonia o lugar donde se perdió o se vio, tal como aparece; vacío si no"),
  telefono: z.string().describe("teléfono de contacto, solo dígitos; vacío si no hay"),
  contacto: z.string().describe("nombre de la persona de contacto; vacío si no hay"),
  fecha: z.string().describe("cuándo se perdió o se vio, tal como aparece (p. ej. 'ayer en la tarde'); vacío si no"),
  rasgos: z.string().describe("señas particulares en una frase corta; vacío si no hay"),
});

export type Publicacion = z.infer<typeof PublicacionSchema>;

export interface RespuestaPublicacion {
  publicacion: Publicacion;
  /** Colonia del catálogo que mejor coincide con `publicacion.colonia`. */
  colonia_id: number | null;
  fuente: "ia" | "simulado";
}
