/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combine, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { ESPECIES, etiquetaEstado } from "@/lib/constants";
import { distancia, haceCuanto } from "@/lib/format";
import type { AnimalFicha } from "@/hooks/useFichaAnimal";
import type { Database } from "@/types/database.types";

type Candidato = Database["public"]["Functions"]["find_duplicate_candidates"]["Returns"][number];

/**
 * "Es el mismo que otro reporte": rescatistas, el municipio o quien lo reportó unen duplicados
 * que se colaron (dos vecinos que reportaron al mismo perro casi al mismo tiempo, por ejemplo).
 */
export function UnirDuplicado({ animal }: { animal: AnimalFicha }) {
  const router = useRouter();
  const { user, profile } = useSession();
  const [abierto, setAbierto] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [uniendo, setUniendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const puede =
    user && (user.id === animal.reportado_por || profile?.rol === "rescatista" || profile?.rol === "municipio");
  const abierto_ = animal.estado === "avistado" || animal.estado === "en_atencion";
  if (!puede || !abierto_ || animal.fusionado_en) return null;

  async function buscar() {
    setAbierto(true);
    const { data } = await createClient().rpc("find_duplicate_candidates", {
      p_lat: animal.lat,
      p_lng: animal.lng,
      p_especie: animal.especie,
      p_tipo: animal.tipo,
      p_color: animal.color ?? undefined,
      p_raza: animal.raza ?? undefined,
      p_tamano: animal.tamano ?? undefined,
      p_excluir: animal.id,
    });
    setCandidatos(data ?? []);
  }

  async function unir(destino: string) {
    setUniendo(destino);
    setError(null);
    const { error } = await createClient().rpc("fusionar_animales", { p_origen: animal.id, p_destino: destino });
    if (error) {
      setError(error.message);
      setUniendo(null);
      return;
    }
    router.replace(`/animal/${destino}`);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={buscar}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl text-base font-bold text-tinta-suave ring-2 ring-arena-oscura"
        data-testid="buscar-duplicado"
      >
        <Combine className="size-5" /> ¿Es el mismo que otro reporte?
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-3xl bg-white p-4 ring-2 ring-arena-oscura">
      <h2 className="font-display text-lg font-semibold">Unir con otro reporte</h2>
      <p className="text-sm text-tinta-suave">Los avistamientos y fotos de este reporte pasan al que elijas; este deja de aparecer.</p>
      {candidatos === null ? (
        <LoaderCircle className="mx-auto size-6 animate-spin text-terracota" />
      ) : candidatos.length === 0 ? (
        <p className="text-base text-tinta-suave">No hay reportes parecidos cerca.</p>
      ) : (
        candidatos.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-crema p-2" data-testid="candidato-union">
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-arena">
              {(c.fotos[0] ?? c.foto_portada_url) && <img src={c.fotos[0] ?? c.foto_portada_url} alt="" className="size-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {c.apodo ?? ESPECIES[c.especie].label} · {etiquetaEstado(c.estado, c.tipo)}
              </p>
              <p className="truncate text-sm text-tinta-suave">
                {distancia(c.distancia_m)} · {haceCuanto(c.visto_ultima_vez)} · {Math.round(c.puntaje * 100)}% parecido
              </p>
            </div>
            <button
              type="button"
              onClick={() => unir(c.id)}
              disabled={uniendo !== null}
              className="min-h-11 shrink-0 rounded-xl bg-tinta px-3 text-sm font-bold text-white"
            >
              {uniendo === c.id ? <LoaderCircle className="size-4 animate-spin" /> : "Unir"}
            </button>
          </div>
        ))
      )}
      {error && <p className="text-sm font-semibold text-terracota-oscuro">{error}</p>}
    </section>
  );
}
