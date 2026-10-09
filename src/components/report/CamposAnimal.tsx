"use client";

import { CONDICIONES, ESPECIES, URGENCIAS, type Condicion, type Especie } from "@/lib/constants";

export interface DatosAnimal {
  especie: Especie;
  condiciones: Condicion[];
  urgencia: number;
  rasgos: string;
  notas: string;
}

interface Props {
  datos: DatosAnimal;
  onCambio: <K extends keyof DatosAnimal>(campo: K, valor: DatosAnimal[K]) => void;
  /** En una confirmación solo se piden notas y estado actual. */
  soloSeguimiento?: boolean;
}

export function CamposAnimal({ datos, onCambio, soloSeguimiento = false }: Props) {
  function alternarCondicion(c: Condicion) {
    const actuales = new Set(datos.condiciones);
    if (actuales.has(c)) actuales.delete(c);
    else {
      actuales.add(c);
      // "Sano" excluye "flaco" y "herido" (y viceversa); "cachorro" combina con todo.
      if (c === "sano") {
        actuales.delete("herido");
        actuales.delete("flaco");
      }
      if (c === "herido" || c === "flaco") actuales.delete("sano");
    }
    onCambio("condiciones", [...actuales]);
  }

  return (
    <div className="flex flex-col gap-5">
      {!soloSeguimiento && (
        <Grupo titulo="Especie">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-arena p-1" role="radiogroup">
            {(Object.keys(ESPECIES) as Especie[]).map((e) => (
              <button
                key={e}
                type="button"
                role="radio"
                aria-checked={datos.especie === e}
                onClick={() => onCambio("especie", e)}
                className={`rounded-xl py-2.5 text-sm font-bold transition ${
                  datos.especie === e ? "bg-white text-tinta shadow-sm" : "text-tinta-suave"
                }`}
              >
                {ESPECIES[e].label}
              </button>
            ))}
          </div>
        </Grupo>
      )}

      <Grupo titulo="¿Cómo se ve?">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CONDICIONES) as Condicion[]).map((c) => {
            const activo = datos.condiciones.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={activo}
                onClick={() => alternarCondicion(c)}
                className={`rounded-full px-4 py-2 text-sm font-bold ring-1 transition ${
                  activo ? "bg-terracota text-white ring-terracota" : "bg-white text-tinta ring-arena-oscura"
                }`}
              >
                {CONDICIONES[c].label}
              </button>
            );
          })}
        </div>
      </Grupo>

      <Grupo titulo="Urgencia" ayuda={URGENCIAS[datos.urgencia]}>
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={datos.urgencia === n}
              aria-label={`${n}: ${URGENCIAS[n]}`}
              onClick={() => onCambio("urgencia", n)}
              className={`rounded-xl py-2.5 font-display text-lg font-semibold ring-1 transition ${
                datos.urgencia === n
                  ? n >= 4
                    ? "bg-terracota text-white ring-terracota"
                    : "bg-tinta text-white ring-tinta"
                  : "bg-white text-tinta ring-arena-oscura"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Grupo>

      {!soloSeguimiento && (
        <Grupo titulo="Rasgos" ayuda="Color, tamaño, collar…">
          <input
            value={datos.rasgos}
            onChange={(e) => onCambio("rasgos", e.target.value)}
            maxLength={140}
            placeholder="Ej. café claro, orejas caídas, collar rojo"
            className="w-full rounded-xl border border-arena-oscura bg-white px-3 py-3 outline-none focus:border-terracota focus:ring-2 focus:ring-terracota/20"
          />
        </Grupo>
      )}

      <Grupo titulo="Notas" ayuda="Opcional">
        <textarea
          value={datos.notas}
          onChange={(e) => onCambio("notas", e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="¿Dónde exactamente? ¿Está solo? ¿Se deja acercar?"
          className="w-full resize-none rounded-xl border border-arena-oscura bg-white px-3 py-3 outline-none focus:border-terracota focus:ring-2 focus:ring-terracota/20"
        />
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-bold">
        {titulo}
        {ayuda && <span className="text-xs font-semibold text-tinta-suave">{ayuda}</span>}
      </legend>
      {children}
    </fieldset>
  );
}
