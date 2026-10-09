"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

export interface Insignia extends Tables<"badges"> {
  otorgada_at: string | null;
  progreso: number;
}

export interface ResumenHuellas {
  reportes: number;
  confirmaciones: number;
  casos_resueltos: number;
  puntos: number;
  recientes: Pick<Tables<"point_events">, "id" | "motivo" | "puntos" | "created_at" | "animal_id">[];
  insignias: Insignia[];
}

async function obtener(userId: string): Promise<ResumenHuellas> {
  const supabase = createClient();
  const [eventos, badges, mias] = await Promise.all([
    supabase
      .from("point_events")
      .select("id, motivo, puntos, created_at, animal_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("badges").select("*").order("orden"),
    supabase.from("user_badges").select("badge_codigo, otorgada_at").eq("user_id", userId),
  ]);

  const lista = eventos.data ?? [];
  const metricas = {
    reportes: lista.filter((e) => e.motivo === "reporte").length,
    confirmaciones: lista.filter((e) => e.motivo === "confirmacion").length,
    casos_resueltos: lista.filter((e) => e.motivo === "caso_resuelto").length,
    puntos: lista.reduce((s, e) => s + e.puntos, 0),
  };
  const otorgadas = new Map((mias.data ?? []).map((b) => [b.badge_codigo, b.otorgada_at]));

  return {
    ...metricas,
    recientes: lista.slice(0, 8),
    insignias: (badges.data ?? []).map((b) => ({
      ...b,
      otorgada_at: otorgadas.get(b.codigo) ?? null,
      progreso: Math.min(1, (metricas[b.metrica as keyof typeof metricas] ?? 0) / b.umbral),
    })),
  };
}

/** Huellas, métricas e insignias del usuario; se refresca cuando gana huellas. */
export function useGamificacion(userId: string, puntosActuales: number) {
  const [resumen, setResumen] = useState<ResumenHuellas | null>(null);

  useEffect(() => {
    let activo = true;
    void obtener(userId).then((r) => activo && setResumen(r));
    return () => {
      activo = false;
    };
  }, [userId, puntosActuales]);

  return resumen;
}
