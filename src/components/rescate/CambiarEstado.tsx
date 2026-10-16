"use client";

import { useState } from "react";
import { motion, useDragControls, type Variants } from "motion/react";
import { LoaderCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ESTADOS, FLUJO_ESTADOS, type Estado } from "@/lib/constants";
import { EASE_SOFT, RESORTE, RESORTE_REBOTE, escalonar } from "@/lib/motion";

// La opción del estado actual queda atenuada (custom = está deshabilitada).
const opcion: Variants = {
  oculto: { opacity: 0, y: 10 },
  visible: (deshabilitada: boolean) => ({
    opacity: deshabilitada ? 0.5 : 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_SOFT },
  }),
};

interface Props {
  animalId: string;
  nombre: string;
  estadoActual: Estado;
  onCerrar: () => void;
  onListo: (mensaje: string) => void;
}

/**
 * Hoja inferior para mover el caso a otro estado, con nota opcional.
 * Se monta dentro de <AnimatePresence> para que también anime al cerrarse.
 */
export function CambiarEstado({ animalId, nombre, estadoActual, onCerrar, onListo }: Props) {
  const siguiente = FLUJO_ESTADOS[Math.min(FLUJO_ESTADOS.indexOf(estadoActual) + 1, FLUJO_ESTADOS.length - 1)];
  const [estado, setEstado] = useState<Estado>(siguiente);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const arrastre = useDragControls();

  async function guardar() {
    setEnviando(true);
    setError(null);
    const { data, error } = await createClient().rpc("change_animal_status", {
      p_animal_id: animalId,
      p_estado: estado,
      p_nota: nota.trim() || undefined,
    });
    setEnviando(false);
    if (error) {
      setError(error.message.includes("Solo") ? error.message : "No se pudo actualizar el estado.");
      return;
    }
    const premiados = (data as { premiados?: number } | null)?.premiados ?? 0;
    onListo(
      premiados > 0
        ? `${nombre} pasó a ${ESTADOS[estado].label.toLowerCase()}. ${premiados} ${premiados === 1 ? "vecino ganó" : "vecinos ganaron"} huellas.`
        : `${nombre} pasó a ${ESTADOS[estado].label.toLowerCase()}.`,
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-tinta/40"
      onClick={onCerrar}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Cambiar estado de ${nombre}`}
        className="w-full max-w-lg rounded-t-3xl bg-crema p-5 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={RESORTE}
        // Se arrastra solo desde la jaladera, para no estorbar al escribir la nota.
        drag="y"
        dragListener={false}
        dragControls={arrastre}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onCerrar();
        }}
      >
        <div
          className="flex cursor-grab touch-none justify-center pt-1 pb-3 active:cursor-grabbing"
          onPointerDown={(e) => arrastre.start(e)}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-arena-oscura" />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Actualizar a {nombre}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-full p-1.5 text-tinta-suave">
            <X className="size-5" />
          </button>
        </div>

        <motion.div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label="Nuevo estado"
          variants={escalonar(0.04, 0.1)}
          initial="oculto"
          animate="visible"
        >
          {FLUJO_ESTADOS.map((e) => {
            const actual = e === estadoActual;
            const activo = e === estado;
            return (
              <motion.button
                key={e}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={actual}
                onClick={() => setEstado(e)}
                variants={opcion}
                custom={actual}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-2 transition-[background-color,box-shadow] ${
                  activo ? "bg-white" : "bg-white/60 ring-transparent"
                }`}
                style={activo ? { ["--tw-ring-color" as string]: ESTADOS[e].color } : undefined}
              >
                <motion.span
                  className="size-3.5 rounded-full"
                  style={{ backgroundColor: ESTADOS[e].color }}
                  animate={{ scale: activo ? 1.35 : 1 }}
                  transition={RESORTE_REBOTE}
                />
                <span className="flex-1">
                  <span className="block font-display font-semibold">{ESTADOS[e].label}</span>
                  <span className="block text-xs text-tinta-suave">{actual ? "Estado actual" : ESTADOS[e].descripcion}</span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Nota para la comunidad (opcional)"
          className="mt-4 w-full resize-none rounded-xl border border-arena-oscura bg-white px-3 py-3 outline-none focus:border-terracota focus:ring-2 focus:ring-terracota/20"
        />

        {error && (
          <motion.p
            className="mt-3 rounded-xl bg-terracota/10 px-3 py-2 text-sm text-terracota-oscuro"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
            transition={{ duration: 0.35 }}
          >
            {error}
          </motion.p>
        )}

        <Button onClick={guardar} disabled={enviando} className="mt-4 w-full" data-testid="guardar-estado">
          {enviando ? <LoaderCircle className="size-5 animate-spin" /> : `Marcar como ${ESTADOS[estado].label.toLowerCase()}`}
        </Button>
      </motion.div>
    </motion.div>
  );
}
