"use client";

import { useState } from "react";
import { LoaderCircle, MessageCircle, Phone, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import type { TipoReporte } from "@/lib/constants";

/**
 * Teléfono de quien reportó una mascota perdida o encontrada. No está en la ficha pública:
 * se pide al tocar el botón (con sesión; si no hay, entra como invitado).
 */
export function ContactoReporte({ animalId, tipo, nombreAnimal }: { animalId: string; tipo: TipoReporte; nombreAnimal: string }) {
  const { user } = useSession();
  const [contacto, setContacto] = useState<{ nombre: string; telefono: string } | null | "sin-contacto">(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ver() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    if (!user) await supabase.auth.signInAnonymously();
    // De uno en uno y con límite por hora: los teléfonos no se pueden descargar en bloque.
    const { data, error } = await supabase.rpc("ver_contacto", { p_animal_id: animalId });
    if (error) setError(/muchos/i.test(error.message) ? error.message : "No pudimos mostrar el contacto. Intenta de nuevo.");
    else setContacto(data?.[0] ?? "sin-contacto");
    setCargando(false);
  }

  const titulo = tipo === "perdido" ? "¿Lo viste? Avisa a su familia" : "¿Es tuyo? Habla con quien lo encontró";

  if (contacto === "sin-contacto") return null;

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-salvia/10 p-4" data-testid="contacto">
      <h2 className="font-display text-xl font-semibold text-salvia">{titulo}</h2>
      {contacto ? (
        <>
          <p className="flex items-center gap-2 text-base">
            <UserRound className="size-5" /> {contacto.nombre}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:+52${contacto.telefono}`}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold ring-2 ring-arena-oscura"
            >
              <Phone className="size-5" /> Llamar
            </a>
            <a
              href={`https://wa.me/52${contacto.telefono}?text=${encodeURIComponent(`Hola, te escribo por ${nombreAnimal} (CallejerOS): `)}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#1f8f4e] text-lg font-semibold text-white"
            >
              <MessageCircle className="size-5" /> WhatsApp
            </a>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={ver}
          disabled={cargando}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-salvia font-display text-lg font-semibold text-white"
          data-testid="ver-contacto"
        >
          {cargando ? <LoaderCircle className="size-5 animate-spin" /> : <Phone className="size-5" />} Ver contacto
        </button>
      )}
      {error && <p className="text-base font-semibold text-terracota-oscuro">{error}</p>}
    </section>
  );
}
