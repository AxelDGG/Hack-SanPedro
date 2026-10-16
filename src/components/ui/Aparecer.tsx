"use client";

import { motion } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";

/** Envoltura para páginas de servidor: el bloque entra subiendo y con fundido. */
export function Aparecer({
  children,
  retraso = 0,
  className,
}: {
  children: React.ReactNode;
  retraso?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE_SOFT, delay: retraso }}
    >
      {children}
    </motion.div>
  );
}
