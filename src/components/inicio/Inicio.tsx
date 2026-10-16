/* eslint-disable @next/next/no-img-element -- fotos de Storage o placeholders locales */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Bell, ChevronRight, ClipboardPaste, MapIcon, MessageCircle } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { Pagina } from "@/components/layout/Pagina";
import { Logo } from "@/components/ui/Logo";
import { BotonesTipo } from "@/components/report/asistente/BotonesTipo";
import { useColonias } from "@/hooks/useColonias";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import { createClient } from "@/lib/supabase/client";
import { ESPECIES, TIPOS, etiquetaEstado, type Especie, type Estado, type TipoReporte } from "@/lib/constants";
import { enlaceReportar, enlaceWhatsApp } from "@/lib/compartir";
import { distanciaM } from "@/lib/geo/zonas";
import { haceCuanto } from "@/lib/format";
import { RESORTE_REBOTE, entrarArriba, escalonar } from "@/lib/motion";

interface Reciente {
  id: string;
  tipo: TipoReporte;
  especie: Especie;
  apodo: string | null;
  estado: Estado;
  lat: number;
  lng: number;
  foto_portada_url: string | null;
  created_at: string;
  colonias: { nombre: string } | null;
}

/**
 * Inicio: tres botones grandes para reportar, sin menús ni mapa que aprender.
 * Debajo, lo más reciente cerca de tu colonia y los links para compartir en tus grupos.
 */
export function Inicio() {
  const { profile } = useSession();
  const nombre = profile && profile.nombre !== "Vecino" ? profile.nombre.split(" ")[0] : null;

  return (
    <Pagina>
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Logo />
        <Campana />
      </header>

      <section className="px-4 pt-6">
        <h1 className="font-display text-[2rem] leading-tight font-semibold">{nombre ? `¡Hola, ${nombre}!` : "¡Hola, vecino!"}</h1>
        <p className="mt-1 text-lg text-tinta-suave">¿Qué pasó? Toca una opción.</p>
        <div className="mt-5">
          <BotonesTipo />
        </div>
        <Link
          href="/reportar?pegar=1"
          className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl px-2 text-lg font-semibold text-salvia"
          data-testid="inicio-pegar"
        >
          <ClipboardPaste className="size-6 shrink-0" /> ¿Te llegó por WhatsApp? Pega el mensaje
        </Link>
      </section>

      <CercaDeTi coloniaId={profile?.colonia_id ?? null} />
      <CompartirEnGrupos />
    </Pagina>
  );
}

function Campana() {
  const { noLeidas } = useNotificaciones(20);
  return (
    <Link
      href="/avisos"
      aria-label={noLeidas > 0 ? `Avisos: ${noLeidas} sin leer` : "Avisos"}
      className="relative flex size-12 items-center justify-center rounded-full bg-white ring-2 ring-arena-oscura"
      data-testid="campana"
    >
      <Bell className="size-6" />
      {noLeidas > 0 && (
        <motion.span
          key={noLeidas}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={RESORTE_REBOTE}
          className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-terracota px-1.5 text-sm font-bold text-white"
        >
          {noLeidas > 9 ? "9+" : noLeidas}
        </motion.span>
      )}
    </Link>
  );
}

function CercaDeTi({ coloniaId }: { coloniaId: number | null }) {
  const colonias = useColonias();
  const [recientes, setRecientes] = useState<Reciente[] | null>(null);

  useEffect(() => {
    let activo = true;
    void createClient()
      .from("animals")
      .select("id, tipo, especie, apodo, estado, lat, lng, foto_portada_url, created_at, colonias(nombre)")
      .is("fusionado_en", null)
      .in("estado", ["avistado", "en_atencion"])
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => activo && setRecientes((data as Reciente[] | null) ?? []));
    return () => {
      activo = false;
    };
  }, []);

  const mia = colonias.find((c) => c.id === coloniaId);
  // Con colonia: lo más cercano a ella primero; sin colonia, lo más reciente.
  const lista = (recientes ?? [])
    .map((r) => ({ ...r, dist: mia ? distanciaM([mia.lat, mia.lng], [r.lat, r.lng]) : 0 }))
    .sort((a, b) => (mia ? a.dist - b.dist : 0))
    .slice(0, 4);

  return (
    <section className="px-4 pt-8">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">{mia ? `Cerca de ${mia.nombre}` : "Reportes recientes"}</h2>
        <Link href="/mapa" className="flex items-center gap-1 text-base font-bold text-terracota">
          <MapIcon className="size-5" /> Mapa
        </Link>
      </div>
      {recientes === null ? (
        <div className="h-48 animate-pulse rounded-3xl bg-arena" />
      ) : lista.length === 0 ? (
        <p className="rounded-3xl bg-white p-5 text-lg text-tinta-suave ring-2 ring-arena-oscura">Por ahora no hay reportes abiertos.</p>
      ) : (
        <motion.ul className="flex flex-col gap-2" variants={escalonar(0.05)} initial="oculto" animate="visible">
          {lista.map((r) => (
            <motion.li key={r.id} variants={entrarArriba}>
              <Link href={`/animal/${r.id}`} className="flex items-center gap-3 rounded-3xl bg-white p-2.5 ring-2 ring-arena-oscura">
                <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-arena">
                  {r.foto_portada_url && <img src={r.foto_portada_url} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-sm font-bold"
                    style={{ backgroundColor: TIPOS[r.tipo].fondo, color: TIPOS[r.tipo].color }}
                  >
                    {etiquetaEstado(r.estado, r.tipo)}
                  </span>
                  <p className="mt-1 truncate font-display text-xl font-semibold">{r.apodo ?? ESPECIES[r.especie].label}</p>
                  <p className="truncate text-base text-tinta-suave">
                    {r.colonias?.nombre ?? "San Pedro"} · {haceCuanto(r.created_at)}
                  </p>
                </div>
                <ChevronRight className="size-6 shrink-0 text-tinta-suave" />
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}

/** Para quien administra o participa en grupos: un link que centraliza todo en un solo lugar. */
function CompartirEnGrupos() {
  const mensaje = () =>
    [
      "¿Se te perdió tu perro o gato, o viste uno en la calle?",
      "Repórtalo en CallejerOS, sin registrarte, y avisamos a los vecinos de tu colonia:",
      `• Se me perdió: ${enlaceReportar("perdido")}`,
      `• Vi o encontré uno: ${enlaceReportar("encontrado")}`,
      `• Hay un callejero: ${enlaceReportar("callejero")}`,
    ].join("\n");

  return (
    <section className="px-4 pt-8 pb-8">
      <div className="rounded-3xl bg-salvia/10 p-5">
        <h2 className="font-display text-xl font-semibold text-salvia">¿Estás en grupos de vecinos?</h2>
        <p className="mt-1 text-base text-tinta">
          Comparte el link: cada aviso de mascota perdida o animal en la calle queda en un solo lugar, con mapa y alertas.
        </p>
        <button
          type="button"
          onClick={() => window.open(enlaceWhatsApp(mensaje()), "_blank", "noopener")}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1f8f4e] font-display text-lg font-semibold text-white"
          data-testid="compartir-grupos"
        >
          <MessageCircle className="size-6" /> Compartir en WhatsApp
        </button>
      </div>
    </section>
  );
}
