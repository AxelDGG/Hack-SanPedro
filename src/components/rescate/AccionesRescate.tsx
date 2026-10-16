"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, HandHeart, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { Button } from "@/components/ui/Button";
import type { Estado } from "@/lib/constants";
import { EASE_SOFT } from "@/lib/motion";
import { CambiarEstado } from "./CambiarEstado";

interface Props {
  animalId: string;
  nombre: string;
  estado: Estado;
  rescatistaId: string | null;
}

/** Botones de la ficha para rescatistas y municipio: tomar el caso y cambiar su estado. */
export function AccionesRescate({ animalId, nombre, estado, rescatistaId }: Props) {
  const { profile } = useSession();
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tomando, setTomando] = useState(false);

  if (!profile || profile.rol === "vecino") return null;

  const puedeTomar = profile.rol === "rescatista" && estado === "avistado" && rescatistaId === null;

  async function tomar() {
    setTomando(true);
    const { error } = await createClient().rpc("take_case", { p_animal_id: animalId });
    setTomando(false);
    setAviso(error ? "No se pudo tomar el caso." : "Tomaste el caso. Ya aparece en «Mis casos».");
  }

  return (
    <section className="flex flex-col gap-2 rounded-3xl bg-salvia/10 p-4 ring-1 ring-salvia/30" data-testid="acciones-rescate">
      <p className="text-sm font-bold text-salvia">Acciones de {profile.rol === "municipio" ? "municipio" : "rescate"}</p>
      <div className="grid grid-cols-2 gap-2">
        {puedeTomar && (
          <Button onClick={tomar} disabled={tomando} className="py-2.5 text-sm">
            <HandHeart className="size-4" /> {tomando ? "Tomando…" : "Tomar caso"}
          </Button>
        )}
        <Button
          variant={puedeTomar ? "secondary" : "primary"}
          onClick={() => setAbierto(true)}
          className={`py-2.5 text-sm ${puedeTomar ? "" : "col-span-2"}`}
        >
          <RefreshCw className="size-4" /> Cambiar estado
        </Button>
      </div>
      {aviso && (
        <motion.p
          key={aviso}
          role="status"
          className="flex items-center gap-1.5 text-sm font-semibold text-salvia"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_SOFT }}
        >
          <CheckCircle2 className="size-4" /> {aviso}
        </motion.p>
      )}
      <AnimatePresence>
        {abierto && (
          <CambiarEstado
            animalId={animalId}
            nombre={nombre}
            estadoActual={estado}
            onCerrar={() => setAbierto(false)}
            onListo={(mensaje) => {
              setAbierto(false);
              setAviso(mensaje);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
