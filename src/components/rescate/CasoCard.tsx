/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HandHeart, Navigation, RefreshCw } from "lucide-react";
import { StatusPill } from "@/components/animal/StatusPill";
import { Urgencia } from "@/components/animal/Urgencia";
import { buttonClass } from "@/components/ui/Button";
import { CONDICIONES, ESPECIES } from "@/lib/constants";
import { distancia, haceCuanto } from "@/lib/format";
import { RESORTE } from "@/lib/motion";
import type { Caso } from "@/hooks/useCasos";

interface Props {
  caso: Caso;
  miId: string;
  nuevo: boolean;
  tomando: boolean;
  onTomar: () => void;
  onCambiarEstado: () => void;
}

export function CasoCard({ caso, miId, nuevo, tomando, onTomar, onCambiarEstado }: Props) {
  const nombre = caso.apodo ?? ESPECIES[caso.especie].label;
  const esMio = caso.rescatista_id === miId;
  const libre = caso.rescatista_id === null;
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${caso.lat},${caso.lng}`;

  return (
    <article
      className={`overflow-hidden rounded-3xl bg-white ring-1 ${
        caso.urgencia >= 4 ? "ring-terracota/50" : "ring-arena-oscura"
      }`}
      data-testid="caso"
    >
      <div className="flex gap-3 p-3">
        <Link href={`/animal/${caso.id}`} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-arena">
          {caso.foto_portada_url && <img src={caso.foto_portada_url} alt={nombre} className="size-full object-cover" />}
          {nuevo && (
            <motion.span
              className="absolute inset-x-0 bottom-0 bg-tinta py-0.5 text-center text-[10px] font-extrabold tracking-wider text-white"
              initial={{ y: "100%" }}
              animate={{ y: 0, opacity: [1, 0.65, 1] }}
              transition={{ y: RESORTE, opacity: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }}
            >
              NUEVO
            </motion.span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/animal/${caso.id}`} className="font-display text-lg leading-tight font-semibold">
              {nombre}
            </Link>
            <StatusPill estado={caso.estado} tipo={caso.tipo} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-suave">
            <Urgencia nivel={caso.urgencia} />
            {caso.condiciones.length > 0 && <span>{caso.condiciones.map((c) => CONDICIONES[c].label).join(" · ")}</span>}
          </div>
          <p className="mt-1 text-xs font-semibold text-tinta-suave">
            {[caso.colonia, caso.distancia_m !== null ? distancia(caso.distancia_m) : null, `visto ${haceCuanto(caso.visto_ultima_vez)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {esMio && <p className="mt-1 text-xs font-bold text-salvia">Caso a tu cargo</p>}
          {!libre && !esMio && <p className="mt-1 text-xs font-bold text-tinta-suave">Lo atiende otro rescatista</p>}
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-arena px-3 py-2.5">
        <a
          href={comoLlegar}
          target="_blank"
          rel="noreferrer"
          aria-label={`Cómo llegar a ${nombre}`}
          className={buttonClass("secondary", "px-3 py-2.5")}
        >
          <Navigation className="size-4" />
        </a>
        {libre && caso.estado === "avistado" ? (
          <button type="button" onClick={onTomar} disabled={tomando} className={buttonClass("primary", "py-2.5 text-sm")}>
            <HandHeart className="size-4" /> {tomando ? "Tomando…" : "Tomar caso"}
          </button>
        ) : (
          <button type="button" onClick={onCambiarEstado} className={buttonClass(esMio ? "primary" : "secondary", "py-2.5 text-sm")}>
            <RefreshCw className="size-4" /> Cambiar estado
          </button>
        )}
      </div>
    </article>
  );
}
