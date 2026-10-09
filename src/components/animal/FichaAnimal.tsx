"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Eye, HeartHandshake, LoaderCircle, MapPin, Share2, UserRound } from "lucide-react";
import { useFichaAnimal } from "@/hooks/useFichaAnimal";
import { buttonClass } from "@/components/ui/Button";
import { CONDICIONES, ESPECIES } from "@/lib/constants";
import { fechaCorta, haceCuanto } from "@/lib/format";
import { GaleriaFotos } from "./GaleriaFotos";
import { LineaDeTiempo } from "./LineaDeTiempo";
import { ProgresoEstado } from "./ProgresoEstado";
import { StatusPill } from "./StatusPill";
import { Urgencia } from "./Urgencia";

const MiniMapa = dynamic(() => import("@/components/map/MiniMapa"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-arena" />,
});

/** Ficha pública del animal; `acciones` permite que cada rol agregue sus botones. */
export function FichaAnimal({ id, acciones }: { id: string; acciones?: React.ReactNode }) {
  const { animal, avistamientos, cambios, estado } = useFichaAnimal(id);
  const [aviso, setAviso] = useState<string | null>(null);

  if (estado === "cargando") {
    return (
      <div className="flex justify-center py-24 text-tinta-suave">
        <LoaderCircle className="size-8 animate-spin" aria-label="Cargando ficha" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="mx-4 mt-10 rounded-3xl bg-white p-8 text-center ring-1 ring-arena-oscura">
        <p className="font-display text-lg">Este animal ya no está en el mapa.</p>
        <Link href="/" className={buttonClass("primary", "mt-4")}>
          Volver al mapa
        </Link>
      </div>
    );
  }

  const nombre = animal.apodo ?? ESPECIES[animal.especie].label;
  const fotos = [
    ...new Set([animal.foto_portada_url, ...avistamientos.map((a) => a.foto_url)].filter((f): f is string => !!f)),
  ];

  async function compartir() {
    const url = window.location.href;
    const texto = `${nombre} necesita ayuda en San Pedro. Míralo en CallejerOS:`;
    try {
      if (navigator.share) await navigator.share({ title: `${nombre} · CallejerOS`, text: texto, url });
      else {
        await navigator.clipboard.writeText(`${texto} ${url}`);
        setAviso("Enlace copiado");
        setTimeout(() => setAviso(null), 2500);
      }
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  }

  return (
    <article className="flex flex-col gap-5 px-4 pt-4 pb-10" data-testid="ficha">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-tinta-suave">
          <ArrowLeft className="size-4" /> Mapa
        </Link>
        <button type="button" onClick={compartir} className="flex items-center gap-1 text-sm font-bold text-tinta-suave">
          <Share2 className="size-4" /> {aviso ?? "Compartir"}
        </button>
      </div>

      <GaleriaFotos fotos={fotos} alt={nombre} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold">{nombre}</h1>
          <StatusPill estado={animal.estado} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Urgencia nivel={animal.urgencia} />
          {animal.condiciones.map((c) => (
            <span key={c} className="rounded-full bg-arena px-2.5 py-0.5 text-xs font-bold text-tinta-suave">
              {CONDICIONES[c].label}
            </span>
          ))}
        </div>
        {animal.rasgos && <p className="text-tinta-suave">{animal.rasgos}</p>}
      </header>

      <section className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
        <ProgresoEstado estado={animal.estado} />
      </section>

      <section className="grid grid-cols-2 gap-3 text-sm">
        <Dato icono={<MapPin className="size-4" />} titulo="Colonia" valor={animal.colonia?.nombre ?? "—"} />
        <Dato
          icono={<Eye className="size-4" />}
          titulo="Avistamientos"
          valor={`${animal.total_avistamientos} · último ${haceCuanto(animal.visto_ultima_vez)}`}
        />
        <Dato
          icono={<UserRound className="size-4" />}
          titulo="Lo reportó"
          valor={`${animal.reportero?.nombre ?? "Un vecino"} · ${fechaCorta(animal.created_at)}`}
        />
        <Dato
          icono={<HeartHandshake className="size-4" />}
          titulo="Rescatista"
          valor={animal.rescatista?.nombre ?? "Sin asignar"}
        />
      </section>

      <div className="h-40 overflow-hidden rounded-2xl ring-1 ring-arena-oscura">
        <MiniMapa lat={animal.lat} lng={animal.lng} especie={animal.especie} estado={animal.estado} />
      </div>

      {acciones}

      {(animal.estado === "avistado" || animal.estado === "en_atencion") && (
        <Link href={`/reportar?animal=${animal.id}`} className={buttonClass("secondary")}>
          <Eye className="size-5" /> Lo vi también
        </Link>
      )}

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Historia</h2>
        <LineaDeTiempo avistamientos={avistamientos} cambios={cambios} />
      </section>
    </article>
  );
}

function Dato({ icono, titulo, valor }: { icono: React.ReactNode; titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-arena-oscura">
      <p className="flex items-center gap-1.5 text-xs font-bold text-tinta-suave">
        {icono} {titulo}
      </p>
      <p className="mt-1 font-semibold">{valor}</p>
    </div>
  );
}
