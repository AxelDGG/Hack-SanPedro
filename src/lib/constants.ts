import type { Enums } from "@/types/database.types";

export type Estado = Enums<"estado_animal">;
export type Especie = Enums<"especie_animal">;
export type Condicion = Enums<"condicion_animal">;
export type Rol = Enums<"rol_usuario">;

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
};

/** Orden del flujo de atención. */
export const FLUJO_ESTADOS: Estado[] = ["avistado", "en_atencion", "rescatado", "esterilizado", "adoptado"];

/** Estados que cuentan como "en la calle" para el mapa de calor. */
export const ESTADOS_EN_CALLE: Estado[] = ["avistado", "en_atencion"];

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
