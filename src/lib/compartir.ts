import { TIPOS, type Especie, type TipoReporte } from "./constants";

interface AnimalCompartible {
  id: string;
  tipo: TipoReporte;
  especie: Especie;
  apodo: string | null;
  raza?: string | null;
  color?: string | null;
  rasgos?: string | null;
  colonia?: string | null;
}

export function urlAnimal(id: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/animal/${id}`;
}

/**
 * Mensaje listo para pegar en un grupo de vecinos: dice qué pasó, cómo es y dónde,
 * y lleva el link a la ficha (con foto y mapa) para centralizar los avisos en un solo lugar.
 */
export function textoParaCompartir(a: AnimalCompartible): string {
  const especie = a.especie === "gato" ? "gato" : "perro";
  const descripcion = [a.raza && !/mestiz|domestic/i.test(a.raza) ? a.raza : null, a.color, a.rasgos]
    .filter(Boolean)
    .join(", ");
  const donde = a.colonia ? ` en ${a.colonia}` : "";

  const encabezado =
    a.tipo === "perdido"
      ? `SE BUSCA: ${a.apodo ?? `mi ${especie}`}${donde}`
      : a.tipo === "encontrado"
        ? `ENCONTRADO: ${especie}${donde}. ¿Es tuyo o sabes de quién es?`
        : `${TIPOS.callejero.label.toUpperCase()}: un ${especie} necesita ayuda${donde}`;

  const cierre =
    a.tipo === "perdido"
      ? "Si lo ves, avisa aquí (no necesitas cuenta):"
      : "Más fotos, ubicación y cómo ayudar:";

  return [encabezado, descripcion && `${descripcion[0].toUpperCase()}${descripcion.slice(1)}.`, cierre, urlAnimal(a.id)]
    .filter(Boolean)
    .join("\n");
}

/**
 * Abre WhatsApp con el mensaje listo. Va directo a api.whatsapp.com: la redirección de wa.me
 * rompe los caracteres de 4 bytes (emojis) en WhatsApp Web y escritorio. Por lo mismo, los
 * mensajes que armamos no llevan emojis.
 */
export function enlaceWhatsApp(texto: string) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
}

/** Links cortos para pegar en los grupos: abren directo el asistente del tipo indicado. */
export function enlaceReportar(tipo: TipoReporte) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/r/${tipo === "encontrado" ? "vi" : tipo}`;
}
