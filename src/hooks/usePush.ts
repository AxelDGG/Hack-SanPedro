"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EstadoPush = "cargando" | "no-soportado" | "bloqueado" | "inactivo" | "activo";

function base64AUint8(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

/** Suscribe este navegador a notificaciones push (el service worker ya sabe mostrarlas). */
export function usePush(userId: string | undefined) {
  const [estado, setEstado] = useState<EstadoPush>("cargando");
  const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!clave || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (activo) setEstado("no-soportado");
        return;
      }
      if (Notification.permission === "denied") {
        if (activo) setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (activo) setEstado(sub ? "activo" : "inactivo");
    })();
    return () => {
      activo = false;
    };
  }, [clave]);

  const activar = useCallback(async () => {
    if (!userId || !clave) return false;
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
      setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(clave) }));
    const json = sub.toJSON();
    const supabase = createClient();
    // Un endpoint por navegador: si ya existía (otro inicio de sesión), se reemplaza.
    await supabase.from("push_suscripciones").delete().eq("endpoint", sub.endpoint);
    const { error } = await supabase.from("push_suscripciones").insert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    });
    if (error && error.code !== "23505") throw error;
    await supabase.from("perfiles_privados").upsert({ user_id: userId, alertas_push: true });
    setEstado("activo");
    return true;
  }, [userId, clave]);

  const desactivar = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await createClient().from("push_suscripciones").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("inactivo");
  }, []);

  return { estado, activar, desactivar };
}
