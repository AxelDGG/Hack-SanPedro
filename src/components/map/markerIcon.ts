import L from "leaflet";
import { ESTADOS, ESTADOS_RESUELTOS, TIPOS, type Especie, type Estado, type TipoReporte } from "@/lib/constants";

// Siluetas propias (viewBox 24×24) para distinguir especie dentro del pin.
const GLIFOS: Record<Especie, string> = {
  perro:
    '<ellipse cx="6.2" cy="10" rx="2.7" ry="4.8" transform="rotate(22 6.2 10)"/><ellipse cx="17.8" cy="10" rx="2.7" ry="4.8" transform="rotate(-22 17.8 10)"/><circle cx="12" cy="13.5" r="6.4"/>',
  gato: '<path d="M5.8 12 6.4 3.6 11.2 8.4zM18.2 12 17.6 3.6 12.8 8.4z"/><circle cx="12" cy="14" r="6.6"/>',
  otro: '<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6.4" cy="10.4" r="2.1"/><circle cx="10" cy="7" r="2.1"/><circle cx="14" cy="7" r="2.1"/><circle cx="17.6" cy="10.4" r="2.1"/>',
};

interface Opciones {
  estado: Estado;
  tipo?: TipoReporte;
  especie: Especie;
  urgente: boolean;
  nuevo: boolean;
  seleccionado: boolean;
}

const cache = new Map<string, L.DivIcon>();

/**
 * Pin SVG: mientras el caso está abierto lo colorea el tipo (se busca, encontrado) o el estado
 * del rescate (callejero); pulsa si es urgente y "cae" si acaba de llegar por Realtime.
 */
export function iconoAnimal(o: Opciones): L.DivIcon {
  const tipo = o.tipo ?? "callejero";
  const clave = `${o.estado}|${tipo}|${o.especie}|${o.urgente}|${o.nuevo}|${o.seleccionado}`;
  const enCache = cache.get(clave);
  if (enCache) return enCache;

  // Segunda codificación además del color: casos resueltos van rellenos (silueta blanca).
  const resuelto = ESTADOS_RESUELTOS.includes(o.estado);
  const color = !resuelto && tipo !== "callejero" ? TIPOS[tipo].color : ESTADOS[o.estado].color;
  const fondo = resuelto ? color : "#fff";
  const glifo = resuelto ? "#fff" : color;
  const clases = [
    "cos-pin",
    o.urgente && "cos-pin--urgente",
    o.nuevo && "cos-pin--nuevo",
    o.seleccionado && "cos-pin--sel",
  ]
    .filter(Boolean)
    .join(" ");

  const icono = L.divIcon({
    className: "cos-pin-wrap",
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    html: `<div class="${clases}" style="--c:${color}">
      <svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true">
        <path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 28.4 17 42.5 17 42.5s15.5-14.1 15.5-25.7C32.5 8.3 25.6 1.5 17 1.5z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
        <circle cx="17" cy="16.5" r="10.5" fill="${fondo}" stroke="#fff" stroke-width="${resuelto ? 1.5 : 0}"/>
        <svg x="8" y="7.5" width="18" height="18" viewBox="0 0 24 24" fill="${glifo}">${GLIFOS[o.especie]}</svg>
      </svg>
    </div>`,
  });
  cache.set(clave, icono);
  return icono;
}
