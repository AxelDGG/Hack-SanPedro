"use client";

import { motion } from "motion/react";
import { Check, Mic, MicOff } from "lucide-react";
import { useDictado } from "@/hooks/useDictado";
import { RESORTE } from "@/lib/motion";

/**
 * Controles pensados para personas mayores: blancos táctiles de 56 px o más, texto grande
 * y siempre una opción marcada a la vista (nada escondido en menús).
 */

export function Pregunta({ titulo, ayuda }: { titulo: string; ayuda?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-[1.65rem] leading-tight font-semibold">{titulo}</h2>
      {ayuda && <p className="mt-1 text-base text-tinta-suave">{ayuda}</p>}
    </div>
  );
}

export function Grupo({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-2 text-base font-bold">
        {titulo}
        {ayuda && <span className="text-sm font-semibold text-tinta-suave">{ayuda}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Fila de opciones excluyentes con botones grandes. */
export function Opciones<T extends string | boolean>({
  opciones,
  valor,
  onCambio,
  columnas = opciones.length,
  nombre,
}: {
  opciones: [T, string][];
  valor: T | null;
  onCambio: (v: T) => void;
  columnas?: number;
  nombre: string;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }} role="radiogroup" aria-label={nombre}>
      {opciones.map(([v, etiqueta]) => {
        const activo = valor === v;
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(v)}
            className={`relative min-h-14 rounded-2xl px-2 font-display text-lg font-medium ring-2 transition active:scale-[0.97] ${
              activo ? "bg-tinta text-white ring-tinta" : "bg-white text-tinta ring-arena-oscura"
            }`}
          >
            {activo && (
              <motion.span
                layoutId={`check-${nombre}`}
                transition={RESORTE}
                className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-white text-tinta"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
            )}
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

/** Chips para sumar palabras a un campo de texto (colores frecuentes, por ejemplo). */
export function ChipsRapidos({ opciones, valor, onCambio }: { opciones: string[]; valor: string; onCambio: (v: string) => void }) {
  const palabras = valor.toLowerCase();
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activo = palabras.includes(o.toLowerCase());
        return (
          <button
            key={o}
            type="button"
            aria-pressed={activo}
            onClick={() => {
              if (activo) {
                onCambio(
                  valor
                    .replace(new RegExp(`\\s*(y|con)?\\s*${o}`, "i"), "")
                    .replace(/^\s*(y|con)\s+/i, "")
                    .trim(),
                );
              } else onCambio(valor.trim() ? `${valor.trim()} y ${o.toLowerCase()}` : o);
            }}
            className={`min-h-11 rounded-full px-4 text-base font-bold ring-2 transition ${
              activo ? "bg-terracota text-white ring-terracota" : "bg-white text-tinta ring-arena-oscura"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const claseCampo =
  "w-full rounded-2xl border-2 border-arena-oscura bg-white px-4 py-3.5 text-lg outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/15";

/** Campo de texto grande con botón de micrófono para dictar en vez de escribir. */
export function CampoTexto({
  valor,
  onCambio,
  placeholder,
  multilinea = false,
  maxLength = 140,
  etiqueta,
  tipo = "text",
  inputMode,
  autoComplete,
  dictado = true,
  testId,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  multilinea?: boolean;
  maxLength?: number;
  etiqueta: string;
  tipo?: "text" | "tel";
  inputMode?: "text" | "numeric" | "tel";
  autoComplete?: string;
  dictado?: boolean;
  testId?: string;
}) {
  const voz = useDictado((t) => onCambio((valor.trim() ? `${valor.trim()} ${t}` : t).slice(0, maxLength)));
  const conMicro = dictado && voz.soportado;

  return (
    <div className="relative">
      {multilinea ? (
        <textarea
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          maxLength={maxLength}
          rows={3}
          placeholder={placeholder}
          aria-label={etiqueta}
          data-testid={testId}
          className={`${claseCampo} resize-none ${conMicro ? "pr-16" : ""}`}
        />
      ) : (
        <input
          type={tipo}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={etiqueta}
          inputMode={inputMode}
          autoComplete={autoComplete}
          data-testid={testId}
          className={`${claseCampo} ${conMicro ? "pr-16" : ""}`}
        />
      )}
      {conMicro && (
        <button
          type="button"
          onClick={voz.alternar}
          aria-label={voz.escuchando ? "Dejar de escuchar" : `Dictar ${etiqueta.toLowerCase()}`}
          className={`absolute top-2 right-2 flex size-11 items-center justify-center rounded-xl transition ${
            voz.escuchando ? "animate-pulse bg-terracota text-white" : "bg-arena text-tinta"
          }`}
        >
          {voz.escuchando ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
      )}
    </div>
  );
}
