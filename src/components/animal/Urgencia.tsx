import { URGENCIAS } from "@/lib/constants";

const COLORES = ["#9cc5a1", "#d6c36b", "#f2a23a", "#e2583e", "#b3261e"];

export function Urgencia({ nivel, conTexto = true }: { nivel: number; conTexto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Urgencia ${nivel} de 5: ${URGENCIAS[nivel]}`}>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="h-2.5 w-1.5 rounded-full"
            style={{ backgroundColor: n <= nivel ? COLORES[nivel - 1] : "#e6d5ba" }}
          />
        ))}
      </span>
      {conTexto && <span className="text-xs font-semibold text-tinta-suave">{URGENCIAS[nivel]}</span>}
    </span>
  );
}
