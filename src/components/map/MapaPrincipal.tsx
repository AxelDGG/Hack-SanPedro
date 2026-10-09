"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Flame, LocateFixed, Sparkles } from "lucide-react";
import type L from "leaflet";
import { useRealtimeAnimals } from "@/hooks/useRealtimeAnimals";
import { useColonias } from "@/hooks/useColonias";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AnimalPreview } from "@/components/animal/AnimalPreview";
import { LogoMark } from "@/components/ui/Logo";
import { ESPECIES, ESTADOS, ESTADOS_EN_CALLE, FLUJO_ESTADOS, type Estado } from "@/lib/constants";
import type { Enfoque } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-arena" />,
});

export function MapaPrincipal() {
  const { animales, recientes, ultimoNuevo } = useRealtimeAnimals();
  const colonias = useColonias();
  const { posicion, estado: estadoGps } = useGeolocation();

  const [filtros, setFiltros] = useState<Set<Estado>>(() => new Set(FLUJO_ESTADOS));
  const [calorActivo, setCalorActivo] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enfoque, setEnfoque] = useState<Enfoque | null>(null);
  const [avisoDescartado, setAvisoDescartado] = useState<string | null>(null);

  const nombreColonia = useMemo(() => new Map(colonias.map((c) => [c.id, c.nombre])), [colonias]);
  const visibles = useMemo(() => [...animales.values()].filter((a) => filtros.has(a.estado)), [animales, filtros]);

  const calor = useMemo<L.HeatLatLngTuple[] | null>(
    () =>
      calorActivo
        ? visibles.filter((a) => ESTADOS_EN_CALLE.includes(a.estado)).map((a) => [a.lat, a.lng, 0.3 + a.urgencia * 0.14])
        : null,
    [calorActivo, visibles],
  );

  const animalSel = seleccionado ? animales.get(seleccionado) : undefined;
  const aviso = ultimoNuevo && ultimoNuevo.id !== avisoDescartado ? ultimoNuevo : null;

  // El aviso de "nuevo reporte" se oculta solo.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAvisoDescartado(aviso.id), 7000);
    return () => clearTimeout(t);
  }, [aviso]);

  function alternarFiltro(e: Estado) {
    setFiltros((prev) => {
      const s = new Set(prev);
      if (s.has(e)) s.delete(e);
      else s.add(e);
      return s.size === 0 ? new Set(FLUJO_ESTADOS) : s;
    });
  }

  function irA(lat: number, lng: number, zoom?: number) {
    setEnfoque({ lat, lng, zoom, clave: Date.now() });
  }

  return (
    <div className="relative h-[calc(100dvh-var(--nav-h))] w-full">
      <MapView
        animales={visibles}
        recientes={recientes}
        calor={calor}
        posicion={posicion}
        seleccionado={seleccionado}
        onSeleccionar={setSeleccionado}
        enfoque={enfoque}
      />

      {/* Barra superior: marca, conteo y filtros por estado */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1001] flex flex-col gap-2 p-3">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 py-1.5 pr-3 pl-1.5 shadow-md">
            <LogoMark className="size-8" />
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">
                Callejer<span className="text-terracota">OS</span>
              </p>
              <p className="text-[11px] font-semibold text-tinta-suave">
                {visibles.length} animales · <span className="text-salvia">● en vivo</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCalorActivo((v) => !v)}
            aria-pressed={calorActivo}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-bold shadow-md transition ${
              calorActivo ? "bg-terracota text-white" : "bg-white/95 text-tinta"
            }`}
          >
            <Flame className="size-4" /> Calor
          </button>
        </div>

        <div className="pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {FLUJO_ESTADOS.map((e) => {
            const activo = filtros.has(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => alternarFiltro(e)}
                aria-pressed={activo}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  activo ? "bg-white text-tinta" : "bg-white/60 text-tinta-suave line-through"
                }`}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: ESTADOS[e].color }} />
                {ESTADOS[e].label}
              </button>
            );
          })}
        </div>

        {aviso && (
          <button
            type="button"
            onClick={() => {
              setSeleccionado(aviso.id);
              irA(aviso.lat, aviso.lng);
              setAvisoDescartado(aviso.id);
            }}
            className="pointer-events-auto flex items-center gap-2 self-center rounded-2xl bg-tinta px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            <Sparkles className="size-4 text-ambar" />
            Nuevo reporte: {ESPECIES[aviso.especie].label.toLowerCase()}
            {aviso.colonia_id && nombreColonia.get(aviso.colonia_id) ? ` en ${nombreColonia.get(aviso.colonia_id)}` : ""}
            <span className="text-ambar">Ver</span>
          </button>
        )}
      </div>

      {/* Botón de ubicación */}
      <button
        type="button"
        onClick={() => posicion && irA(posicion.lat, posicion.lng, 16)}
        disabled={!posicion}
        title={estadoGps === "denegado" ? "Permite el acceso a tu ubicación" : "Mi ubicación"}
        aria-label="Centrar en mi ubicación"
        className={`absolute right-3 z-[1001] flex size-12 items-center justify-center rounded-2xl bg-white text-tinta shadow-md transition disabled:opacity-50 ${
          animalSel ? "bottom-48" : "bottom-4"
        }`}
      >
        <LocateFixed className={`size-6 ${posicion ? "text-estado-rescatado" : ""}`} />
      </button>

      {animalSel && (
        <div className="absolute inset-x-0 bottom-0 z-[1001] mx-auto max-w-lg p-3">
          <AnimalPreview
            animal={animalSel}
            colonia={animalSel.colonia_id ? nombreColonia.get(animalSel.colonia_id) : undefined}
            onCerrar={() => setSeleccionado(null)}
          />
        </div>
      )}
    </div>
  );
}
