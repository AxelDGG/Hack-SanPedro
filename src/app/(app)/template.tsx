"use client";

import { motion } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";

/** Se vuelve a montar en cada navegación: cada página entra con un fundido corto. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_SOFT }}>
      {children}
    </motion.div>
  );
}
