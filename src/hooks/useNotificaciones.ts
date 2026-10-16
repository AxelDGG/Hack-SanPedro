"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import type { Tables } from "@/types/database.types";

export type Notificacion = Tables<"notificaciones">;

/** Notificaciones del usuario (alertas de su colonia, avistamientos de su mascota…) en vivo. */
export function useNotificaciones(limite = 40) {
  const { user } = useSession();
  const userId = user?.id;
  const canalId = useId();
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let activo = true;

    void supabase
      .from("notificaciones")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limite)
      .then(({ data }) => {
        if (!activo) return;
        setLista(data ?? []);
        setCargando(false);
      });

    const canal = supabase
      .channel(`notificaciones-${userId}-${canalId}`)
      .on<Notificacion>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `user_id=eq.${userId}` },
        ({ new: n }) => setLista((prev) => [n, ...prev].slice(0, limite)),
      )
      .on<Notificacion>(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificaciones", filter: `user_id=eq.${userId}` },
        ({ new: n }) => setLista((prev) => prev.map((x) => (x.id === n.id ? n : x))),
      )
      .subscribe();

    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, [userId, limite, canalId]);

  const marcarLeidas = useCallback(async () => {
    if (!userId) return;
    setLista((prev) => prev.map((n) => ({ ...n, leida: true })));
    await createClient().from("notificaciones").update({ leida: true }).eq("user_id", userId).eq("leida", false);
  }, [userId]);

  return {
    lista,
    cargando: !!userId && cargando,
    noLeidas: lista.filter((n) => !n.leida).length,
    marcarLeidas,
  };
}
