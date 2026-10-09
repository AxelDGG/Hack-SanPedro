"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

export type AnimalMapa = Pick<
  Tables<"animals">,
  | "id"
  | "especie"
  | "apodo"
  | "rasgos"
  | "condiciones"
  | "estado"
  | "urgencia"
  | "lat"
  | "lng"
  | "foto_portada_url"
  | "visto_ultima_vez"
  | "total_avistamientos"
  | "colonia_id"
  | "created_at"
>;

const CAMPOS =
  "id, especie, apodo, rasgos, condiciones, estado, urgencia, lat, lng, foto_portada_url, visto_ultima_vez, total_avistamientos, colonia_id, created_at";

const SEGUNDOS_RESALTADO = 20;

function aAnimalMapa(row: Tables<"animals">): AnimalMapa {
  const { id, especie, apodo, rasgos, condiciones, estado, urgencia, lat, lng, foto_portada_url, visto_ultima_vez, total_avistamientos, colonia_id, created_at } = row;
  return { id, especie, apodo, rasgos, condiciones, estado, urgencia, lat, lng, foto_portada_url, visto_ultima_vez, total_avistamientos, colonia_id, created_at };
}

/**
 * Todos los animales del mapa, actualizados en vivo con Supabase Realtime.
 * `recientes` contiene los ids que acaban de llegar por Realtime (para resaltarlos).
 */
export function useRealtimeAnimals() {
  const [animales, setAnimales] = useState<Map<string, AnimalMapa>>(new Map());
  const [recientes, setRecientes] = useState<Set<string>>(new Set());
  const [ultimoNuevo, setUltimoNuevo] = useState<AnimalMapa | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let activo = true;

    supabase
      .from("animals")
      .select(CAMPOS)
      .then(({ data }) => {
        if (!activo) return;
        // Lo que ya llegó por Realtime es más nuevo que la consulta inicial.
        setAnimales((prev) => {
          const mapa = new Map((data ?? []).map((a) => [a.id, a]));
          for (const [id, a] of prev) mapa.set(id, a);
          return mapa;
        });
        setCargando(false);
      });

    const marcarReciente = (id: string) => {
      setRecientes((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setRecientes((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }, SEGUNDOS_RESALTADO * 1000);
    };

    const canal = supabase
      .channel("mapa-animales")
      .on<Tables<"animals">>("postgres_changes", { event: "*", schema: "public", table: "animals" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = payload.old.id;
          if (!id) return;
          setAnimales((prev) => {
            const mapa = new Map(prev);
            mapa.delete(id);
            return mapa;
          });
          return;
        }
        const animal = aAnimalMapa(payload.new);
        setAnimales((prev) => new Map(prev).set(animal.id, animal));
        if (payload.eventType === "INSERT") {
          marcarReciente(animal.id);
          setUltimoNuevo(animal);
        }
      })
      .subscribe();

    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, []);

  return { animales, recientes, ultimoNuevo, cargando };
}
