"use client";

import { motion } from "motion/react";
import { FLUJO_ESTADOS, colorEstado, etiquetaEstado, type Estado, type TipoReporte } from "@/lib/constants";
import { EASE_SOFT } from "@/lib/motion";

/**
 * Recorrido del animal: avistado → en atención → rescatado → esterilizado → adoptado.
 * Una mascota perdida o encontrada tiene su propio camino corto: se busca → en casa.
 */
export function ProgresoEstado({ estado, tipo = "callejero" }: { estado: Estado; tipo?: TipoReporte }) {
  const flujo: Estado[] =
    tipo !== "callejero" && (estado === "avistado" || estado === "reunido") ? ["avistado", "reunido"] : FLUJO_ESTADOS;
  const actual = flujo.indexOf(estado);

  return (
    <ol
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${flujo.length}, minmax(0, 1fr))` }}
      aria-label={`Estado actual: ${etiquetaEstado(estado, tipo)}`}
    >
      {flujo.map((e, i) => {
        const hecho = i <= actual;
        return (
          <li key={e} className="flex flex-col items-center gap-1.5 text-center">
            <span className="relative h-2 w-full overflow-hidden rounded-full bg-arena-oscura">
              {/* Los tramos se llenan uno tras otro, como un camino recorrido. */}
              <motion.span
                className="absolute inset-0 origin-left rounded-full"
                style={{ backgroundColor: colorEstado(estado, tipo) }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: hecho ? 1 : 0 }}
                transition={{ delay: 0.2 + i * 0.14, duration: 0.45, ease: EASE_SOFT }}
              />
              {i === actual && (
                // Brillo que recorre el tramo actual.
                <motion.span
                  className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/60 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ delay: 0.9 + i * 0.14, duration: 1.2, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
                />
              )}
            </span>
            <span className={`text-[10px] leading-tight font-bold ${i === actual ? "text-tinta" : "text-tinta-suave/70"}`}>
              {etiquetaEstado(e, tipo)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
