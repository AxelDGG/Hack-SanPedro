"use client";

import { useState, useTransition } from "react";
import { HeartHandshake, Hexagon, UserRound } from "lucide-react";
import { entrarComoDemo } from "@/app/login/actions";
import type { Rol } from "@/lib/constants";

const OPCIONES: { rol: Rol; label: string; icon: React.ReactNode }[] = [
  { rol: "vecino", label: "Vecina", icon: <UserRound className="size-5" /> },
  { rol: "rescatista", label: "Rescatista", icon: <HeartHandshake className="size-5" /> },
  { rol: "municipio", label: "Municipio", icon: <Hexagon className="size-5" /> },
];

export function DemoLogin() {
  const [pendiente, startTransition] = useTransition();
  const [activo, setActivo] = useState<Rol | null>(null);
  const [error, setError] = useState<string | null>(null);

  function entrar(rol: Rol) {
    setActivo(rol);
    setError(null);
    startTransition(async () => {
      const res = await entrarComoDemo(rol);
      if (res.error) {
        setError(res.error);
        return;
      }
      // Recarga completa (no router.push) para que el cliente de Supabase lea la sesión
      // que el servidor acaba de guardar en cookies.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    });
  }

  return (
    <section className="rounded-3xl border-2 border-dashed border-arena-oscura p-5">
      <p className="font-display text-lg font-medium">Modo demo</p>
      <p className="mb-4 text-sm text-tinta-suave">Entra con un usuario de prueba de cada rol.</p>
      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map((o) => (
          <button
            key={o.rol}
            type="button"
            disabled={pendiente}
            onClick={() => entrar(o.rol)}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3 text-sm font-semibold ring-1 ring-arena-oscura transition active:scale-95 disabled:opacity-60"
          >
            <span className="text-terracota">{o.icon}</span>
            {pendiente && activo === o.rol ? "Entrando…" : o.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-terracota-oscuro">{error}</p>}
    </section>
  );
}
