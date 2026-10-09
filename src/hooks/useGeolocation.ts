"use client";

import { useEffect, useState } from "react";

export interface Posicion {
  lat: number;
  lng: number;
  precision: number;
}

type Estado = "buscando" | "ok" | "denegado" | "no-disponible";

/** Sigue la ubicación del dispositivo mientras el componente esté montado. */
export function useGeolocation(activo = true) {
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [estado, setEstado] = useState<Estado>("buscando");

  useEffect(() => {
    if (!activo) return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setEstado("no-disponible"));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPosicion({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy });
        setEstado("ok");
      },
      (err) => setEstado(err.code === err.PERMISSION_DENIED ? "denegado" : "no-disponible"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [activo]);

  return { posicion, estado };
}
