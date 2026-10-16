import type { Enums } from "@/types/database.types";

export type Estado = Enums<"estado_animal">;
export type Especie = Enums<"especie_animal">;
export type Condicion = Enums<"condicion_animal">;
export type Rol = Enums<"rol_usuario">;
export type TipoReporte = Enums<"tipo_reporte">;
export type Tamano = Enums<"tamano_animal">;
export type Sexo = Enums<"sexo_animal">;
export type Origen = Enums<"origen_reporte">;

/**
 * Colores por estado, validados para daltonismo (todos los pares; rojo↔verde queda en la banda
 * de advertencia, por eso los pines de casos resueltos además van rellenos).
 */
export const ESTADOS: Record<Estado, { label: string; color: string; descripcion: string }> = {
  avistado: { label: "Avistado", color: "#e34948", descripcion: "Visto en la calle, sin atender" },
  en_atencion: { label: "En atención", color: "#eda100", descripcion: "Un rescatista tomó el caso" },
  rescatado: { label: "Rescatado", color: "#2a78d6", descripcion: "Fuera de la calle" },
  esterilizado: { label: "Esterilizado", color: "#4a3aa7", descripcion: "Esterilizado y a salvo" },
  adoptado: { label: "Adoptado", color: "#008300", descripcion: "¡Encontró hogar!" },
  reunido: { label: "En casa", color: "#b8337f", descripcion: "Volvió con su familia" },
};

/** Color del estado según el tipo: "se busca" y "encontrado" usan el color de su tipo. */
export function colorEstado(estado: Estado, tipo: TipoReporte = "callejero"): string {
  return estado === "avistado" && tipo !== "callejero" ? TIPOS[tipo].color : ESTADOS[estado].color;
}

/** Etiqueta del estado según el tipo: una mascota perdida "avistada" en realidad "se busca". */
export function etiquetaEstado(estado: Estado, tipo: TipoReporte = "callejero"): string {
  if (estado === "avistado" && tipo === "perdido") return "Se busca";
  if (estado === "avistado" && tipo === "encontrado") return "Encontrado";
  return ESTADOS[estado].label;
}

/**
 * Los tres tipos de reporte que antes andaban sueltos en grupos de WhatsApp y Facebook.
 * `accion` es el texto del botón grande de inicio; `label`, la etiqueta corta en fichas y mapa.
 */
export const TIPOS: Record<
  TipoReporte,
  { label: string; accion: string; ayuda: string; titulo: string; color: string; fondo: string }
> = {
  perdido: {
    label: "Se busca",
    accion: "Se me perdió",
    ayuda: "Mi perro o mi gato no aparece",
    titulo: "Mascota perdida",
    color: "#b8337f",
    fondo: "#fbe9f2",
  },
  encontrado: {
    label: "Encontrado",
    accion: "Vi o encontré uno",
    ayuda: "Parece que tiene dueño y anda suelto",
    titulo: "Mascota encontrada",
    color: "#0f8577",
    fondo: "#e3f4f1",
  },
  callejero: {
    label: "Callejero",
    accion: "Hay un callejero",
    ayuda: "Vive en la calle o necesita ayuda",
    titulo: "Animal en la calle",
    color: "#e2583e",
    fondo: "#fdece7",
  },
};

export const ORDEN_TIPOS: TipoReporte[] = ["perdido", "encontrado", "callejero"];

/** Solo perros y gatos se pueden reportar; "otro" queda para datos anteriores. */
export const ESPECIES_REPORTE = ["perro", "gato"] as const satisfies readonly Especie[];

export const TAMANOS: Record<Tamano, { label: string }> = {
  chico: { label: "Chico" },
  mediano: { label: "Mediano" },
  grande: { label: "Grande" },
};

export const SEXOS: Record<Sexo, { label: string }> = {
  macho: { label: "Macho" },
  hembra: { label: "Hembra" },
};

export const ORIGENES: Record<Origen, { label: string }> = {
  app: { label: "La app" },
  whatsapp: { label: "WhatsApp" },
  facebook: { label: "Facebook" },
  instagram: { label: "Instagram" },
  otro: { label: "Otro" },
};

/** Orden del flujo de atención. */
export const FLUJO_ESTADOS: Estado[] = ["avistado", "en_atencion", "rescatado", "esterilizado", "adoptado"];

/** Estados que cuentan como "en la calle" para el mapa de calor. */
export const ESTADOS_EN_CALLE: Estado[] = ["avistado", "en_atencion"];

/** Casos cerrados: el animal ya no está en la calle. */
export const ESTADOS_RESUELTOS: Estado[] = ["rescatado", "esterilizado", "adoptado", "reunido"];

/** Estados que aún no están esterilizados. */
export const ESTADOS_SIN_ESTERILIZAR: Estado[] = ["avistado", "en_atencion", "rescatado"];

export const ESPECIES: Record<Especie, { label: string }> = {
  perro: { label: "Perro" },
  gato: { label: "Gato" },
  otro: { label: "Otro" },
};

export const CONDICIONES: Record<Condicion, { label: string }> = {
  sano: { label: "Sano" },
  flaco: { label: "Flaco" },
  herido: { label: "Herido" },
  cachorro: { label: "Cachorro" },
};

export const ROLES: Record<Rol, { label: string }> = {
  vecino: { label: "Vecino" },
  rescatista: { label: "Rescatista" },
  municipio: { label: "Municipio" },
};

export const URGENCIAS: Record<number, string> = {
  1: "Sin prisa",
  2: "Baja",
  3: "Media",
  4: "Alta",
  5: "Crítica",
};

/** Huellas (puntos) que otorga el sistema; la fuente de verdad está en SQL. */
export const HUELLAS = {
  reporte: 10,
  confirmacion: 5,
  casoResuelto: [20, 15, 10, 5],
} as const;

/** Vista inicial del mapa: San Pedro Garza García, sesgada hacia las colonias con más reportes. */
export const CENTRO_SAN_PEDRO: [number, number] = [25.6635, -100.3930];

export const BUCKET_FOTOS = "fotos";

export const DEMO_EMAILS: Record<Rol, string> = {
  vecino: "vecina@callejeros.demo",
  rescatista: "rescatista@callejeros.demo",
  municipio: "municipio@callejeros.demo",
};
