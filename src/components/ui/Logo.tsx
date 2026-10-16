"use client";

import { motion, type Variants } from "motion/react";
import { RESORTE_REBOTE } from "@/lib/motion";

const DEDOS = [
  { cx: 207, cy: 186, rx: 15, ry: 20, giro: -22 },
  { cx: 238, cy: 160, rx: 15, ry: 21, giro: -7 },
  { cx: 274, cy: 160, rx: 15, ry: 21, giro: 7 },
  { cx: 305, cy: 186, rx: 15, ry: 20, giro: 22 },
];

// Los deditos aparecen uno por uno y "saludan" al pasar el cursor (custom = índice).
const dedo: Variants = {
  oculto: { scale: 0 },
  visible: (i: number) => ({ scale: 1, y: 0, transition: { ...RESORTE_REBOTE, delay: 0.2 + i * 0.07 } }),
  saludo: (i: number) => ({ y: [0, -40, 0], transition: { duration: 0.4, delay: i * 0.06 } }),
};

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 512 512" className={className} aria-hidden="true" initial="oculto" animate="visible" whileHover="saludo">
      <rect width="512" height="512" rx="112" fill="#e2583e" />
      <path
        d="M256 84c-72 0-130 57-130 128 0 95 130 212 130 212s130-117 130-212c0-71-58-128-130-128z"
        fill="#fff8ee"
      />
      <g fill="#e2583e">
        <motion.path
          d="M256 214c-26 0-50 22-50 42 0 15 12 22 25 20 9-1 16-5 25-5s16 4 25 5c13 2 25-5 25-20 0-20-24-42-50-42z"
          variants={{ oculto: { scale: 0 }, visible: { scale: 1, transition: RESORTE_REBOTE } }}
        />
        {DEDOS.map((d, i) => (
          <motion.g key={i} custom={i} variants={dedo}>
            <ellipse cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} transform={`rotate(${d.giro} ${d.cx} ${d.cy})`} />
          </motion.g>
        ))}
      </g>
    </motion.svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight">
        Callejer<span className="text-terracota">OS</span>
      </span>
    </span>
  );
}
