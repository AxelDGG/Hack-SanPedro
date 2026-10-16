/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_SOFT, RESORTE } from "@/lib/motion";

/** Foto principal grande y miniaturas de todos los avistamientos. */
export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [activa, setActiva] = useState(0);
  const principal = fotos[activa] ?? fotos[0];
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-arena">
        {/* Fundido con un leve zoom al cambiar de foto. */}
        <AnimatePresence initial={false}>
          {principal && (
            <motion.img
              key={principal}
              src={principal}
              alt={alt}
              className="absolute inset-0 size-full object-cover"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE_SOFT }}
            />
          )}
        </AnimatePresence>
      </div>
      {fotos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto p-1" aria-label="Fotos de los avistamientos">
          {fotos.map((f, i) => (
            <li key={f}>
              <motion.button
                type="button"
                onClick={() => setActiva(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === activa}
                whileTap={{ scale: 0.92 }}
                className="relative block size-16 rounded-xl"
              >
                <img
                  src={f}
                  alt=""
                  className={`size-full rounded-xl object-cover transition-opacity ${i === activa ? "" : "opacity-70"}`}
                />
                {/* El marco se desliza de una miniatura a otra. */}
                {i === activa && (
                  <motion.span
                    layoutId={`marco-${id}`}
                    className="absolute -inset-0.5 rounded-[14px] ring-2 ring-terracota"
                    transition={RESORTE}
                  />
                )}
              </motion.button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
