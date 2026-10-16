"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCasos, type Caso } from "@/hooks/useCasos";
import { HuellasCaminando } from "@/components/ui/HuellasCaminando";
import { NumeroAnimado } from "@/components/ui/NumeroAnimado";
import { Pestanas } from "@/components/ui/Pestanas";
import { CENTRO_SAN_PEDRO, ESPECIES } from "@/lib/constants";
import { EASE_SOFT, RESORTE, RESORTE_REBOTE } from "@/lib/motion";
import { CasoCard } from "./CasoCard";
import { CambiarEstado } from "./CambiarEstado";

type Pestana = "cercanos" | "mios";

export function PanelRescate({ userId }: { userId: string }) {
  const { posicion } = useGeolocation();
  // Redondeo (~100 m) para no recargar la lista con cada lectura del GPS.
  const lat = Math.round((posicion?.lat ?? CENTRO_SAN_PEDRO[0]) * 1000) / 1000;
  const lng = Math.round((posicion?.lng ?? CENTRO_SAN_PEDRO[1]) * 1000) / 1000;
  const { cercanos, mios, cargando, nuevos } = useCasos(userId, lat, lng);

  const [pestana, setPestana] = useState<Pestana>("cercanos");
  const [editando, setEditando] = useState<Caso | null>(null);
  const [tomando, setTomando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const lista = pestana === "cercanos" ? cercanos : mios;
  const urgentes = cercanos.filter((c) => c.urgencia >= 4).length;

  function mostrarAviso(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(null), 4000);
  }

  async function tomar(caso: Caso) {
    setTomando(caso.id);
    const { error } = await createClient().rpc("take_case", { p_animal_id: caso.id });
    setTomando(null);
    mostrarAviso(
      error ? "No se pudo tomar el caso." : `Tomaste el caso de ${caso.apodo ?? ESPECIES[caso.especie].label.toLowerCase()}.`,
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <section className="grid grid-cols-3 gap-2 text-center">
        <Resumen valor={cercanos.length} etiqueta="por atender" orden={0} />
        <Resumen valor={urgentes} etiqueta="urgentes" destacado={urgentes > 0} orden={1} />
        <Resumen valor={mios.length} etiqueta="a tu cargo" orden={2} />
      </section>

      <Pestanas
        opciones={[
          ["cercanos", "Cercanos"],
          ["mios", "Mis casos"],
        ]}
        valor={pestana}
        onCambio={setPestana}
      />

      {cargando ? (
        <div className="flex justify-center py-12 text-terracota/70">
          <HuellasCaminando etiqueta="Cargando casos" />
        </div>
      ) : lista.length === 0 ? (
        <motion.p
          key={pestana}
          className="rounded-3xl bg-white p-8 text-center text-tinta-suave ring-1 ring-arena-oscura"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_SOFT }}
        >
          {pestana === "cercanos" ? "No hay casos pendientes cerca. ¡Buen trabajo!" : "Aún no tienes casos a tu cargo."}
        </motion.p>
      ) : (
        <ul className="flex flex-col gap-3">
          {/* Los casos nuevos (Realtime) entran deslizándose y el resto se reacomoda. */}
          <AnimatePresence mode="popLayout">
            {lista.map((caso, i) => (
              <motion.li
                key={caso.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { ...RESORTE, delay: Math.min(i, 8) * 0.05 } }}
                exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                transition={RESORTE}
              >
                <CasoCard
                  caso={caso}
                  miId={userId}
                  nuevo={nuevos.has(caso.id)}
                  tomando={tomando === caso.id}
                  onTomar={() => tomar(caso)}
                  onCambiarEstado={() => setEditando(caso)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence>
        {editando && (
          <CambiarEstado
            key={editando.id}
            animalId={editando.id}
            nombre={editando.apodo ?? ESPECIES[editando.especie].label}
            estadoActual={editando.estado}
            onCerrar={() => setEditando(null)}
            onListo={(mensaje) => {
              setEditando(null);
              mostrarAviso(mensaje);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aviso && (
          <motion.div
            key="aviso"
            role="status"
            className="fixed inset-x-4 bottom-[calc(var(--nav-h)+1rem)] z-[1150] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-tinta px-4 py-3 text-sm font-semibold text-white shadow-lg"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95, transition: { duration: 0.2 } }}
            transition={RESORTE}
          >
            <motion.span
              className="shrink-0"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...RESORTE_REBOTE, delay: 0.1 }}
            >
              <CheckCircle2 className="size-5 text-estado-adoptado" />
            </motion.span>
            {aviso}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Resumen({
  valor,
  etiqueta,
  destacado = false,
  orden,
}: {
  valor: number;
  etiqueta: string;
  destacado?: boolean;
  orden: number;
}) {
  return (
    <motion.div
      className={`rounded-2xl p-3 transition-colors duration-500 ${destacado ? "bg-terracota text-white" : "bg-white ring-1 ring-arena-oscura"}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_SOFT, delay: orden * 0.06 }}
    >
      <NumeroAnimado valor={valor} className="block font-display text-2xl font-semibold" />
      <p className={`text-xs font-bold ${destacado ? "text-white/90" : "text-tinta-suave"}`}>{etiqueta}</p>
    </motion.div>
  );
}
