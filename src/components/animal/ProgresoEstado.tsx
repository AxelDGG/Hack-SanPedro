import { ESTADOS, FLUJO_ESTADOS, type Estado } from "@/lib/constants";

/** Recorrido del animal: avistado → en atención → rescatado → esterilizado → adoptado. */
export function ProgresoEstado({ estado }: { estado: Estado }) {
  const actual = FLUJO_ESTADOS.indexOf(estado);

  return (
    <ol className="grid grid-cols-5 gap-1" aria-label={`Estado actual: ${ESTADOS[estado].label}`}>
      {FLUJO_ESTADOS.map((e, i) => {
        const hecho = i <= actual;
        return (
          <li key={e} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className="h-2 w-full rounded-full"
              style={{ backgroundColor: hecho ? ESTADOS[estado].color : "#e6d5ba" }}
            />
            <span className={`text-[10px] leading-tight font-bold ${i === actual ? "text-tinta" : "text-tinta-suave/70"}`}>
              {ESTADOS[e].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
