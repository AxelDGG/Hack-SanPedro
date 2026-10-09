"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Colonia {
  id: number;
  nombre: string;
  lat: number;
  lng: number;
}

let cache: Promise<Colonia[]> | null = null;

function cargarColonias() {
  cache ??= (async () => {
    const { data } = await createClient().from("colonias").select("id, nombre, lat, lng").order("nombre");
    return data ?? [];
  })();
  return cache;
}

/** Catálogo de colonias (se pide una sola vez por sesión). */
export function useColonias() {
  const [colonias, setColonias] = useState<Colonia[]>([]);

  useEffect(() => {
    let activo = true;
    void cargarColonias().then((c) => activo && setColonias(c));
    return () => {
      activo = false;
    };
  }, []);

  return colonias;
}
