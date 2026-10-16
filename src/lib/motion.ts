import type { Transition, Variants } from "motion/react";

/** Arranca rápido y frena suave: la curva base de toda la app. */
export const EASE_SOFT = [0.16, 1, 0.3, 1] as const;

/** Resorte para paneles, hojas y elementos que se reacomodan. */
export const RESORTE: Transition = { type: "spring", stiffness: 420, damping: 34 };

/** Resorte con rebote, para celebraciones e íconos que "saltan". */
export const RESORTE_REBOTE: Transition = { type: "spring", stiffness: 520, damping: 14 };

/** Contenedor que escalona la entrada de sus hijos (usar con `entrarArriba` o `entrarEscala`). */
export const escalonar = (cada = 0.05, retraso = 0): Variants => ({
  oculto: {},
  visible: { transition: { staggerChildren: cada, delayChildren: retraso } },
});

export const entrarArriba: Variants = {
  oculto: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_SOFT } },
};

export const entrarEscala: Variants = {
  oculto: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: RESORTE_REBOTE },
};
