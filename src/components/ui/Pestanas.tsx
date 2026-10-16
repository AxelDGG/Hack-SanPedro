"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { RESORTE } from "@/lib/motion";

interface Props<T extends string> {
  opciones: readonly (readonly [valor: T, etiqueta: string])[];
  valor: T;
  onCambio: (valor: T) => void;
}

/** Pestañas tipo segmento: la pastilla blanca se desliza hacia la opción elegida. */
export function Pestanas<T extends string>({ opciones, valor, onCambio }: Props<T>) {
  const id = useId();

  return (
    <div
      className="grid gap-1 rounded-2xl bg-arena p-1 text-sm"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
      role="tablist"
    >
      {opciones.map(([v, etiqueta]) => {
        const activa = v === valor;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambio(v)}
            className={`relative rounded-xl py-2 font-bold transition-colors ${activa ? "text-tinta" : "text-tinta-suave"}`}
          >
            {activa && (
              <motion.span layoutId={`pestana-${id}`} className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={RESORTE} />
            )}
            <span className="relative">{etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}
