import { cellToBoundary, cellToLatLng, latLngToCell } from "h3-js";
import type { Especie, Estado } from "@/lib/constants";

export interface PuntoAnimal {
  id: string;
  lat: number;
  lng: number;
  especie: Especie;
  estado: Estado;
  urgencia: number;
}

export interface Zona {
  celda: string;
  total: number;
  perros: number;
  gatos: number;
  otros: number;
  urgentes: number;
  centro: [number, number];
  borde: [number, number][];
}

/** Resoluciones H3 ofrecidas: 7 ≈ 5 km², 8 ≈ 0.7 km², 9 ≈ 0.1 km². */
export const RESOLUCIONES = [
  { valor: 7, etiqueta: "Grandes" },
  { valor: 8, etiqueta: "Medianas" },
  { valor: 9, etiqueta: "Chicas" },
] as const;

/** Escala secuencial validada (un tono, luminosidad monótona, extremo claro ≥ 2:1). */
export const ESCALA_ZONAS = ["#f4a07a", "#e9774d", "#d4552c", "#a93d1d", "#772912"] as const;
/** Cortes de clase: 1 · 2 · 3–4 · 5–7 · 8+ animales. */
export const CORTES = [1, 2, 3, 5, 8] as const;

export function claseDe(total: number): number {
  let clase = 0;
  for (let i = 0; i < CORTES.length; i++) if (total >= CORTES[i]) clase = i;
  return clase;
}

export function etiquetaClase(i: number): string {
  const desde = CORTES[i];
  const hasta = CORTES[i + 1];
  if (hasta === undefined) return `${desde}+`;
  return hasta - desde === 1 ? `${desde}` : `${desde}–${hasta - 1}`;
}

/** Agrupa animales en hexágonos H3, de la zona con más animales a la de menos. */
export function agruparEnZonas(animales: PuntoAnimal[], resolucion: number): Zona[] {
  const zonas = new Map<string, Zona>();
  for (const a of animales) {
    const celda = latLngToCell(a.lat, a.lng, resolucion);
    let z = zonas.get(celda);
    if (!z) {
      z = {
        celda,
        total: 0,
        perros: 0,
        gatos: 0,
        otros: 0,
        urgentes: 0,
        centro: cellToLatLng(celda),
        borde: cellToBoundary(celda),
      };
      zonas.set(celda, z);
    }
    z.total++;
    if (a.especie === "perro") z.perros++;
    else if (a.especie === "gato") z.gatos++;
    else z.otros++;
    if (a.urgencia >= 4) z.urgentes++;
  }
  return [...zonas.values()].sort((a, b) => b.total - a.total || b.urgentes - a.urgentes);
}

/** Distancia aproximada en metros (equirectangular; suficiente a escala municipal). */
export function distanciaM([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const x = ((lng2 - lng1) * Math.PI) / 180 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const y = ((lat2 - lat1) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

export function coloniaMasCercana<T extends { lat: number; lng: number }>(centro: [number, number], colonias: T[]): T | undefined {
  let mejor: T | undefined;
  let min = Infinity;
  for (const c of colonias) {
    const d = distanciaM(centro, [c.lat, c.lng]);
    if (d < min) {
      min = d;
      mejor = c;
    }
  }
  return mejor;
}
