"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Bell, BellOff, BellRing, ChevronRight, Eye, Heart, Mail, MapPin, Plus, Search, X } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useSession, type Profile } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { useNotificaciones, type Notificacion } from "@/hooks/useNotificaciones";
import { useColonias } from "@/hooks/useColonias";
import { usePush } from "@/hooks/usePush";
import { createClient } from "@/lib/supabase/client";
import { haceCuanto } from "@/lib/format";
import { entrarArriba, escalonar } from "@/lib/motion";

export function AvisosView() {
  return (
    <Pagina>
      <PageHeader title="Avisos" subtitle="Lo que pasa cerca de ti, en cuanto pasa." />
      <RequireAuth motivo="para recibir avisos de tu colonia" invitado>
        {(profile) => (
          <div className="flex flex-col gap-8 px-4 pb-10">
            <Configuracion profile={profile} />
            <Lista />
          </div>
        )}
      </RequireAuth>
    </Pagina>
  );
}

const ICONOS: Record<string, typeof Bell> = { reporte_zona: Eye, posible_coincidencia: Search, avistamiento_mascota: Heart };

function Lista() {
  const { lista, cargando, noLeidas, marcarLeidas } = useNotificaciones();

  // Al abrir la página, lo nuevo cuenta como visto (con un respiro para que se note qué era nuevo).
  useEffect(() => {
    if (noLeidas === 0) return;
    const t = setTimeout(() => void marcarLeidas(), 2500);
    return () => clearTimeout(t);
  }, [noLeidas, marcarLeidas]);

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-semibold">Recientes</h2>
      {cargando ? (
        <div className="h-40 animate-pulse rounded-3xl bg-arena" />
      ) : lista.length === 0 ? (
        <p className="rounded-3xl bg-white p-5 text-lg text-tinta-suave ring-2 ring-arena-oscura">
          Aún no hay avisos. Te avisaremos cuando reporten algo en tus colonias.
        </p>
      ) : (
        <motion.ul className="flex flex-col gap-2" variants={escalonar(0.04)} initial="oculto" animate="visible" data-testid="lista-avisos">
          {lista.map((n) => (
            <motion.li key={n.id} variants={entrarArriba}>
              <Item n={n} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}

function Item({ n }: { n: Notificacion }) {
  const Icono = ICONOS[n.tipo] ?? Bell;
  return (
    <Link
      href={n.url}
      className={`flex items-start gap-3 rounded-3xl p-4 ring-2 transition ${
        n.leida ? "bg-white ring-arena-oscura" : "bg-terracota/8 ring-terracota/50"
      }`}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${n.leida ? "bg-arena text-tinta" : "bg-terracota text-white"}`}
      >
        <Icono className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg leading-tight font-semibold">{n.titulo}</span>
        <span className="mt-0.5 block text-base text-tinta-suave">{n.cuerpo}</span>
        <span className="mt-1 block text-sm font-semibold text-tinta-suave">{haceCuanto(n.created_at)}</span>
      </span>
      <ChevronRight className="mt-3 size-5 shrink-0 text-tinta-suave" />
    </Link>
  );
}

function Configuracion({ profile }: { profile: Profile }) {
  const { user } = useSession();
  const colonias = useColonias();
  const push = usePush(profile.id);
  const supabase = useMemo(() => createClient(), []);
  const [seguidas, setSeguidas] = useState<number[] | null>(null);
  const [correo, setCorreo] = useState({ activo: false, email: "" });
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let activo = true;
    void Promise.all([
      supabase.from("suscripciones_colonia").select("colonia_id").eq("user_id", profile.id),
      supabase.from("perfiles_privados").select("alertas_email, email_alertas").eq("user_id", profile.id).maybeSingle(),
    ]).then(([s, p]) => {
      if (!activo) return;
      setSeguidas((s.data ?? []).map((x) => x.colonia_id));
      setCorreo({
        activo: p.data?.alertas_email ?? false,
        email: p.data?.email_alertas ?? (user?.is_anonymous ? "" : (user?.email ?? "")),
      });
    });
    return () => {
      activo = false;
    };
  }, [supabase, profile.id, user]);

  async function seguir(id: number) {
    setSeguidas((prev) => [...(prev ?? []), id]);
    await supabase.from("suscripciones_colonia").insert({ user_id: profile.id, colonia_id: id });
  }
  async function dejar(id: number) {
    setSeguidas((prev) => (prev ?? []).filter((x) => x !== id));
    await supabase.from("suscripciones_colonia").delete().eq("user_id", profile.id).eq("colonia_id", id);
  }
  async function guardarCorreo(activo: boolean) {
    const email = correo.email.trim();
    if (activo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setCorreo({ activo, email });
    await supabase
      .from("perfiles_privados")
      .upsert({ user_id: profile.id, alertas_email: activo, email_alertas: email || null });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  const nombreDe = (id: number) => colonias.find((c) => c.id === id)?.nombre ?? "…";
  const disponibles = colonias.filter((c) => !seguidas?.includes(c.id));

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-2 ring-arena-oscura">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <BellRing className="size-6 text-terracota" /> Alertas de mi zona
      </h2>

      <div className="flex flex-col gap-2">
        <p className="text-base font-bold">Colonias que sigo</p>
        <p className="text-sm text-tinta-suave">Te avisamos de reportes en ellas y en las colonias de junto.</p>
        <ul className="flex flex-wrap gap-2" data-testid="colonias-seguidas">
          {seguidas?.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => void dejar(id)}
                aria-label={`Dejar de seguir ${nombreDe(id)}`}
                className="flex min-h-11 items-center gap-1.5 rounded-full bg-terracota/10 pr-3 pl-4 text-base font-bold text-terracota-oscuro"
              >
                <MapPin className="size-4" /> {nombreDe(id)} <X className="size-4" />
              </button>
            </li>
          ))}
          {seguidas?.length === 0 && <li className="text-base text-tinta-suave">Todavía ninguna.</li>}
        </ul>
        <div className="relative">
          <Plus className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-terracota" />
          <select
            value=""
            onChange={(e) => e.target.value && void seguir(Number(e.target.value))}
            aria-label="Agregar colonia"
            className="min-h-14 w-full appearance-none rounded-2xl border-2 border-arena-oscura bg-white pr-4 pl-12 text-lg font-semibold outline-none focus:border-terracota"
            data-testid="agregar-colonia"
          >
            <option value="">Agregar una colonia…</option>
            {disponibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t-2 border-dashed border-arena-oscura pt-4">
        <p className="text-base font-bold">En este celular</p>
        {push.estado === "activo" ? (
          <button
            type="button"
            onClick={() => void push.desactivar()}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-salvia/10 text-lg font-semibold text-salvia"
          >
            <BellRing className="size-5" /> Avisos activados · Desactivar
          </button>
        ) : push.estado === "inactivo" ? (
          <button
            type="button"
            onClick={() => void push.activar()}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-terracota font-display text-lg font-semibold text-white"
            data-testid="activar-push"
          >
            <Bell className="size-5" /> Activar avisos en este celular
          </button>
        ) : (
          <p className="flex items-start gap-2 rounded-2xl bg-arena px-4 py-3 text-base text-tinta-suave">
            <BellOff className="mt-0.5 size-5 shrink-0" />
            {push.estado === "bloqueado"
              ? "Bloqueaste los avisos para esta página. Actívalos en los ajustes del navegador."
              : push.estado === "no-soportado"
                ? "Este navegador no recibe avisos. En iPhone, primero agrega la app a tu pantalla de inicio."
                : "Revisando…"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t-2 border-dashed border-arena-oscura pt-4">
        <p className="flex items-center gap-2 text-base font-bold">
          <Mail className="size-5" /> Por correo
        </p>
        <input
          type="email"
          value={correo.email}
          onChange={(e) => setCorreo((c) => ({ ...c, email: e.target.value }))}
          placeholder="tucorreo@ejemplo.com"
          aria-label="Correo para alertas"
          autoComplete="email"
          className="min-h-14 w-full rounded-2xl border-2 border-arena-oscura bg-white px-4 text-lg outline-none focus:border-terracota"
          data-testid="correo-alertas"
        />
        <button
          type="button"
          onClick={() => void guardarCorreo(!correo.activo)}
          className={`min-h-14 rounded-2xl font-display text-lg font-semibold ${
            correo.activo ? "bg-salvia/10 text-salvia" : "bg-tinta text-white"
          }`}
          data-testid="activar-correo"
        >
          {correo.activo ? "Correos activados · Desactivar" : "Recibir alertas por correo"}
        </button>
        {guardado && <p className="text-base font-semibold text-salvia">Guardado.</p>}
      </div>
    </section>
  );
}
