/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusPill } from "@/components/animal/StatusPill";
import { buttonClass } from "@/components/ui/Button";
import { ESPECIES, ESTADOS_EN_CALLE, type Especie, type Estado } from "@/lib/constants";
import { fechaCorta } from "@/lib/format";

interface Miembro {
  id: string;
  apodo: string | null;
  especie: Especie;
  estado: Estado;
  foto: string | null;
  loReportaste: boolean;
  desde: string;
}

type Filtro = "todos" | "calle" | "salvo";

async function obtenerManada(userId: string): Promise<Miembro[]> {
  const { data } = await createClient()
    .from("sightings")
    .select("created_at, es_confirmacion, animal:animals(id, apodo, especie, estado, foto_portada_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const porAnimal = new Map<string, Miembro>();
  for (const s of data ?? []) {
    if (!s.animal || porAnimal.has(s.animal.id)) continue;
    porAnimal.set(s.animal.id, {
      id: s.animal.id,
      apodo: s.animal.apodo,
      especie: s.animal.especie,
      estado: s.animal.estado,
      foto: s.animal.foto_portada_url,
      loReportaste: !s.es_confirmacion,
      desde: s.created_at,
    });
  }
  return [...porAnimal.values()].reverse();
}

/** Colección de los animales que el vecino reportó o confirmó. */
export function MiManada({ userId }: { userId: string }) {
  const [manada, setManada] = useState<Miembro[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    let activo = true;
    void obtenerManada(userId).then((m) => activo && setManada(m));
    return () => {
      activo = false;
    };
  }, [userId]);

  const aSalvo = useMemo(() => (manada ?? []).filter((m) => !ESTADOS_EN_CALLE.includes(m.estado)), [manada]);
  const visibles = (manada ?? []).filter((m) =>
    filtro === "todos" ? true : filtro === "salvo" ? !ESTADOS_EN_CALLE.includes(m.estado) : ESTADOS_EN_CALLE.includes(m.estado),
  );

  if (!manada) return <div className="mx-4 h-40 animate-pulse rounded-3xl bg-arena" />;

  if (manada.length === 0) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-arena-oscura">
        <p className="font-display text-lg">Tu manada está vacía</p>
        <p className="text-sm text-tinta-suave">Cada animal que reportes o confirmes se suma a tu colección.</p>
        <Link href="/reportar" className={buttonClass("primary")}>
          <Camera className="size-5" /> Reportar mi primer animal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <section className="flex items-center gap-4 rounded-3xl bg-salvia p-5 text-white">
        <ShieldCheck className="size-12 shrink-0 opacity-90" />
        <div>
          <p className="font-display text-2xl font-semibold" data-testid="manada-resumen">
            {aSalvo.length} de {manada.length} a salvo
          </p>
          <p className="text-sm opacity-90">Animales que ayudaste a encontrar y que ya salieron de la calle.</p>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-arena p-1 text-sm" role="tablist">
        {(
          [
            ["todos", `Todos (${manada.length})`],
            ["calle", "En la calle"],
            ["salvo", "A salvo"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={`rounded-xl py-2 font-bold transition ${filtro === valor ? "bg-white shadow-sm" : "text-tinta-suave"}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="manada">
        {visibles.map((m) => {
          const salvo = !ESTADOS_EN_CALLE.includes(m.estado);
          return (
            <li key={m.id}>
              <Link
                href={`/animal/${m.id}`}
                className={`flex flex-col overflow-hidden rounded-2xl bg-white ring-1 transition active:scale-[0.98] ${
                  salvo ? "ring-salvia/40" : "ring-arena-oscura"
                }`}
              >
                <div className="relative aspect-square bg-arena">
                  {m.foto && <img src={m.foto} alt="" className={`size-full object-cover ${salvo ? "" : "saturate-50"}`} />}
                  {salvo && (
                    <span className="absolute top-2 left-2 rounded-full bg-salvia px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">
                      A salvo
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-2.5">
                  <p className="truncate font-display font-semibold">{m.apodo ?? ESPECIES[m.especie].label}</p>
                  <StatusPill estado={m.estado} className="self-start" />
                  <p className="text-[11px] text-tinta-suave">
                    {m.loReportaste ? "Lo reportaste" : "Lo confirmaste"} · {fechaCorta(m.desde)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
