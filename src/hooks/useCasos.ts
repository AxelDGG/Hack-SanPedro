"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Condicion, Especie, Estado } from "@/lib/constants";

export interface Caso {
  id: string;
  especie: Especie;
  apodo: string | null;
  rasgos: string | null;
  condiciones: Condicion[];
  estado: Estado;
  urgencia: number;
  lat: number;
  lng: number;
  foto_portada_url: string | null;
  colonia: string | null;
  rescatista_id: string | null;
  total_avistamientos: number;
  visto_ultima_vez: string;
  distancia_m: number | null;
}

async function cercanos(lat: number, lng: number): Promise<Caso[]> {
  const { data } = await createClient().rpc("nearby_cases", { p_lat: lat, p_lng: lng, p_radio_km: 15 });
  return (data ?? []) as Caso[];
}

async function mios(userId: string): Promise<Caso[]> {
  const { data } = await createClient()
    .from("animals")
    .select(
      "id, especie, apodo, rasgos, condiciones, estado, urgencia, lat, lng, foto_portada_url, rescatista_id, total_avistamientos, visto_ultima_vez, colonias(nombre)",
    )
    .eq("rescatista_id", userId)
    .neq("estado", "adoptado")
    .order("urgencia", { ascending: false })
    .order("visto_ultima_vez", { ascending: false });
  return (data ?? []).map(({ colonias, ...a }) => ({ ...a, colonia: colonias?.nombre ?? null, distancia_m: null }));
}

/**
 * Casos para el panel de rescate: cercanos (avistados o en atención, por urgencia y distancia)
 * y los asignados al rescatista. Se refresca solo cuando cambia algún animal.
 */
export function useCasos(userId: string, lat: number, lng: number) {
  const [datos, setDatos] = useState<{ cercanos: Caso[]; mios: Caso[] } | null>(null);
  const [nuevos, setNuevos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    let activo = true;
    const cargar = () => {
      void Promise.all([cercanos(lat, lng), mios(userId)]).then(([c, m]) => activo && setDatos({ cercanos: c, mios: m }));
    };
    cargar();

    const canal = supabase
      .channel(`casos-${userId}`)
      .on<{ id: string }>("postgres_changes", { event: "*", schema: "public", table: "animals" }, (payload) => {
        if (payload.eventType === "INSERT") setNuevos((prev) => new Set(prev).add(payload.new.id));
        cargar();
      })
      .subscribe();

    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, [userId, lat, lng]);

  return { cercanos: datos?.cercanos ?? [], mios: datos?.mios ?? [], cargando: datos === null, nuevos };
}
