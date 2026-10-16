/**
 * Datos de la simulación. Los JSON se importan (no se leen del disco) para que
 * el bundler los incluya en la función de Vercel.
 *
 * El estado que cambia (extravíos y avisos) vive sólo en memoria: se pierde al
 * reiniciar el proceso y, en Vercel, cada instancia tiene el suyo.
 */
import coloniasJson from "../data/colonias.json" with { type: "json" };
import mascotasJson from "../data/mascotas.json" with { type: "json" };
import fotosJson from "../data/fotos.json" with { type: "json" };
import type { AvisoPropietario, Colonia, EstatusMascota, Extravio, Mascota, MascotaRegistro } from "./tipos.js";

export const colonias = coloniasJson as Colonia[];
export const mascotas = mascotasJson as MascotaRegistro[];
export const fotos = fotosJson as Record<string, string>;

export const coloniaPorClave = new Map(colonias.map((c) => [c.clave, c]));
const mascotaPorFolio = new Map(mascotas.map((m) => [m.folio, m]));
const mascotaPorMicrochip = new Map(mascotas.filter((m) => m.microchip).map((m) => [m.microchip!, m]));

// --- Estado en memoria
const estatusActual = new Map<string, EstatusMascota>();
export const extravios = new Map<string, Extravio>();
export const avisos: AvisoPropietario[] = [];

export function estatusDe(m: MascotaRegistro): EstatusMascota {
  return estatusActual.get(m.folio) ?? m.estatus;
}

export function cambiarEstatus(folio: string, estatus: EstatusMascota) {
  estatusActual.set(folio, estatus);
}

export function buscarPorFolio(folio: string) {
  return mascotaPorFolio.get(folio.trim().toUpperCase());
}

export function buscarPorMicrochip(numero: string) {
  return mascotaPorMicrochip.get(numero.replace(/\D/g, ""));
}

/** Convierte el registro interno en la forma pública de la API (foto con URL absoluta). */
export function aPublica(m: MascotaRegistro, origen: string): Mascota {
  return {
    folio: m.folio,
    nombre: m.nombre,
    especie: m.especie,
    raza: m.raza,
    color: m.color,
    tamano: m.tamano,
    sexo: m.sexo,
    fecha_nacimiento: m.fecha_nacimiento,
    esterilizada: m.esterilizada,
    vacunas: m.vacunas,
    microchip: m.microchip,
    senas_particulares: m.senas_particulares,
    foto_url: `${origen}/fotos/${m.foto}`,
    colonia: m.colonia,
    propietario: m.propietario,
    fecha_registro: m.fecha_registro,
    estatus: estatusDe(m),
  };
}
