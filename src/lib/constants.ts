import type { Enums } from "@/types/database.types";

export type Estado = Enums<"estado_animal">;
export type Especie = Enums<"especie_animal">;
export type Condicion = Enums<"condicion_animal">;
export type Rol = Enums<"rol_usuario">;

export const ESTADOS: Record<Estado, { label: string; color: string; descripcion: string }> = {
  avistado: { label: "Avistado", color: "#E2583E", descripcion: "Visto en la calle, sin atender" },
  en_atencion: { label: "En atención", color: "#F2A23A", descripcion: "Un rescatista tomó el caso" },
  rescatado: { label: "Rescatado", color: "#3D8BD9", descripcion: "Fuera de la calle" },
  esterilizado: { label: "Esterilizado", color: "#8E6BD8", descripcion: "Esterilizado y a salvo" },
  adoptado: { label: "Adoptado", color: "#3BAA6B", descripcion: "¡Encontró hogar!" },
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

/** Centro aproximado de San Pedro Garza García. */
export const CENTRO_SAN_PEDRO: [number, number] = [25.6573, -100.4026];

export const BUCKET_FOTOS = "fotos";

export const DEMO_EMAILS: Record<Rol, string> = {
  vecino: "vecina@callejeros.demo",
  rescatista: "rescatista@callejeros.demo",
  municipio: "municipio@callejeros.demo",
};
