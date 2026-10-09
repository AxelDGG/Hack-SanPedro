"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Estado } from "@/lib/constants";
import type { Json, Tables } from "@/types/database.types";

export type AnimalFicha = Tables<"animals"> & {
  colonia: { nombre: string } | null;
  reportero: { nombre: string } | null;
  rescatista: { nombre: string } | null;
};

export interface AvistamientoFicha {
  id: string;
  foto_url: string | null;
  notas: string | null;
  analisis_ia: Json | null;
  es_confirmacion: boolean;
  created_at: string;
  autor: { nombre: string } | null;
}

export interface CambioFicha {
  id: string;
  estado_anterior: Estado | null;
  estado_nuevo: Estado;
  nota: string | null;
  created_at: string;
  autor: { nombre: string; rol: string } | null;
}

interface Ficha {
  animal: AnimalFicha | null;
  avistamientos: AvistamientoFicha[];
  cambios: CambioFicha[];
}

async function obtenerFicha(id: string): Promise<Ficha> {
  const supabase = createClient();
  const [a, s, c] = await Promise.all([
    supabase
      .from("animals")
      .select(
        "*, colonia:colonias(nombre), reportero:profiles!animals_reportado_por_fkey(nombre), rescatista:profiles!animals_rescatista_id_fkey(nombre)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("sightings")
      .select("id, foto_url, notas, analisis_ia, es_confirmacion, created_at, autor:profiles(nombre)")
      .eq("animal_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("status_updates")
      .select("id, estado_anterior, estado_nuevo, nota, created_at, autor:profiles(nombre, rol)")
      .eq("animal_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    animal: a.data as AnimalFicha | null,
    avistamientos: (s.data ?? []) as AvistamientoFicha[],
    cambios: (c.data ?? []) as CambioFicha[],
  };
}

/** Ficha completa de un animal; se recarga sola ante cambios en Realtime. */
export function useFichaAnimal(id: string) {
  const [ficha, setFicha] = useState<Ficha | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let activo = true;
    const recargar = () => {
      void obtenerFicha(id).then((f) => activo && setFicha(f));
    };
    recargar();

    const canal = supabase
      .channel(`ficha-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "animals", filter: `id=eq.${id}` }, recargar)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sightings", filter: `animal_id=eq.${id}` }, recargar)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "status_updates", filter: `animal_id=eq.${id}` }, recargar)
      .subscribe();

    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, [id]);

  return {
    animal: ficha?.animal ?? null,
    avistamientos: ficha?.avistamientos ?? [],
    cambios: ficha?.cambios ?? [],
    estado: ficha === null ? "cargando" : ficha.animal ? "listo" : "no-encontrado",
  } as const;
}
