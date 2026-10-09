/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import { Check, HelpCircle } from "lucide-react";
import { StatusPill } from "@/components/animal/StatusPill";
import { ESPECIES, type Especie, type Estado } from "@/lib/constants";
import { distancia, haceCuanto } from "@/lib/format";

export interface AnimalCandidato {
  id: string;
  especie: Especie;
  apodo: string | null;
  rasgos: string | null;
  estado: Estado;
  fotos: string[];
  visto_ultima_vez: string;
  total_avistamientos: number;
  distancia_m?: number;
}

interface Props {
  candidatos: AnimalCandidato[];
  seleccionado: string | null;
  onSeleccionar: (animal: AnimalCandidato | null) => void;
}

/** "¿Es este?": animales parecidos vistos cerca en los últimos días, para no duplicar reportes. */
export function DuplicadosSugeridos({ candidatos, seleccionado, onSeleccionar }: Props) {
  if (candidatos.length === 0) return null;

  return (
    <section className="rounded-3xl bg-ambar/10 p-4 ring-1 ring-ambar/40" data-testid="duplicados">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <HelpCircle className="size-5 text-ambar" /> ¿Es alguno de estos?
      </h2>
      <p className="mt-0.5 text-sm text-tinta-suave">
        Ya reportaron {candidatos.length === 1 ? "un animal parecido" : "animales parecidos"} cerca de aquí. Si es
        el mismo, confírmalo para no duplicarlo.
      </p>

      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {candidatos.map((c) => {
          const activo = c.id === seleccionado;
          const foto = c.fotos[0];
          return (
            <li key={c.id} className="w-44 shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSeleccionar(activo ? null : c)}
                aria-pressed={activo}
                className={`relative flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left ring-2 transition ${
                  activo ? "ring-terracota" : "ring-transparent"
                }`}
              >
                <div className="aspect-[4/3] w-full bg-arena">
                  {foto && <img src={foto} alt="" className="size-full object-cover" />}
                </div>
                {activo && (
                  <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-terracota text-white shadow">
                    <Check className="size-4" />
                  </span>
                )}
                <div className="flex flex-col gap-1 p-2.5">
                  <p className="truncate font-display font-semibold">{c.apodo ?? ESPECIES[c.especie].label}</p>
                  <StatusPill estado={c.estado} className="self-start" />
                  {c.rasgos && <p className="line-clamp-2 text-xs text-tinta-suave">{c.rasgos}</p>}
                  <p className="text-[11px] font-semibold text-tinta-suave">
                    {c.distancia_m !== undefined && `${distancia(c.distancia_m)} · `}
                    {haceCuanto(c.visto_ultima_vez)}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onSeleccionar(null)}
        className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold ring-1 transition ${
          seleccionado === null ? "bg-tinta text-white ring-tinta" : "bg-white text-tinta ring-arena-oscura"
        }`}
      >
        No, es otro animal
      </button>
    </section>
  );
}
