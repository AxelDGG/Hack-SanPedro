"use client";

import { useMemo, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { useColonias } from "@/hooks/useColonias";
import { coloniaMasCercana } from "@/lib/geo/zonas";
import type { TipoReporte } from "@/lib/constants";
import type { Posicion } from "@/hooks/useGeolocation";
import { UbicacionPicker } from "../UbicacionPicker";
import { Grupo, Opciones, Pregunta } from "./controles";

const CUANDO: [string, string][] = [
  ["0", "Hoy"],
  ["1", "Ayer"],
  ["3", "Hace unos días"],
  ["7", "Hace una semana o más"],
];

interface Props {
  tipo: TipoReporte | null;
  confirmacion: boolean;
  especie: "perro" | "gato";
  ubicacion: { lat: number; lng: number };
  manual: boolean;
  gps: { posicion: Posicion | null; estado: string };
  perdidoDesde: string | null;
  onMover: (lat: number, lng: number) => void;
  onUsarGps: () => void;
  onCuando: (iso: string) => void;
}

export function PasoDonde({ tipo, confirmacion, especie, ubicacion, manual, gps, perdidoDesde, onMover, onUsarGps, onCuando }: Props) {
  const colonias = useColonias();
  const actual = useMemo(
    () => coloniaMasCercana([ubicacion.lat, ubicacion.lng], colonias),
    [ubicacion.lat, ubicacion.lng, colonias],
  );
  const perdido = tipo === "perdido" && !confirmacion;
  // Referencia fija para saber qué opción de "¿Cuándo?" corresponde a la fecha guardada.
  const [ahora] = useState(() => Date.now());

  const diasAtras = perdidoDesde
    ? String(
        CUANDO.map(([d]) => Number(d))
          .reverse()
          .find((d) => ahora - new Date(perdidoDesde).getTime() >= (d - 0.5) * 86_400_000) ?? 0,
      )
    : null;

  return (
    <div className="flex flex-col gap-5">
      <Pregunta
        titulo={perdido ? "¿Dónde se perdió?" : "¿Dónde lo viste?"}
        ayuda={perdido ? "Elige tu colonia o mueve el pin al lugar exacto." : "Usamos tu ubicación. Si no es ahí, mueve el pin."}
      />

      <UbicacionPicker
        ubicacion={ubicacion}
        manual={manual}
        gps={gps}
        especie={especie}
        onMover={onMover}
        onUsarGps={onUsarGps}
        alto="h-56"
      />

      {gps.posicion && manual && (
        <button
          type="button"
          onClick={onUsarGps}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold ring-2 ring-arena-oscura"
        >
          <Crosshair className="size-5" /> Usar mi ubicación actual
        </button>
      )}

      <Grupo titulo="Colonia" ayuda={actual ? undefined : "Cargando…"}>
        <div className="relative">
          <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-terracota" />
          <select
            value={actual?.id ?? ""}
            onChange={(e) => {
              const c = colonias.find((x) => x.id === Number(e.target.value));
              if (c) onMover(c.lat, c.lng);
            }}
            aria-label="Colonia"
            className="min-h-14 w-full appearance-none rounded-2xl border-2 border-arena-oscura bg-white pr-4 pl-12 font-display text-lg font-medium outline-none focus:border-terracota"
            data-testid="colonia-reporte"
          >
            {colonias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </Grupo>

      {perdido && (
        <Grupo titulo="¿Cuándo se perdió?">
          <Opciones
            nombre="cuando"
            columnas={2}
            opciones={CUANDO}
            valor={diasAtras}
            onCambio={(d) => {
              const f = new Date();
              f.setDate(f.getDate() - Number(d));
              onCuando(f.toISOString());
            }}
          />
        </Grupo>
      )}
    </div>
  );
}
