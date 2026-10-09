import { Lock } from "lucide-react";
import { fechaCorta } from "@/lib/format";
import type { Insignia } from "@/hooks/useGamificacion";
import { iconoInsignia } from "./insignias";

export function GridInsignias({ insignias }: { insignias: Insignia[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="insignias">
      {insignias.map((b) => {
        const Icono = iconoInsignia(b.icono);
        const ganada = b.otorgada_at !== null;
        return (
          <li
            key={b.codigo}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center ring-1 ${
              ganada ? "bg-white ring-terracota/30" : "bg-arena/50 ring-arena-oscura"
            }`}
            aria-label={`${b.nombre}: ${ganada ? "obtenida" : `${Math.round(b.progreso * 100)}% de avance`}`}
          >
            <span
              className={`relative flex size-12 items-center justify-center rounded-full ${
                ganada ? "bg-terracota text-white" : "bg-arena-oscura/60 text-tinta-suave"
              }`}
            >
              <Icono className="size-6" />
              {!ganada && (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-white ring-2 ring-arena">
                  <Lock className="size-3" />
                </span>
              )}
            </span>
            <span className="font-display text-sm leading-tight font-semibold">{b.nombre}</span>
            <span className="text-[11px] leading-tight text-tinta-suave">{b.descripcion}</span>
            {ganada ? (
              <span className="text-[10px] font-bold tracking-wide text-terracota uppercase">{fechaCorta(b.otorgada_at!)}</span>
            ) : (
              <span className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-arena-oscura/50">
                <span className="block h-full rounded-full bg-terracota/70" style={{ width: `${b.progreso * 100}%` }} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
