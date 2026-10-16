"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";

interface Props {
  valor: number;
  /** Segundos que tarda en llegar al valor. */
  duracion?: number;
  retraso?: number;
  className?: string;
}

/** Número que cuenta desde 0 (o desde el valor anterior) hasta `valor`. */
export function NumeroAnimado({ valor, duracion = 1.1, retraso = 0, className = "" }: Props) {
  const reducir = useReducedMotion();
  const actual = useMotionValue(reducir ? valor : 0);
  const texto = useTransform(actual, (v) => String(Math.round(v)));

  useEffect(() => {
    if (reducir) {
      actual.set(valor);
      return;
    }
    const controles = animate(actual, valor, { duration: duracion, delay: retraso, ease: EASE_SOFT });
    return () => controles.stop();
  }, [actual, valor, duracion, retraso, reducir]);

  return <motion.span className={`tabular-nums ${className}`}>{texto}</motion.span>;
}
