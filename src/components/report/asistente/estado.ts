import type { Condicion, Origen, Sexo, Tamano, TipoReporte } from "@/lib/constants";

export type Paso = "tipo" | "foto" | "donde" | "coincidencias" | "datos" | "contacto";

export interface DatosReporte {
  tipo: TipoReporte | null;
  especie: "perro" | "gato";
  apodo: string;
  raza: string;
  color: string;
  tamano: Tamano | null;
  sexo: Sexo | null;
  collar: boolean | null;
  rasgos: string;
  condiciones: Condicion[];
  urgencia: number;
  notas: string;
  /** ISO; solo mascotas perdidas. */
  perdidoDesde: string | null;
  origen: Origen;
  registroFolio: string | null;
  contactoNombre: string;
  contactoTelefono: string;
}

export const DATOS_INICIALES: DatosReporte = {
  tipo: null,
  especie: "perro",
  apodo: "",
  raza: "",
  color: "",
  tamano: null,
  sexo: null,
  collar: null,
  rasgos: "",
  condiciones: [],
  urgencia: 2,
  notas: "",
  perdidoDesde: null,
  origen: "app",
  registroFolio: null,
  contactoNombre: "",
  contactoTelefono: "",
};

/**
 * Orden de las preguntas, una por pantalla. Cambia según el tipo:
 * - Perdido: primero cómo es tu mascota, luego dónde se perdió (así la búsqueda de parecidos ya tiene rasgos).
 * - Encontrado / callejero: la foto y el lugar primero, porque la persona está frente al animal.
 * - Confirmar un reporte existente ("Lo vi también"): foto opcional, lugar y cómo se ve hoy.
 * "Coincidencias" solo aparece si hay animales parecidos.
 */
export function ordenPasos(o: {
  tipo: TipoReporte | null;
  tipoFijo: boolean;
  confirmacion: boolean;
  hayCoincidencias: boolean;
}): Paso[] {
  const inicio: Paso[] = o.tipoFijo ? [] : ["tipo"];
  if (o.confirmacion) return ["foto", "donde", "datos"];
  const coincidencias: Paso[] = o.hayCoincidencias ? ["coincidencias"] : [];
  switch (o.tipo) {
    case "perdido":
      return [...inicio, "foto", "datos", "donde", ...coincidencias, "contacto"];
    case "encontrado":
      return [...inicio, "foto", "donde", ...coincidencias, "datos", "contacto"];
    case "callejero":
      return [...inicio, "foto", "donde", ...coincidencias, "datos"];
    default:
      return ["tipo"];
  }
}

/** Solo dígitos y sin lada de país: 10 dígitos de México. */
export function normalizarTelefono(t: string): string {
  const d = t.replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

/** "hoy", "ayer", "antier", "hace 3 días" → fecha aproximada (mediodía de ese día). */
export function fechaDesdeTexto(texto: string, ahora = new Date()): string | null {
  const t = texto.toLowerCase();
  let dias: number | null = null;
  if (/\bhoy\b|esta (mañana|tarde|noche)/.test(t)) dias = 0;
  else if (/\banoche\b|\bayer\b/.test(t)) dias = 1;
  else if (/\bantier\b|anteayer/.test(t)) dias = 2;
  else {
    const n = t.match(/hace (\d+|un|una|dos|tres|cuatro|cinco) (d[ií]as?|semanas?)/);
    if (n) {
      const numeros: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
      const cantidad = numeros[n[1]] ?? Number(n[1]);
      dias = n[2].startsWith("semana") ? cantidad * 7 : cantidad;
    }
  }
  if (dias === null) return null;
  const f = new Date(ahora);
  f.setDate(f.getDate() - dias);
  if (dias > 0) f.setHours(12, 0, 0, 0);
  return f.toISOString();
}
