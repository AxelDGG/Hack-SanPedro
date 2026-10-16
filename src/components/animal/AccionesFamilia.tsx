"use client";

import { useState } from "react";
import { House, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import type { Estado, TipoReporte } from "@/lib/constants";

interface Props {
  animalId: string;
  tipo: TipoReporte;
  estado: Estado;
  reportadoPor: string | null;
  registroFolio: string | null;
}

/**
 * Para quien reportó una mascota perdida (o encontrada): cerrar el caso cuando vuelve a casa.
 * Así sale del mapa, los vecinos que ayudaron ganan huellas y el registro municipal se actualiza.
 */
export function AccionesFamilia({ animalId, tipo, estado, reportadoPor, registroFolio }: Props) {
  const { user, profile } = useSession();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puede = user && (user.id === reportadoPor || profile?.rol === "rescatista" || profile?.rol === "municipio");
  if (!puede || tipo === "callejero" || estado !== "avistado") return null;

  async function enCasa() {
    setEnviando(true);
    setError(null);
    const { error } = await createClient().rpc("marcar_reunido", { p_animal_id: animalId });
    if (error) {
      setError("No se pudo actualizar. Intenta de nuevo.");
      setEnviando(false);
      return;
    }
    if (registroFolio) {
      void fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "reunido", folio: registroFolio }),
      }).catch(() => undefined);
    }
    setEnviando(false);
  }

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={enCasa}
        disabled={enviando}
        className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-[#b8337f] font-display text-xl font-semibold text-white shadow-md disabled:opacity-60"
        data-testid="marcar-reunido"
      >
        {enviando ? <LoaderCircle className="size-6 animate-spin" /> : <House className="size-6" />}
        {tipo === "perdido" ? "¡Ya está en casa!" : "Ya volvió con su familia"}
      </button>
      {error && <p className="text-base font-semibold text-terracota-oscuro">{error}</p>}
    </section>
  );
}
