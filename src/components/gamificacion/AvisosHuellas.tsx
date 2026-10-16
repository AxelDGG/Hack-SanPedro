"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { ESPECIES } from "@/lib/constants";
import { RESORTE, RESORTE_REBOTE } from "@/lib/motion";
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
 * Avisos en vivo para el usuario con sesión: un reporte nuevo en su colonia, alguien vio a su
 * mascota perdida, un caso que reportó se resolvió (otra persona cambió el estado) o una insignia.
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
      .on<Tables<"notificaciones">>(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `user_id=eq.${userId}` },
        ({ new: n }) => {
          mostrar({
            id: `no-${n.id}`,
            titulo: n.titulo,
            detalle: n.cuerpo,
            icono: n.tipo === "reporte_zona" ? "ojo" : n.tipo === "posible_coincidencia" ? "lupa" : "corazon",
            href: n.url,
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

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[1300] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {avisos.map((a) => {
          const Icono = iconoInsignia(a.icono);
          const contenido = (
            <>
              <motion.span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terracota text-white"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...RESORTE_REBOTE, delay: 0.15 }}
              >
                <Icono className="size-5" />
              </motion.span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg leading-tight font-semibold">{a.titulo}</span>
                <span className="block truncate text-sm text-white/80">{a.detalle}</span>
              </span>
            </>
          );
          return (
            <motion.div
              key={a.id}
              layout
              role="status"
              data-testid="aviso-huellas"
              className="pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl bg-tinta px-3 py-3 text-white shadow-xl"
              initial={{ opacity: 0, y: -28, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94, transition: { duration: 0.2 } }}
              transition={RESORTE}
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
              {/* Barra que se vacía mientras el aviso sigue en pantalla. */}
              <motion.span
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ambar"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: DURACION_MS / 1000, ease: "linear" }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
