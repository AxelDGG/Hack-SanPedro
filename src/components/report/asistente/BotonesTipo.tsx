"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, Eye, PawPrint, Search, type LucideIcon } from "lucide-react";
import { ORDEN_TIPOS, TIPOS, type TipoReporte } from "@/lib/constants";
import { entrarArriba, escalonar } from "@/lib/motion";

const ICONOS: Record<TipoReporte, LucideIcon> = { perdido: Search, encontrado: Eye, callejero: PawPrint };

/**
 * Los tres botones grandes de "¿Qué pasó?". Con `onElegir` funcionan dentro del asistente;
 * sin él son links (pantalla de inicio).
 */
export function BotonesTipo({ onElegir }: { onElegir?: (t: TipoReporte) => void }) {
  return (
    <motion.ul className="flex flex-col gap-3" variants={escalonar(0.07)} initial="oculto" animate="visible">
      {ORDEN_TIPOS.map((t) => {
        const Icono = ICONOS[t];
        const contenido = (
          <>
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
              style={{ backgroundColor: TIPOS[t].color }}
            >
              <Icono className="size-7" strokeWidth={2.4} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-left">
              <span className="font-display text-[1.4rem] leading-tight font-semibold">{TIPOS[t].accion}</span>
              <span className="text-base text-tinta-suave">{TIPOS[t].ayuda}</span>
            </span>
            <ChevronRight className="size-7 shrink-0 text-tinta-suave" />
          </>
        );
        const clase =
          "flex min-h-[5.5rem] w-full items-center gap-4 rounded-3xl bg-white px-4 py-3 ring-2 ring-arena-oscura transition active:scale-[0.98]";
        return (
          <motion.li key={t} variants={entrarArriba} whileTap={{ scale: 0.98 }}>
            {onElegir ? (
              <button type="button" onClick={() => onElegir(t)} className={clase} data-testid={`tipo-${t}`}>
                {contenido}
              </button>
            ) : (
              <Link href={`/reportar?tipo=${t}`} className={clase} data-testid={`tipo-${t}`}>
                {contenido}
              </Link>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
