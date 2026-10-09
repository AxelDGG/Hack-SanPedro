"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useRealtimeAnimals } from "@/hooks/useRealtimeAnimals";
import { useColonias } from "@/hooks/useColonias";
import { useStatsMensuales, type StatMes } from "@/hooks/useStatsMensuales";
import { ESTADOS, ESTADOS_EN_CALLE, ESTADOS_SIN_ESTERILIZAR, type Estado } from "@/lib/constants";
import { agruparEnZonas, coloniaMasCercana, ESCALA_ZONAS, CORTES, etiquetaClase, RESOLUCIONES } from "@/lib/geo/zonas";
import { plural } from "@/lib/format";
import { GraficaColumnas } from "./GraficaColumnas";

const MapaZonas = dynamic(() => import("./MapaZonas"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-arena" />,
});

const CAPAS: { valor: "calle" | "sin_esterilizar"; etiqueta: string; estados: Estado[] }[] = [
  { valor: "calle", etiqueta: "En la calle", estados: ESTADOS_EN_CALLE },
  { valor: "sin_esterilizar", etiqueta: "Sin esterilizar", estados: ESTADOS_SIN_ESTERILIZAR },
];

const MES = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });
const nombreMes = (iso: string) => MES.format(new Date(iso)).replace(".", "");

