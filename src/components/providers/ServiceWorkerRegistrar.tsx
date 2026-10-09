"use client";

import { useEffect } from "react";

/** Registra el service worker (base para instalar la PWA y, más adelante, notificaciones push). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Sin service worker la app funciona igual; solo no se ofrece instalación en algunos navegadores.
      });
    }
  }, []);
  return null;
}
