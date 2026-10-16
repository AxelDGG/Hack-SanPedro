/* eslint-disable @next/next/no-img-element -- miniaturas de Storage o placeholders locales */
"use client";

import { motion } from "motion/react";
import { Camera, Eye, Sparkles } from "lucide-react";
import { ESTADOS } from "@/lib/constants";
import { fechaCorta, haceCuanto } from "@/lib/format";
import { EASE_SOFT, RESORTE, RESORTE_REBOTE } from "@/lib/motion";
import type { AvistamientoFicha, CambioFicha } from "@/hooks/useFichaAnimal";

type Evento =
  | { tipo: "avistamiento"; fecha: string; dato: AvistamientoFicha }
  | { tipo: "estado"; fecha: string; dato: CambioFicha };

/** Historia del animal: avistamientos y cambios de estado, del más reciente al más antiguo. */
export function LineaDeTiempo({ avistamientos, cambios }: { avistamientos: AvistamientoFicha[]; cambios: CambioFicha[] }) {
  const eventos: Evento[] = [
    ...avistamientos.map((a) => ({ tipo: "avistamiento" as const, fecha: a.created_at, dato: a })),
    ...cambios.map((c) => ({ tipo: "estado" as const, fecha: c.created_at, dato: c })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <ol className="relative flex flex-col gap-4 border-l-2 border-arena-oscura pl-5" data-testid="linea-tiempo">
      {/* Cada evento aparece al entrar en pantalla; los nuevos (Realtime) empujan a los demás con suavidad. */}
      {eventos.map((e) => (
        <motion.li
          key={`${e.tipo}-${e.dato.id}`}
          className="relative"
          layout="position"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: EASE_SOFT, layout: RESORTE }}
        >
          {e.tipo === "estado" ? <EventoEstado cambio={e.dato} /> : <EventoAvistamiento avistamiento={e.dato} />}
        </motion.li>
      ))}
    </ol>
  );
}

function Punto({ color, children }: { color: string; children?: React.ReactNode }) {
  return (
    <motion.span
      className="absolute top-0.5 -left-[31px] flex size-5 items-center justify-center rounded-full text-white ring-4 ring-crema"
      style={{ backgroundColor: color }}
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ ...RESORTE_REBOTE, delay: 0.1 }}
    >
      {children}
    </motion.span>
  );
}

function Fecha({ fecha }: { fecha: string }) {
  return (
    <time dateTime={fecha} title={fechaCorta(fecha)} className="text-xs font-semibold text-tinta-suave">
      {haceCuanto(fecha)}
    </time>
  );
}

function EventoEstado({ cambio }: { cambio: CambioFicha }) {
  const { label, color } = ESTADOS[cambio.estado_nuevo];
  return (
    <div>
      <Punto color={color} />
      <p className="font-display font-semibold" style={{ color }}>
        {label}
      </p>
      <p className="text-sm text-tinta-suave">
        {cambio.autor?.nombre ?? "Alguien"}
        {cambio.nota && ` · ${cambio.nota}`}
      </p>
      <Fecha fecha={cambio.created_at} />
    </div>
  );
}

function EventoAvistamiento({ avistamiento: a }: { avistamiento: AvistamientoFicha }) {
  const resumenIA =
    a.analisis_ia && typeof a.analisis_ia === "object" && !Array.isArray(a.analisis_ia)
      ? (a.analisis_ia.resumen as string | undefined)
      : undefined;

  return (
    <div>
      <Punto color={a.es_confirmacion ? "#6b5b4d" : "#e2583e"}>
        {a.es_confirmacion ? <Eye className="size-3" /> : <Camera className="size-3" />}
      </Punto>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">{a.es_confirmacion ? "Lo vieron de nuevo" : "Primer reporte"}</p>
          <p className="text-sm text-tinta-suave">por {a.autor?.nombre ?? "un vecino"}</p>
          {a.notas && <p className="mt-1 text-sm">“{a.notas}”</p>}
          {resumenIA && (
            <p className="mt-1 flex items-start gap-1 text-xs text-tinta-suave">
              <Sparkles className="mt-0.5 size-3 shrink-0 text-ambar" /> {resumenIA}
            </p>
          )}
          <Fecha fecha={a.created_at} />
        </div>
        {a.foto_url && <img src={a.foto_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />}
      </div>
    </div>
  );
}
