"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crown, Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useColonias } from "@/hooks/useColonias";
import { Pestanas } from "@/components/ui/Pestanas";
import { NumeroAnimado } from "@/components/ui/NumeroAnimado";
import { plural } from "@/lib/format";
import { EASE_SOFT, RESORTE } from "@/lib/motion";

interface FilaVecino {
  id: string;
  nombre: string;
  puntos: number;
  colonia: string | null;
}

interface FilaColonia {
  id: number;
  nombre: string;
  puntos: number;
  vecinos: number;
  animales_en_calle: number;
}

type Pestana = "vecinos" | "colonias";

async function obtenerVecinos(coloniaId: number | null): Promise<FilaVecino[]> {
  let consulta = createClient()
    .from("profiles")
    .select("id, nombre, puntos, colonias!profiles_colonia_id_fkey(nombre)")
    .gt("puntos", 0)
    .order("puntos", { ascending: false })
    .limit(25);
  if (coloniaId) consulta = consulta.eq("colonia_id", coloniaId);
  const { data } = await consulta;
  return (data ?? []).map(({ colonias, ...p }) => ({ ...p, colonia: colonias?.nombre ?? null }));
}

async function obtenerColonias(): Promise<FilaColonia[]> {
  const { data } = await createClient().from("v_ranking_colonias").select("*").order("puntos", { ascending: false });
  return (data ?? [])
    .filter((c) => (c.puntos ?? 0) > 0)
    .map((c) => ({
      id: c.id ?? 0,
      nombre: c.nombre ?? "—",
      puntos: c.puntos ?? 0,
      vecinos: c.vecinos ?? 0,
      animales_en_calle: c.animales_en_calle ?? 0,
    }));
}

export function Ranking() {
  const { profile } = useSession();
  const colonias = useColonias();
  const [pestana, setPestana] = useState<Pestana>("vecinos");
  const [coloniaId, setColoniaId] = useState<number | null>(null);
  const [vecinos, setVecinos] = useState<FilaVecino[] | null>(null);
  const [filasColonias, setFilasColonias] = useState<FilaColonia[] | null>(null);

  useEffect(() => {
    let activo = true;
    void obtenerVecinos(coloniaId).then((v) => activo && setVecinos(v));
    return () => {
      activo = false;
    };
  }, [coloniaId]);

  useEffect(() => {
    let activo = true;
    void obtenerColonias().then((c) => activo && setFilasColonias(c));
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">
      <Pestanas
        opciones={[
          ["vecinos", "Vecinos"],
          ["colonias", "Colonias"],
        ]}
        valor={pestana}
        onCambio={setPestana}
      />

      {pestana === "vecinos" ? (
        <>
          <label className="flex items-center gap-2 text-sm font-semibold text-tinta-suave">
            Colonia
            <select
              value={coloniaId ?? ""}
              onChange={(e) => setColoniaId(e.target.value ? Number(e.target.value) : null)}
              className="min-w-0 flex-1 rounded-xl border border-arena-oscura bg-white px-3 py-2 text-tinta"
              data-testid="filtro-colonia"
            >
              <option value="">Todo San Pedro</option>
              {colonias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <Lista
            filas={(vecinos ?? []).map((v) => ({
              clave: v.id,
              titulo: v.nombre,
              detalle: v.colonia ?? "Sin colonia",
              valor: v.puntos,
              resaltar: v.id === profile?.id,
            }))}
            cargando={vecinos === null}
            vacio="Nadie ha sumado huellas en esta colonia todavía."
            testId="ranking-vecinos"
          />
        </>
      ) : (
        <Lista
          filas={(filasColonias ?? []).map((c) => ({
            clave: String(c.id),
            titulo: c.nombre,
            detalle: `${plural(c.vecinos, "vecino")} · ${plural(c.animales_en_calle, "animal", "animales")} en la calle`,
            valor: c.puntos,
            resaltar: c.id === profile?.colonia_id,
          }))}
          cargando={filasColonias === null}
          vacio="Aún no hay huellas por colonia."
          testId="ranking-colonias"
        />
      )}
    </div>
  );
}

interface Fila {
  clave: string;
  titulo: string;
  detalle: string;
  valor: number;
  resaltar: boolean;
}

function Lista({ filas, cargando, vacio, testId }: { filas: Fila[]; cargando: boolean; vacio: string; testId: string }) {
  if (cargando) return <div className="h-60 animate-pulse rounded-3xl bg-arena" />;
  if (filas.length === 0) return <p className="rounded-3xl bg-white p-8 text-center text-tinta-suave ring-1 ring-arena-oscura">{vacio}</p>;

  return (
    <ol className="flex flex-col gap-2" data-testid={testId}>
      <AnimatePresence mode="popLayout">
        {filas.map((f, i) => (
          <motion.li
            key={f.clave}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SOFT, delay: Math.min(i, 10) * 0.04 } }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={RESORTE}
            aria-current={f.resaltar ? "true" : undefined}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
              f.resaltar ? "bg-terracota/10 ring-terracota/40" : "bg-white ring-arena-oscura"
            }`}
          >
            <Posicion n={i + 1} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {f.titulo}
                {f.resaltar && <span className="ml-1.5 text-xs font-bold text-terracota">(tú)</span>}
              </span>
              <span className="block truncate text-xs text-tinta-suave">{f.detalle}</span>
            </span>
            <span className="text-right">
              <NumeroAnimado valor={f.valor} className="block font-display text-xl font-semibold" />
              <span className="block text-[10px] font-bold tracking-wide text-tinta-suave uppercase">huellas</span>
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function Posicion({ n }: { n: number }) {
  if (n === 1)
    return (
      <motion.span
        className="shrink-0"
        animate={{ y: [0, -3, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Crown className="size-7 fill-ambar/30 text-ambar" aria-label="Primer lugar" />
      </motion.span>
    );
  if (n <= 3)
    return <Medal className={`size-7 shrink-0 ${n === 2 ? "text-[#9b9a94]" : "text-[#b0703f]"}`} aria-label={`Lugar ${n}`} />;
  return <span className="w-7 shrink-0 text-center font-display text-lg font-semibold text-tinta-suave tabular-nums">{n}</span>;
}
