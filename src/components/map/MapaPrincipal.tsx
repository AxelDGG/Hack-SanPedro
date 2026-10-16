"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Flame, LocateFixed, Sparkles } from "lucide-react";
import type L from "leaflet";
import { useRealtimeAnimals } from "@/hooks/useRealtimeAnimals";
import { useColonias } from "@/hooks/useColonias";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AnimalPreview } from "@/components/animal/AnimalPreview";
import { LogoMark } from "@/components/ui/Logo";
import { NumeroAnimado } from "@/components/ui/NumeroAnimado";
import { ESPECIES, ESTADOS_EN_CALLE, ESTADOS_RESUELTOS, ORDEN_TIPOS, TIPOS, type TipoReporte } from "@/lib/constants";
import { EASE_SOFT, RESORTE, RESORTE_REBOTE } from "@/lib/motion";
import type { Enfoque } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-arena" />,
});

export function MapaPrincipal() {
  const { animales, recientes, ultimoNuevo } = useRealtimeAnimals();
  const colonias = useColonias();
  const { posicion, estado: estadoGps } = useGeolocation();

  const [tipos, setTipos] = useState<Set<TipoReporte>>(() => new Set(ORDEN_TIPOS));
  const [verResueltos, setVerResueltos] = useState(false);
  const [calorActivo, setCalorActivo] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enfoque, setEnfoque] = useState<Enfoque | null>(null);
  const [avisoDescartado, setAvisoDescartado] = useState<string | null>(null);

  const nombreColonia = useMemo(() => new Map(colonias.map((c) => [c.id, c.nombre])), [colonias]);
  const visibles = useMemo(
    () =>
      [...animales.values()].filter(
        (a) => !a.fusionado_en && tipos.has(a.tipo) && (verResueltos || !ESTADOS_RESUELTOS.includes(a.estado)),
      ),
    [animales, tipos, verResueltos],
  );

  const calor = useMemo<L.HeatLatLngTuple[] | null>(
    () =>
      calorActivo
        ? visibles
            .filter((a) => a.tipo === "callejero" && ESTADOS_EN_CALLE.includes(a.estado))
            .map((a) => [a.lat, a.lng, 0.3 + a.urgencia * 0.14])
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

  function alternarTipo(t: TipoReporte) {
    setTipos((prev) => {
      const s = new Set(prev);
      if (s.has(t)) s.delete(t);
      else s.add(t);
      return s.size === 0 ? new Set(ORDEN_TIPOS) : s;
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
        <motion.div
          className="pointer-events-auto flex items-center justify-between gap-2"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_SOFT }}
        >
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 py-1.5 pr-3 pl-1.5 shadow-md">
            <LogoMark className="size-8" />
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">
                Callejer<span className="text-terracota">OS</span>
              </p>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-tinta-suave">
                <NumeroAnimado valor={visibles.length} duracion={0.6} /> animales ·
                <span className="relative ml-0.5 flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-salvia/60" />
                  <span className="relative size-2 rounded-full bg-salvia" />
                </span>
                <span className="text-salvia">en vivo</span>
              </p>
            </div>
          </div>
          <motion.button
            type="button"
            onClick={() => setCalorActivo((v) => !v)}
            aria-pressed={calorActivo}
            whileTap={{ scale: 0.92 }}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-bold shadow-md transition-colors ${
              calorActivo ? "bg-terracota text-white" : "bg-white/95 text-tinta"
            }`}
          >
            {/* Con el calor activo, la flama "arde". */}
            <motion.span
              className="block"
              animate={calorActivo ? { scale: [1, 1.2, 0.95, 1.1, 1], rotate: [0, -8, 6, -4, 0] } : { scale: 1, rotate: 0 }}
              transition={calorActivo ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            >
              <Flame className={`size-4 ${calorActivo ? "fill-ambar text-ambar" : ""}`} />
            </motion.span>
            Calor
          </motion.button>
        </motion.div>

        <div className="pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {ORDEN_TIPOS.map((t, i) => {
            const activo = tipos.has(t);
            return (
              <motion.button
                key={t}
                type="button"
                onClick={() => alternarTipo(t)}
                aria-pressed={activo}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.05, duration: 0.4, ease: EASE_SOFT } }}
                whileTap={{ scale: 0.9 }}
                className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold shadow-sm transition-colors ${
                  activo ? "bg-white text-tinta" : "bg-white/60 text-tinta-suave line-through"
                }`}
                data-testid={`filtro-${t}`}
              >
                <motion.span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: t === "callejero" ? "#e34948" : TIPOS[t].color }}
                  animate={{ scale: activo ? 1 : 0.6 }}
                  transition={RESORTE_REBOTE}
                />
                {t === "perdido" ? "Se buscan" : t === "encontrado" ? "Encontrados" : "Callejeros"}
              </motion.button>
            );
          })}
          <motion.button
            type="button"
            onClick={() => setVerResueltos((v) => !v)}
            aria-pressed={verResueltos}
            whileTap={{ scale: 0.9 }}
            className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold shadow-sm transition-colors ${
              verResueltos ? "bg-salvia text-white" : "bg-white/60 text-tinta-suave"
            }`}
          >
            Resueltos
          </motion.button>
        </div>

        <AnimatePresence>
          {aviso && (
            <motion.button
              key={aviso.id}
              type="button"
              onClick={() => {
                setSeleccionado(aviso.id);
                irA(aviso.lat, aviso.lng);
                setAvisoDescartado(aviso.id);
              }}
              initial={{ opacity: 0, y: -14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
              transition={RESORTE_REBOTE}
              whileTap={{ scale: 0.96 }}
              className="pointer-events-auto flex items-center gap-2 self-center rounded-2xl bg-tinta px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
            >
              <motion.span
                className="block"
                animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
              >
                <Sparkles className="size-4 text-ambar" />
              </motion.span>
              {aviso.tipo === "perdido" ? "Se busca" : "Nuevo reporte"}: {ESPECIES[aviso.especie].label.toLowerCase()}
              {aviso.colonia_id && nombreColonia.get(aviso.colonia_id) ? ` en ${nombreColonia.get(aviso.colonia_id)}` : ""}
              <span className="text-ambar">Ver</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Botón de ubicación: sube junto con la tarjeta del animal. */}
      <motion.button
        type="button"
        onClick={() => posicion && irA(posicion.lat, posicion.lng, 16)}
        disabled={!posicion}
        title={estadoGps === "denegado" ? "Permite el acceso a tu ubicación" : "Mi ubicación"}
        aria-label="Centrar en mi ubicación"
        animate={{ y: animalSel ? -176 : 0 }}
        transition={RESORTE}
        whileTap={{ scale: 0.9 }}
        className="absolute right-3 bottom-4 z-[1001] flex size-12 items-center justify-center rounded-2xl bg-white text-tinta shadow-md transition-opacity disabled:opacity-50"
      >
        <LocateFixed className={`size-6 transition-colors ${posicion ? "text-estado-rescatado" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {animalSel && (
          <motion.div
            key={animalSel.id}
            className="absolute inset-x-0 bottom-0 z-[1001] mx-auto max-w-lg p-3"
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97, transition: { duration: 0.2 } }}
            transition={RESORTE}
          >
            <AnimalPreview
              animal={animalSel}
              colonia={animalSel.colonia_id ? nombreColonia.get(animalSel.colonia_id) : undefined}
              onCerrar={() => setSeleccionado(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
