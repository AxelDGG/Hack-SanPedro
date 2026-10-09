"use client";

import { AlertTriangle, LoaderCircle, Sparkles } from "lucide-react";
import { CONDICIONES, ESPECIES, URGENCIAS } from "@/lib/constants";
import type { RespuestaAnalisis } from "@/lib/ai/schema";

export type EstadoIA =
  | { tipo: "inactivo" }
  | { tipo: "analizando" }
  | { tipo: "listo"; respuesta: RespuestaAnalisis }
  | { tipo: "error"; mensaje: string };

/** Resultado del análisis de la foto; los campos del formulario ya vienen prellenados. */
export function AiBanner({ estado }: { estado: EstadoIA }) {
  if (estado.tipo === "inactivo") return null;

  if (estado.tipo === "analizando") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-tinta px-4 py-3 text-sm font-semibold text-white">
        <LoaderCircle className="size-5 animate-spin text-ambar" />
        La IA está analizando la foto…
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
        <Sparkles className="size-4 text-ambar" />
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