export function DashboardMunicipio() {
  const { animales } = useRealtimeAnimals();
  const colonias = useColonias();
  const meses = useStatsMensuales();

  const [capa, setCapa] = useState<(typeof CAPAS)[number]["valor"]>("calle");
  const [resolucion, setResolucion] = useState<number>(8);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const lista = useMemo(() => [...animales.values()], [animales]);
  const enCalle = lista.filter((a) => ESTADOS_EN_CALLE.includes(a.estado)).length;
  const sinEsterilizar = useMemo(() => lista.filter((a) => ESTADOS_SIN_ESTERILIZAR.includes(a.estado)), [lista]);

  const estadosCapa = CAPAS.find((c) => c.valor === capa)!.estados;
  const zonasMapa = useMemo(() => {
    const zonas = agruparEnZonas(lista.filter((a) => estadosCapa.includes(a.estado)), resolucion);
    return zonas.map((z) => ({ ...z, colonia: coloniaMasCercana(z.centro, colonias)?.nombre }));
  }, [lista, estadosCapa, resolucion, colonias]);

  // Prioridad de esterilización: zonas con más animales sin esterilizar.
  const prioritarias = useMemo(
    () =>
      agruparEnZonas(sinEsterilizar, resolucion)
        .slice(0, 5)
        .map((z) => ({ ...z, colonia: coloniaMasCercana(z.centro, colonias)?.nombre ?? "—" })),
    [sinEsterilizar, resolucion, colonias],
  );

  const actual = meses?.at(-1);
  const anterior = meses?.at(-2);

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Indicadores">
        <Indicador etiqueta="En la calle" valor={enCalle} nota="avistados o en atención" />
        <Indicador etiqueta="Sin esterilizar" valor={sinEsterilizar.length} nota="incluye rescatados" />
        <Indicador etiqueta="Rescates del mes" valor={actual?.rescates} anterior={anterior?.rescates} masEsMejor />
        <Indicador etiqueta="Adopciones del mes" valor={actual?.adopciones} anterior={anterior?.adopciones} masEsMejor />
      </section>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtros del mapa">
        <Segmentado opciones={CAPAS.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))} valor={capa} onCambio={setCapa} />
        <Segmentado
          opciones={RESOLUCIONES.map((r) => ({ valor: r.valor, etiqueta: r.etiqueta }))}
          valor={resolucion}
          onCambio={(v) => {
            setResolucion(v);
            setSeleccionada(null);
          }}
          prefijo="Zonas"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-arena-oscura">
          <div className="h-[380px] md:h-[460px]" data-testid="mapa-zonas">
            <MapaZonas zonas={zonasMapa} seleccionada={seleccionada} onSeleccionar={setSeleccionada} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-xs font-semibold text-tinta-suave">
            <span>Animales por zona:</span>
            {CORTES.map((_, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="h-3 w-4 rounded-sm" style={{ backgroundColor: ESCALA_ZONAS[i] }} /> {etiquetaClase(i)}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
          <h2 className="font-display text-lg font-semibold">Zonas prioritarias</h2>
          <p className="mb-3 text-xs text-tinta-suave">Más animales sin esterilizar · para planear campañas</p>
          <ol className="flex flex-col gap-1.5" data-testid="zonas-prioritarias">
            {prioritarias.map((z, i) => (
              <li key={z.celda}>
                <button
                  type="button"
                  onClick={() => setSeleccionada(z.celda)}
                  aria-pressed={seleccionada === z.celda}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                    seleccionada === z.celda ? "bg-arena" : "hover:bg-crema"
                  }`}
                >
                  <span className="font-display text-lg font-semibold text-tinta-suave tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{z.colonia}</span>
                    <span className="block text-xs text-tinta-suave">
                      {plural(z.perros, "perro")} · {plural(z.gatos, "gato")}
                      {z.urgentes > 0 && ` · ${plural(z.urgentes, "urgente")}`}
                    </span>
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums">{z.total}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {meses && (
        <div className="grid gap-4 md:grid-cols-2">
          <GraficaColumnas
            titulo="Reportes por mes"
            categorias={meses.map((m) => nombreMes(m.mes))}
            series={[{ clave: "reportes", etiqueta: "Reportes", color: "#e2583e", valores: meses.map((m) => m.reportes) }]}
          />
          <GraficaColumnas
            titulo="Resultados por mes"
            categorias={meses.map((m) => nombreMes(m.mes))}
            series={(["rescates", "esterilizaciones", "adopciones"] as const satisfies (keyof StatMes)[]).map((clave) => {
              const estado: Estado = clave === "rescates" ? "rescatado" : clave === "esterilizaciones" ? "esterilizado" : "adoptado";
              return {
                clave,
                etiqueta: clave === "rescates" ? "Rescates" : clave === "esterilizaciones" ? "Esterilizaciones" : "Adopciones",
                color: ESTADOS[estado].color,
                valores: meses.map((m) => m[clave]),
              };
            })}
          />
        </div>
      )}
    </div>
  );
}

function Indicador({
  etiqueta,
  valor,
  nota,
  anterior,
  masEsMejor = false,
}: {
  etiqueta: string;
  valor: number | undefined;
  nota?: string;
  anterior?: number;
  masEsMejor?: boolean;
}) {
  const delta = valor !== undefined && anterior !== undefined ? valor - anterior : null;
  const bueno = delta !== null && (masEsMejor ? delta > 0 : delta < 0);
  const Icono = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-arena-oscura" data-testid={`kpi-${etiqueta}`}>
      <p className="text-xs font-bold text-tinta-suave">{etiqueta}</p>
      <p className="font-display text-3xl font-semibold" data-testid="kpi-valor">
        {valor ?? "—"}
      </p>
      {delta !== null ? (
        <p className={`flex items-center gap-0.5 text-xs font-bold ${delta === 0 ? "text-tinta-suave" : bueno ? "text-[#006300]" : "text-terracota-oscuro"}`}>
          <Icono className="size-3.5" />
          {delta > 0 ? "+" : ""}
          {delta} vs mes anterior
        </p>
      ) : (
        nota && <p className="text-xs text-tinta-suave">{nota}</p>
      )}
    </div>
  );
}

function Segmentado<T extends string | number>({
  opciones,
  valor,
  onCambio,
  prefijo,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onCambio: (v: T) => void;
  prefijo?: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-arena p-1 text-xs font-bold">
      {prefijo && <span className="px-2 text-tinta-suave">{prefijo}</span>}
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={`rounded-xl px-3 py-1.5 transition ${valor === o.valor ? "bg-white text-tinta shadow-sm" : "text-tinta-suave"}`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
