"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, LogOut, PawPrint, Trophy } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useSession, type Profile } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagina } from "@/components/layout/Pagina";
import { Button } from "@/components/ui/Button";
import { NumeroAnimado } from "@/components/ui/NumeroAnimado";
import { GridInsignias } from "@/components/gamificacion/GridInsignias";
import { MOTIVOS } from "@/components/gamificacion/insignias";
import { useGamificacion } from "@/hooks/useGamificacion";
import { useColonias } from "@/hooks/useColonias";
import { createClient } from "@/lib/supabase/client";
import { ROLES } from "@/lib/constants";
import { haceCuanto } from "@/lib/format";
import { entrarArriba, escalonar } from "@/lib/motion";

export function PerfilView() {
  return (
    <Pagina>
      <PageHeader title="Perfil" />
      <RequireAuth motivo="para ver tu perfil">{(profile) => <Contenido profile={profile} />}</RequireAuth>
    </Pagina>
  );
}

function Contenido({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { signOut, refreshProfile } = useSession();
  const resumen = useGamificacion(profile.id, profile.puntos);
  const colonias = useColonias();
  const [guardandoColonia, setGuardandoColonia] = useState(false);
  // Optimista: el selector cambia al instante y el perfil se sincroniza después.
  const [coloniaSel, setColoniaSel] = useState<number | null>(profile.colonia_id);

  async function cambiarColonia(id: string) {
    setColoniaSel(id ? Number(id) : null);
    setGuardandoColonia(true);
    await createClient()
      .from("profiles")
      .update({ colonia_id: id ? Number(id) : null })
      .eq("id", profile.id);
    await refreshProfile();
    setGuardandoColonia(false);
  }

  const ganadas = resumen?.insignias.filter((i) => i.otorgada_at).length ?? 0;

  return (
    <motion.div className="flex flex-col gap-4 px-4 pb-10" variants={escalonar(0.07)} initial="oculto" animate="visible">
      <motion.section variants={entrarArriba} className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-arena-oscura">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-terracota/15 font-display text-2xl font-semibold text-terracota">
          {profile.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-semibold">{profile.nombre}</p>
          <span className="mt-1 inline-block rounded-full bg-arena px-2.5 py-0.5 text-xs font-bold tracking-wide text-tinta-suave uppercase">
            {ROLES[profile.rol].label}
          </span>
          <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-tinta-suave">
            Colonia
            <select
              value={coloniaSel ?? ""}
              onChange={(e) => cambiarColonia(e.target.value)}
              disabled={guardandoColonia}
              className="min-w-0 flex-1 rounded-lg border border-arena-oscura bg-crema px-2 py-1 text-sm text-tinta"
              data-testid="colonia"
            >
              <option value="">Sin colonia</option>
              {colonias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </motion.section>

      <motion.section variants={entrarArriba} className="relative overflow-hidden rounded-3xl bg-terracota p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-90">Tus huellas</p>
            <p className="font-display text-5xl font-semibold" data-testid="huellas">
              <NumeroAnimado valor={profile.puntos} retraso={0.25} duracion={1.4} />
            </p>
          </div>
          {/* La huella "respira" y se ladea, como un perrito esperando. */}
          <motion.span
            animate={{ rotate: [0, -10, 0, 8, 0], y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <PawPrint className="size-14 opacity-80" />
          </motion.span>
        </div>
        {resumen && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Reportes", resumen.reportes],
                ["Confirmaciones", resumen.confirmaciones],
                ["Casos resueltos", resumen.casos_resueltos],
              ] as const
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-2xl bg-white/15 px-2 py-2">
                <dd className="font-display text-2xl font-semibold">
                  <NumeroAnimado valor={valor} retraso={0.4} />
                </dd>
                <dt className="text-[11px] leading-tight font-semibold opacity-90">{etiqueta}</dt>
              </div>
            ))}
          </dl>
        )}
      </motion.section>

      <motion.nav variants={entrarArriba} className="grid grid-cols-2 gap-2">
        <Atajo href="/manada" icono={<PawPrint className="size-5" />} titulo="Mi Manada" />
        <Atajo href="/ranking" icono={<Trophy className="size-5" />} titulo="Ranking" />
      </motion.nav>

      {resumen && (
        <>
          <motion.section variants={entrarArriba}>
            <h2 className="mb-2 flex items-baseline justify-between font-display text-xl font-semibold">
              Insignias
              <span className="text-sm font-semibold text-tinta-suave">
                {ganadas} de {resumen.insignias.length}
              </span>
            </h2>
            <GridInsignias insignias={resumen.insignias} />
          </motion.section>

          {resumen.recientes.length > 0 && (
            <motion.section variants={entrarArriba}>
              <h2 className="mb-2 font-display text-xl font-semibold">Actividad reciente</h2>
              <motion.ul
                className="divide-y divide-arena rounded-3xl bg-white px-4 ring-1 ring-arena-oscura"
                variants={escalonar(0.05)}
                initial="oculto"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
              >
                {resumen.recientes.map((e) => (
                  <motion.li key={e.id} variants={entrarArriba} className="flex items-center gap-3 py-3">
                    <span className="flex-1 text-sm">
                      {e.animal_id ? (
                        <Link href={`/animal/${e.animal_id}`} className="font-semibold">
                          {MOTIVOS[e.motivo] ?? e.motivo}
                        </Link>
                      ) : (
                        MOTIVOS[e.motivo] ?? e.motivo
                      )}
                      <span className="block text-xs text-tinta-suave">{haceCuanto(e.created_at)}</span>
                    </span>
                    <span className="font-display text-lg font-semibold text-terracota">+{e.puntos}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.section>
          )}
        </>
      )}

      <motion.div variants={entrarArriba} className="flex flex-col">
        <Button
          variant="danger"
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          <LogOut className="size-5" /> Cerrar sesión
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Atajo({ href, icono, titulo }: { href: string; icono: React.ReactNode; titulo: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-display font-semibold ring-1 ring-arena-oscura transition active:scale-[0.98]"
    >
      <span className="text-terracota transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">{icono}</span>
      <span className="flex-1">{titulo}</span>
      <ChevronRight className="size-4 text-tinta-suave transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
