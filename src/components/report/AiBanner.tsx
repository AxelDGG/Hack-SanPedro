"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, LoaderCircle, Sparkles } from "lucide-react";
import { CONDICIONES, ESPECIES, URGENCIAS } from "@/lib/constants";
import { EASE_SOFT, RESORTE_REBOTE } from "@/lib/motion";
import type { RespuestaAnalisis } from "@/lib/ai/schema";

export type EstadoIA =
  | { tipo: "inactivo" }
  | { tipo: "analizando" }
  | { tipo: "listo"; respuesta: RespuestaAnalisis }
  | { tipo: "error"; mensaje: string };

/** Resultado del análisis de la foto; los campos del formulario ya vienen prellenados. */
export function AiBanner({ estado }: { estado: EstadoIA }) {
  // Cada cambio de estado (analizando → listo / error) se funde con el siguiente.
  return (
    <AnimatePresence mode="wait" initial={false}>
      {estado.tipo !== "inactivo" && (
        <motion.div
          key={estado.tipo}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.3, ease: EASE_SOFT }}
        >
          <Contenido estado={estado} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Contenido({ estado }: { estado: Exclude<EstadoIA, { tipo: "inactivo" }> }) {
  if (estado.tipo === "analizando") {
    return (
      <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-tinta px-4 py-3 text-sm font-semibold text-white">
        {/* Barrido de luz, como un escáner recorriendo la foto. */}
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-ambar/25 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <LoaderCircle className="relative size-5 animate-spin text-ambar" />
        <span className="relative">La IA está analizando la foto…</span>
      </div>
    );
  }

  if (estado.tipo === "error") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-ambar/15 px-4 py-3 text-sm text-tinta">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ambar" />
        <p>
          {estado.mensaje} <span className="text-tinta-suave">Llena los datos a mano.</span>
        </p>
      </div>
    );
  }

  const { analisis: a, fuente } = estado.respuesta;

  if (!a.es_animal) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-ambar/15 px-4 py-3 text-sm text-tinta">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ambar" />
        <p>No parece haber un animal en la foto. Si sí lo hay, corrige los datos abajo.</p>
      </div>
    );
  }

  const condiciones = a.condiciones.map((c) => CONDICIONES[c].label.toLowerCase()).join(", ");

  return (
    <div className="rounded-2xl bg-tinta px-4 py-3 text-white" data-testid="ai-resultado">
      <p className="flex items-center gap-2 text-sm font-bold">
        <motion.span
          className="shrink-0"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...RESORTE_REBOTE, delay: 0.15 }}
        >
          <Sparkles className="size-4 text-ambar" />
        </motion.span>
        La IA detectó: {ESPECIES[a.especie].label}
        {condiciones && ` · ${condiciones}`} · urgencia {URGENCIAS[a.urgencia].toLowerCase()}
      </p>
      <p className="mt-1 text-sm text-white/80">{a.resumen}</p>
      <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-white/60 uppercase">
        {fuente === "simulado" ? "Análisis simulado (modo demo)" : `Confianza ${Math.round(a.confianza * 100)}%`} ·
        puedes corregir abajo
      </p>
    </div>
  );
}
