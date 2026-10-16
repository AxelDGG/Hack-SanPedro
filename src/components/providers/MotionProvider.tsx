"use client";

import { MotionConfig } from "motion/react";

/** Respeta "reducir movimiento" del sistema: quita desplazamientos y deja solo fundidos. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
