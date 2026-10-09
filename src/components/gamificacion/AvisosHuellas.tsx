"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { ESPECIES } from "@/lib/constants";
import type { Tables } from "@/types/database.types";
import { iconoInsignia } from "./insignias";

interface Aviso {
  id: string;
  titulo: string;
  detalle: string;
  icono: string;
  href?: string;
}

const DURACION_MS = 6000;

/**
 * Avisos en vivo para el usuario con sesión: cuando un caso que reportó se resuelve
 * (otra persona cambia el estado) o cuando gana una insignia.
 */
export function AvisosHuellas() {
  const { user, refreshProfile } = useSession();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const mostrar = (aviso: Aviso) => {
      setAvisos((prev) => [...prev, aviso]);
      setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== aviso.id)), DURACION_MS);
    };

    const canal = supabase
      .channel(`avisos-${userId}`)
      .on<Tables<"point_events">>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "point_events", filter: `user_id=eq.${userId}` },
        async ({ new: evento }) => {
          void refreshProfile();
          // Reportes y confirmaciones ya se celebran en la pantalla de éxito.
          if (evento.motivo !== "caso_resuelto" || !evento.animal_id) return;
          const { data: animal } = await supabase
            .from("animals")
            .select("apodo, especie")
            .eq("id", evento.animal_id)
            .maybeSingle();
          const nombre = animal ? (animal.apodo ?? `El ${ESPECIES[animal.especie].label.toLowerCase()} que reportaste`) : "Un animal que reportaste";
          mostrar({
            id: `pe-${evento.id}`,
            titulo: `+${evento.puntos} huellas`,
            detalle: `¡${nombre} ya está a salvo!`,
            icono: "corazon",
            href: `/animal/${evento.animal_id}`,
          });
        },
      )
      .on<Tables<"user_badges">>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_badges", filter: `user_id=eq.${userId}` },
        async ({ new: nueva }) => {
          if (window.location.pathname.startsWith("/reportar")) return; // ya se muestra al publicar
          const { data: insignia } = await supabase
            .from("badges")
            .select("nombre, icono")
            .eq("codigo", nueva.badge_codigo)
            .maybeSingle();
          if (!insignia) return;
          mostrar({
            id: `ub-${nueva.badge_codigo}`,
            titulo: "¡Nueva insignia!",
            detalle: insignia.nombre,
            icono: insignia.icono,
            href: "/perfil",
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, refreshProfile]);

  if (avisos.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[1300] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {avisos.map((a) => {
        const Icono = iconoInsignia(a.icono);
        const contenido = (
          <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terracota text-white">
              <Icono className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg leading-tight font-semibold">{a.titulo}</span>
              <span className="block truncate text-sm text-white/80">{a.detalle}</span>
            </span>
          </>
        );
        return (
          <div
            key={a.id}
            role="status"
            data-testid="aviso-huellas"
            className="pointer-events-auto flex w-full max-w-sm animate-[cos-aparecer_0.4s_ease-out] items-center gap-3 rounded-2xl bg-tinta px-3 py-3 text-white shadow-xl"
          >
            {a.href ? (
              <Link href={a.href} className="flex min-w-0 flex-1 items-center gap-3">
                {contenido}
              </Link>
            ) : (
              contenido
            )}
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setAvisos((prev) => prev.filter((x) => x.id !== a.id))}
              className="rounded-full p-1 text-white/70"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
