/* eslint-disable @next/next/no-img-element -- fotos del registro municipal (otro dominio) */
"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, LoaderCircle, Search } from "lucide-react";
import type { MascotaRegistro } from "@/lib/registro/tipos";
import { Hoja } from "./Hoja";

/**
 * "Está en el registro municipal": la familia busca a su mascota por nombre, folio o microchip
 * y el reporte se llena solo con los datos oficiales (raza, color, foto, señas).
 */
export function BuscarRegistro({
  abierta,
  especie,
  onCerrar,
  onElegir,
}: {
  abierta: boolean;
  especie: "perro" | "gato" | null;
  onCerrar: () => void;
  onElegir: (m: MascotaRegistro) => void;
}) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<MascotaRegistro[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) return;
    let activo = true;
    const t = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: texto });
        if (especie) params.set("especie", especie);
        const res = await fetch(`/api/registro?${params}`);
        const json = await res.json();
        if (!activo) return;
        if (res.status === 503) setError("El registro municipal no está conectado en este momento.");
        else if (!res.ok) setError(json.error ?? "No pudimos consultar el registro.");
        else setResultados(json.data);
      } catch {
        if (activo) setError("Sin conexión con el registro municipal.");
      } finally {
        if (activo) setCargando(false);
      }
    }, 400);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [q, especie]);

  return (
    <Hoja abierta={abierta} titulo="Buscar en el registro municipal" onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        <p className="text-base text-tinta-suave">
          Si registraste a tu mascota en el municipio, búscala por su nombre, folio o microchip.
        </p>
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-tinta-suave" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej. Max o SPGG-M-2024-00123"
            aria-label="Nombre, folio o microchip"
            className="w-full rounded-2xl border-2 border-arena-oscura bg-white py-3.5 pr-4 pl-12 text-lg outline-none focus:border-terracota focus:ring-4 focus:ring-terracota/15"
            data-testid="buscar-registro"
          />
          {cargando && <LoaderCircle className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-terracota" />}
        </div>

        {error && <p className="rounded-xl bg-ambar/15 px-3 py-2 text-base">{error}</p>}

        {q.trim().length >= 2 && resultados && resultados.length === 0 && !cargando && !error && (
          <p className="text-base text-tinta-suave">No encontramos esa mascota. Revisa el nombre o el folio.</p>
        )}

        <ul className="flex flex-col gap-2">
          {q.trim().length >= 2 &&
            resultados?.map((m) => (
              <li key={m.folio}>
                <button
                  type="button"
                  onClick={() => onElegir(m)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-2 ring-arena-oscura transition active:scale-[0.98]"
                >
                  <img src={m.foto_url} alt="" className="size-20 shrink-0 rounded-xl bg-arena object-cover" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-xl font-semibold">{m.nombre}</span>
                    <span className="text-base text-tinta-suave">
                      {m.raza} · {m.color}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-salvia">
                      <BadgeCheck className="size-4" /> {m.folio} · {m.colonia.nombre}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </Hoja>
  );
}
