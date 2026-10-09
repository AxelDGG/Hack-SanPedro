/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import { useState } from "react";

/** Foto principal grande y miniaturas de todos los avistamientos. */
export function GaleriaFotos({ fotos, alt }: { fotos: string[]; alt: string }) {
  const [activa, setActiva] = useState(0);
  const principal = fotos[activa] ?? fotos[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-arena">
        {principal && <img src={principal} alt={alt} className="size-full object-cover" />}
      </div>
      {fotos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Fotos de los avistamientos">
          {fotos.map((f, i) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => setActiva(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === activa}
                className={`size-16 overflow-hidden rounded-xl ring-2 transition ${
                  i === activa ? "ring-terracota" : "ring-transparent opacity-70"
                }`}
              >
                <img src={f} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
