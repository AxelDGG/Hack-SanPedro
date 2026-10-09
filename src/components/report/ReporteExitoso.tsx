"use client";

import Link from "next/link";
import { Award, PawPrint } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

export interface ResultadoReporte {
  animal_id: string;
  sighting_id: string;
  puntos: number;
  insignias: { codigo: string; nombre: string; icono: string }[];
}

interface Props {
  resultado: ResultadoReporte;
  esConfirmacion: boolean;
  onOtro: () => void;
}

export function ReporteExitoso({ resultado, esConfirmacion, onOtro }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 px-4 pt-10 text-center" data-testid="reporte-exitoso">
      <div className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-terracota/30" />
        <span className="relative flex size-24 items-center justify-center rounded-full bg-terracota text-white shadow-lg">
          <PawPrint className="size-12" />
        </span>
      </div>

      <div>
        <h1 className="font-display text-3xl font-semibold">
          {esConfirmacion ? "¡Gracias por confirmar!" : "¡Reporte publicado!"}
        </h1>
        <p className="mt-2 text-tinta-suave">
          {esConfirmacion
            ? "Tu avistamiento ayuda a saber dónde está y cómo sigue."
            : "Ya aparece en el mapa de toda la comunidad y los rescatistas pueden verlo."}
        </p>
      </div>

      {resultado.puntos > 0 ? (
        <p className="rounded-full bg-terracota/10 px-5 py-2 font-display text-2xl font-semibold text-terracota">
          +{resultado.puntos} huellas
        </p>
      ) : (
        esConfirmacion && (
          <p className="text-sm text-tinta-suave">Ya habías sumado huellas por este animal; tu avistamiento igual cuenta.</p>
        )
      )}

      {resultado.insignias.length > 0 && (
        <div className="w-full rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
          <p className="mb-2 text-sm font-bold">¡Nueva insignia!</p>
          <ul className="flex flex-col gap-2">
            {resultado.insignias.map((i) => (
              <li key={i.codigo} className="flex items-center gap-2 font-display text-lg">
                <Award className="size-6 text-ambar" /> {i.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-2">
        <button type="button" onClick={onOtro} className={buttonClass("secondary")}>
          Reportar otro
        </button>
        <Link href={`/animal/${resultado.animal_id}`} className={buttonClass("primary")}>
          Ver ficha
        </Link>
      </div>
      <Link href="/" className="text-sm font-semibold text-tinta-suave underline">
        Volver al mapa
      </Link>
    </div>
  );
}
