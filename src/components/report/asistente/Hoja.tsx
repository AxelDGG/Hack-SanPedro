"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { RESORTE } from "@/lib/motion";

/** Hoja que sube desde abajo, encima del asistente, para tareas cortas (pegar texto, buscar). */
export function Hoja({
  abierta,
  titulo,
  onCerrar,
  children,
}: {
  abierta: boolean;
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {abierta && (
        <div className="fixed inset-0 z-[1250] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-tinta/40"
            onClick={onCerrar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-crema shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={RESORTE}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <h2 className="font-display text-xl font-semibold">{titulo}</h2>
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar"
                className="flex size-11 items-center justify-center rounded-full bg-arena"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
