/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales, sin optimizador */
"use client";

import Link from "next/link";
import { Eye, MapPin, X } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { Urgencia } from "./Urgencia";
import { CONDICIONES, ESPECIES } from "@/lib/constants";
import { haceCuanto } from "@/lib/format";
import { buttonClass } from "@/components/ui/Button";
import type { AnimalMapa } from "@/hooks/useRealtimeAnimals";

interface Props {
  animal: AnimalMapa;
  colonia?: string;
  onCerrar: () => void;
}

/** Tarjeta inferior con el resumen del animal seleccionado en el mapa. */
export function AnimalPreview({ animal, colonia, onCerrar }: Props) {
  const titulo = animal.apodo ?? ESPECIES[animal.especie].label;

  return (
    <article className="relative overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-arena-oscura">
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1.5 text-tinta-suave shadow"
      >
        <X className="size-4" />
      </button>

      <div className="flex gap-3 p-3">
        <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-arena">
          {animal.foto_portada_url && (
            <img src={animal.foto_portada_url} alt={titulo} className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg leading-tight font-semibold">{titulo}</h2>
            <StatusPill estado={animal.estado} />
          </div>
          {animal.rasgos && <p className="mt-0.5 line-clamp-2 text-sm text-tinta-suave">{animal.rasgos}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tinta-suave">
            <Urgencia nivel={animal.urgencia} />
            {animal.condiciones.length > 0 && (
              <span>{animal.condiciones.map((c) => CONDICIONES[c].label).join(" · ")}</span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-tinta-suave">
            <MapPin className="size-3.5" />
            {colonia ? `${colonia} · ` : ""}visto {haceCuanto(animal.visto_ultima_vez)}
            <span className="inline-flex items-center gap-0.5">
              · <Eye className="size-3.5" /> {animal.total_avistamientos}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-arena px-3 py-3">
        <Link href={`/reportar?animal=${animal.id}`} className={buttonClass("secondary", "py-2.5 text-sm")}>
          Lo vi también
        </Link>
        <Link href={`/animal/${animal.id}`} className={buttonClass("primary", "py-2.5 text-sm")}>
          Ver ficha
        </Link>
      </div>
    </article>
  );
}
