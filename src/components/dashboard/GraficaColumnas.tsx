"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_SOFT } from "@/lib/motion";

export interface Serie {
  clave: string;
  etiqueta: string;
  color: string;
  valores: number[];
}

interface Props {
  titulo: string;
  categorias: string[];
  series: Serie[];
}

const ANCHO = 360;
const ALTO = 190;
const MARGEN = { arriba: 16, derecha: 8, abajo: 26, izquierda: 28 };
const MAX_BARRA = 24;
const HUECO = 2;

/** Ticks "limpios" para el eje Y (0, 5, 10… o 0, 10, 20…). */
function ticks(max: number) {
  const paso = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : 20;
  const tope = Math.max(paso, Math.ceil(max / paso) * paso);
  return Array.from({ length: tope / paso + 1 }, (_, i) => i * paso);
}

/** Columna con esquinas superiores redondeadas (4 px) y base recta. */
function columna(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Columnas (agrupadas si hay varias series) en SVG: un solo eje, barras delgadas,
 * leyenda para 2+ series, tooltip por mes (hover y teclado) y tabla accesible.
 */
export function GraficaColumnas({ titulo, categorias, series }: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((s) => s.valores));
  const escala = ticks(max);
  const tope = escala[escala.length - 1];

  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const banda = anchoUtil / categorias.length;
  const barra = Math.min(MAX_BARRA, (banda * 0.7 - HUECO * (series.length - 1)) / series.length);
  const grupo = barra * series.length + HUECO * (series.length - 1);
  const y = (v: number) => MARGEN.arriba + altoUtil - (v / tope) * altoUtil;

  return (
    <figure className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg font-semibold">{titulo}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-3 text-xs font-semibold text-tinta-suave">
            {series.map((s) => (
              <span key={s.clave} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} /> {s.etiqueta}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div className="relative">
        <motion.svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full"
          role="group"
          aria-label={titulo}
          initial="oculto"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {escala.map((t) => (
            <g key={t}>
              <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c3b59c" : "#ece2d0"} strokeWidth={1} />
              <text x={MARGEN.izquierda - 6} y={y(t) + 3.5} textAnchor="end" className="fill-tinta-suave text-[10px]">
                {t}
              </text>
            </g>
          ))}

          {categorias.map((cat, i) => {
            const x0 = MARGEN.izquierda + banda * i + (banda - grupo) / 2;
            const resaltado = activo === null || activo === i;
            return (
              <g
                key={cat}
                tabIndex={0}
                role="img"
                aria-label={`${cat}: ${series.map((s) => `${s.etiqueta} ${s.valores[i]}`).join(", ")}`}
                onPointerEnter={() => setActivo(i)}
                onPointerLeave={() => setActivo(null)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                className="outline-none"
              >
                {/* Área de toque: toda la banda del mes. */}
                <rect x={MARGEN.izquierda + banda * i} y={MARGEN.arriba} width={banda} height={altoUtil} fill="transparent" />
                {series.map((s, j) => {
                  const v = s.valores[i];
                  const alto = (v / tope) * altoUtil;
                  // Las columnas crecen desde el eje, mes por mes.
                  return v > 0 ? (
                    <motion.path
                      key={s.clave}
                      d={columna(x0 + j * (barra + HUECO), y(v), barra, alto)}
                      fill={s.color}
                      className="transition-opacity"
                      style={{ originY: 1, opacity: resaltado ? 1 : 0.35 }}
                      variants={{
                        oculto: { scaleY: 0 },
                        visible: { scaleY: 1, transition: { duration: 0.6, ease: EASE_SOFT, delay: i * 0.06 + j * 0.03 } },
                      }}
                    />
                  ) : null;
                })}
                <text
                  x={MARGEN.izquierda + banda * i + banda / 2}
                  y={ALTO - 8}
                  textAnchor="middle"
                  className={`text-[10px] ${activo === i ? "fill-tinta font-bold" : "fill-tinta-suave"}`}
                >
                  {cat}
                </text>
              </g>
            );
          })}
        </motion.svg>

        <AnimatePresence>
          {activo !== null && (
            <motion.div
              role="tooltip"
              className="pointer-events-none absolute top-0 rounded-xl bg-tinta px-3 py-2 text-xs text-white shadow-lg"
              style={{
                left: `${((MARGEN.izquierda + banda * (activo + 0.5)) / ANCHO) * 100}%`,
                x: activo > categorias.length / 2 ? "-100%" : "0%",
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: EASE_SOFT }}
            >
              <p className="mb-1 font-bold">{categorias[activo]}</p>
              {series.map((s) => (
                <p key={s.clave} className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded" style={{ backgroundColor: s.color }} />
                  <span className="font-bold">{s.valores[activo]}</span>
                  <span className="text-white/70">{s.etiqueta}</span>
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-bold text-tinta-suave">Ver tabla</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-tinta-suave">
              <th className="py-1 font-semibold">Mes</th>
              {series.map((s) => (
                <th key={s.clave} className="py-1 text-right font-semibold">
                  {s.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {categorias.map((cat, i) => (
              <tr key={cat} className="border-t border-arena">
                <td className="py-1">{cat}</td>
                {series.map((s) => (
                  <td key={s.clave} className="py-1 text-right">
                    {s.valores[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
