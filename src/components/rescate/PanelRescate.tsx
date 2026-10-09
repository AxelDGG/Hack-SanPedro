"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCasos, type Caso } from "@/hooks/useCasos";
import { CENTRO_SAN_PEDRO, ESPECIES } from "@/lib/constants";
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
        <Resumen valor={cercanos.length} etiqueta="por atender" />
        <Resumen valor={urgentes} etiqueta="urgentes" destacado={urgentes > 0} />
        <Resumen valor={mios.length} etiqueta="a tu cargo" />
      </section>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-arena p-1 text-sm" role="tablist">
        {(
          [
            ["cercanos", "Cercanos"],
            ["mios", "Mis casos"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={pestana === valor}
            onClick={() => setPestana(valor)}
            className={`rounded-xl py-2 font-bold transition ${pestana === valor ? "bg-white shadow-sm" : "text-tinta-suave"}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex justify-center py-12 text-tinta-suave">
          <LoaderCircle className="size-8 animate-spin" aria-label="Cargando casos" />
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-3xl bg-white p-8 text-center text-tinta-suave ring-1 ring-arena-oscura">
          {pestana === "cercanos" ? "No hay casos pendientes cerca. ¡Buen trabajo!" : "Aún no tienes casos a tu cargo."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((caso) => (
            <li key={caso.id}>
              <CasoCard
                caso={caso}
                miId={userId}
                nuevo={nuevos.has(caso.id)}
                tomando={tomando === caso.id}
                onTomar={() => tomar(caso)}
                onCambiarEstado={() => setEditando(caso)}
              />
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <CambiarEstado
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

      {aviso && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(var(--nav-h)+1rem)] z-[1150] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-tinta px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <CheckCircle2 className="size-5 shrink-0 text-estado-adoptado" /> {aviso}
        </div>
      )}
    </div>
  );
}

function Resumen({ valor, etiqueta, destacado = false }: { valor: number; etiqueta: string; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${destacado ? "bg-terracota text-white" : "bg-white ring-1 ring-arena-oscura"}`}>
      <p className="font-display text-2xl font-semibold">{valor}</p>
      <p className={`text-xs font-bold ${destacado ? "text-white/90" : "text-tinta-suave"}`}>{etiqueta}</p>
    </div>
  );
}
