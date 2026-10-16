"use client";

import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { fechaCorta } from "@/lib/format";
import { EASE_SOFT, entrarEscala, escalonar } from "@/lib/motion";
import type { Insignia } from "@/hooks/useGamificacion";
import { iconoInsignia } from "./insignias";

export function GridInsignias({ insignias }: { insignias: Insignia[] }) {
  return (
    <motion.ul
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      data-testid="insignias"
      variants={escalonar(0.06)}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
    >
      {insignias.map((b, i) => {
        const Icono = iconoInsignia(b.icono);
        const ganada = b.otorgada_at !== null;
        return (
          <motion.li
            key={b.codigo}
            variants={entrarEscala}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center ring-1 ${
              ganada ? "bg-white ring-terracota/30" : "bg-arena/50 ring-arena-oscura"
            }`}
            aria-label={`${b.nombre}: ${ganada ? "obtenida" : `${Math.round(b.progreso * 100)}% de avance`}`}
          >
            <motion.span
              className={`relative flex size-12 items-center justify-center rounded-full ${
                ganada ? "overflow-hidden bg-terracota text-white" : "bg-arena-oscura/60 text-tinta-suave"
              }`}
              whileHover={ganada ? { rotate: [0, -12, 10, -6, 0], scale: 1.08 } : undefined}
              whileTap={{ scale: 0.9 }}
            >
              <Icono className="relative size-6" />
              {ganada && (
                // Destello que cruza la insignia una vez.
                <motion.span
                  className="absolute inset-y-0 -left-full w-full bg-linear-to-r from-transparent via-white/55 to-transparent"
                  style={{ skewX: -12 }}
                  animate={{ x: ["0%", "220%"] }}
                  transition={{ delay: 0.7 + i * 0.08, duration: 0.9, ease: EASE_SOFT }}
                />
              )}
              {!ganada && (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-white ring-2 ring-arena">
                  <Lock className="size-3" />
                </span>
              )}
            </motion.span>
            <span className="font-display text-sm leading-tight font-semibold">{b.nombre}</span>
            <span className="text-[11px] leading-tight text-tinta-suave">{b.descripcion}</span>
            {ganada ? (
              <span className="text-[10px] font-bold tracking-wide text-terracota uppercase">{fechaCorta(b.otorgada_at!)}</span>
            ) : (
              <span className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-arena-oscura/50">
                <motion.span
                  className="block h-full origin-left rounded-full bg-terracota/70"
                  style={{ width: `${b.progreso * 100}%` }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.8, ease: EASE_SOFT }}
                />
              </span>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
