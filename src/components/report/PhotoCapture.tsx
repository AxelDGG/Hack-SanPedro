/* eslint-disable @next/next/no-img-element -- vista previa local (blob:) */
"use client";

import { Camera, ImagePlus, RefreshCw } from "lucide-react";

interface Props {
  previewUrl: string | null;
  onFoto: (archivo: File) => void;
  children?: React.ReactNode;
}

/** Captura con la cámara trasera o desde la galería. `children` se superpone a la vista previa. */
export function PhotoCapture({ previewUrl, onFoto, children }: Props) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) onFoto(archivo);
    e.target.value = ""; // permite volver a elegir la misma foto
  }

  if (!previewUrl) {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-terracota/50 bg-terracota/5 text-terracota transition active:scale-[0.99]">
          <span className="flex size-16 items-center justify-center rounded-full bg-terracota text-white shadow-md">
            <Camera className="size-8" />
          </span>
          <span className="font-display text-lg font-semibold">Toma una foto del animal</span>
          <span className="text-sm text-tinta-suave">La IA te ayuda a llenar el reporte</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onChange}
            data-testid="foto-camara"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-center gap-2 py-1 text-sm font-semibold text-tinta-suave">
          <ImagePlus className="size-4" /> o elige una de tu galería
          <input type="file" accept="image/*" className="sr-only" onChange={onChange} data-testid="foto-galeria" />
        </label>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-arena">
      <img src={previewUrl} alt="Foto del avistamiento" className="aspect-[4/3] w-full object-cover" />
      {children}
      <label className="absolute top-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-tinta shadow">
        <RefreshCw className="size-3.5" /> Cambiar
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onChange} />
      </label>
    </div>
  );
}
