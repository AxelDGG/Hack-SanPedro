"use client";

import { motion } from "motion/react";
import { PawPrint } from "lucide-react";

const PASOS = 4;

/** Huellitas que aparecen una tras otra, como si un perrito caminara. Sirve de cargador. */
export function HuellasCaminando({ etiqueta = "Cargando", className = "" }: { etiqueta?: string; className?: string }) {
  return (
    <span role="img" aria-label={etiqueta} className={`inline-flex items-center gap-1 ${className}`}>
      {Array.from({ length: PASOS }, (_, i) => (
        // Pasos alternados arriba/abajo, como pata izquierda y derecha.
        <span key={i} className={i % 2 ? "mt-4" : "mb-4"}>
          <motion.span
            className="block"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.1, 1, 0.9] }}
            transition={{ duration: 1.8, times: [0, 0.15, 0.65, 1], repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
          >
            <PawPrint className="size-6 rotate-90 fill-current" />
          </motion.span>
        </span>
      ))}
    </span>
  );
}
