import { Award, Binoculars, Eye, Heart, Network, PawPrint, Search, Star, type LucideIcon } from "lucide-react";

/** Ícono de cada insignia (la columna `icono` de la tabla badges). */
export const ICONOS_INSIGNIA: Record<string, LucideIcon> = {
  huella: PawPrint,
  ojo: Eye,
  faro: Binoculars,
  lupa: Search,
  corazon: Heart,
  red: Network,
  estrella: Star,
};

export function iconoInsignia(icono: string): LucideIcon {
  return ICONOS_INSIGNIA[icono] ?? Award;
}

export const MOTIVOS: Record<string, string> = {
  reporte: "Reportaste un animal",
  confirmacion: "Confirmaste un avistamiento",
  caso_resuelto: "Un caso que reportaste se resolvió",
};
