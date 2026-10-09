"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface StatMes {
  mes: string;
  reportes: number;
  rescates: number;
  esterilizaciones: number;
  adopciones: number;
}

async function obtener(): Promise<StatMes[]> {
  const { data } = await createClient().from("v_stats_mensuales").select("*").order("mes");
  return (data ?? []).map((r) => ({
    mes: r.mes ?? "",
    reportes: r.reportes ?? 0,
    rescates: r.rescates ?? 0,
    esterilizaciones: r.esterilizaciones ?? 0,
    adopciones: r.adopciones ?? 0,
  }));
}

/** Métricas de los últimos 6 meses; se recalculan con cada reporte o cambio de estado. */
export function useStatsMensuales() {
  const [meses, setMeses] = useState<StatMes[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let activo = true;
    const recargar = () => {
      void obtener().then((m) => activo && setMeses(m));
    };
    recargar();
    const canal = supabase
      .channel("stats-mensuales")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sightings" }, recargar)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "status_updates" }, recargar)
      .subscribe();
    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, []);

  return meses;
}
