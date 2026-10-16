/* eslint-disable @next/next/no-img-element -- vista previa local (blob:) o foto del registro */
"use client";

import { BadgeCheck, Camera, ClipboardPaste, ImagePlus, Landmark, RefreshCw } from "lucide-react";
import type { TipoReporte } from "@/lib/constants";
import type { MascotaRegistro } from "@/lib/registro/tipos";
import { AiBanner, type EstadoIA } from "../AiBanner";
import { Pregunta } from "./controles";

interface Props {
  tipo: TipoReporte | null;
  confirmacion: boolean;
  preview: string | null;
  ia: EstadoIA;
  registro: MascotaRegistro | null;
  /** Resumen de lo que se leyó de una publicación pegada. */
  leidoDePublicacion: string | null;
  onFoto: (f: File) => void;
  onPegar: () => void;
  onBuscarRegistro: () => void;
}

export function PasoFoto({ tipo, confirmacion, preview, ia, registro, leidoDePublicacion, onFoto, onPegar, onBuscarRegistro }: Props) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) onFoto(archivo);
    e.target.value = ""; // permite volver a elegir la misma foto
  }

  const perdido = tipo === "perdido";
  const titulo = confirmacion
    ? "¿Le tomaste una foto hoy?"
    : perdido
      ? "¿Tienes una foto de tu mascota?"
      : "Toma una foto del animal";
  const ayuda = confirmacion
    ? "Es opcional, pero ayuda a saber cómo sigue."
    : perdido
      ? "Una foto clara ayuda a que la reconozcan. Si no tienes, puedes seguir sin foto."
      : "Con la foto llenamos casi todo por ti.";

  const fotoMostrada = preview ?? registro?.foto_url ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Pregunta titulo={titulo} ayuda={ayuda} />

      {fotoMostrada ? (
        <div className="relative overflow-hidden rounded-3xl bg-arena">
          <img src={fotoMostrada} alt="Foto del reporte" className="aspect-[4/3] w-full object-cover" />
          <label className="absolute top-3 right-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white/95 px-4 text-base font-bold text-tinta shadow">
            <RefreshCw className="size-4" /> Cambiar foto
            <input type="file" accept="image/*" className="sr-only" onChange={onChange} />
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl bg-terracota text-white shadow-md transition active:scale-[0.98]">
            <Camera className="size-11" />
            <span className="font-display text-2xl font-semibold">Tomar foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onChange}
              data-testid="foto-camara"
            />
          </label>
          <label className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-3xl bg-white font-display text-xl font-medium ring-2 ring-arena-oscura transition active:scale-[0.98]">
            <ImagePlus className="size-6" /> Elegir de mi galería
            <input type="file" accept="image/*" className="sr-only" onChange={onChange} data-testid="foto-galeria" />
          </label>
        </div>
      )}

      <AiBanner estado={ia} />

      {registro && (
        <p className="flex items-center gap-2 rounded-2xl bg-salvia/10 px-4 py-3 text-base font-semibold text-salvia">
          <BadgeCheck className="size-5 shrink-0" /> {registro.nombre} está en el registro municipal ({registro.folio}). Ya
          llenamos sus datos.
        </p>
      )}
      {leidoDePublicacion && (
        <p className="flex items-start gap-2 rounded-2xl bg-salvia/10 px-4 py-3 text-base font-semibold text-salvia" data-testid="leido-publicacion">
          <ClipboardPaste className="mt-0.5 size-5 shrink-0" /> Del mensaje leímos: {leidoDePublicacion}
        </p>
      )}

      {!confirmacion && (
        <div className="mt-2 flex flex-col gap-2 border-t-2 border-dashed border-arena-oscura pt-4">
          <p className="text-base font-bold text-tinta-suave">¿Te llegó por un grupo de WhatsApp o Facebook?</p>
          <button
            type="button"
            onClick={onPegar}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 text-left text-lg font-semibold ring-2 ring-arena-oscura transition active:scale-[0.98]"
            data-testid="abrir-pegar"
          >
            <ClipboardPaste className="size-6 shrink-0 text-salvia" /> Pegar el mensaje y llenar solo
          </button>
          {perdido && (
            <button
              type="button"
              onClick={onBuscarRegistro}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 text-left text-lg font-semibold ring-2 ring-arena-oscura transition active:scale-[0.98]"
              data-testid="abrir-registro"
            >
              <Landmark className="size-6 shrink-0 text-salvia" /> Está en el registro municipal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
