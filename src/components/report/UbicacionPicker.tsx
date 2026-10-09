"use client";

import dynamic from "next/dynamic";
import { Crosshair, MapPin } from "lucide-react";
import type { Especie } from "@/lib/constants";
import type { Posicion } from "@/hooks/useGeolocation";

const MiniMapa = dynamic(() => import("./MiniMapa"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-arena" />,
});

interface Props {
  ubicacion: { lat: number; lng: number };
  manual: boolean;
  gps: { posicion: Posicion | null; estado: string };
  especie: Especie;
  onMover: (lat: number, lng: number) => void;
  onUsarGps: () => void;
}

export function UbicacionPicker({ ubicacion, manual, gps, especie, onMover, onUsarGps }: Props) {
  let estado: string;
  if (manual) estado = "Ubicación ajustada a mano";
  else if (gps.posicion) estado = `Tu ubicación actual (±${Math.round(gps.posicion.precision)} m)`;
  else if (gps.estado === "denegado") estado = "Sin permiso de ubicación: mueve el pin al lugar";
  else if (gps.estado === "buscando") estado = "Buscando tu ubicación…";
  else estado = "GPS no disponible: mueve el pin al lugar";

  return (
    <div className="flex flex-col gap-2">
      <div className="h-44 overflow-hidden rounded-2xl ring-1 ring-arena-oscura">
        <MiniMapa lat={ubicacion.lat} lng={ubicacion.lng} especie={especie} onMover={onMover} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-tinta-suave">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {estado}
        </span>
        {manual && gps.posicion && (
          <button type="button" onClick={onUsarGps} className="flex items-center gap-1 text-estado-rescatado">
            <Crosshair className="size-3.5" /> Usar GPS
          </button>
        )}
      </div>
    </div>
  );
}
