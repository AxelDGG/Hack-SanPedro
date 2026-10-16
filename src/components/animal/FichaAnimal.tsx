"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarDays, Combine, Eye, HeartHandshake, MapPin, MessageCircle, Ruler, Share2, Tag, UserRound } from "lucide-react";
import { useFichaAnimal } from "@/hooks/useFichaAnimal";
import { buttonClass } from "@/components/ui/Button";
import { HuellasCaminando } from "@/components/ui/HuellasCaminando";
import { CONDICIONES, ESPECIES, ORIGENES, SEXOS, TAMANOS } from "@/lib/constants";
import { enlaceWhatsApp, textoParaCompartir } from "@/lib/compartir";
import { fechaCorta, haceCuanto } from "@/lib/format";
import { entrarArriba, entrarEscala, escalonar } from "@/lib/motion";
import { GaleriaFotos } from "./GaleriaFotos";
import { LineaDeTiempo } from "./LineaDeTiempo";
import { ProgresoEstado } from "./ProgresoEstado";
import { StatusPill } from "./StatusPill";
import { Urgencia } from "./Urgencia";
import { AccionesRescate } from "@/components/rescate/AccionesRescate";
import { AccionesFamilia } from "./AccionesFamilia";
import { ContactoReporte } from "./ContactoReporte";
import { UnirDuplicado } from "./UnirDuplicado";

const MiniMapa = dynamic(() => import("@/components/map/MiniMapa"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-arena" />,
});

/** Ficha pública del animal; rescatistas y municipio ven además sus acciones. */
export function FichaAnimal({ id }: { id: string }) {
  const { animal, avistamientos, cambios, estado } = useFichaAnimal(id);
  const [aviso, setAviso] = useState<string | null>(null);

  if (estado === "cargando") {
    return (
      <div className="flex justify-center py-24 text-terracota/70">
        <HuellasCaminando etiqueta="Cargando ficha" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="mx-4 mt-10 rounded-3xl bg-white p-8 text-center ring-1 ring-arena-oscura">
        <p className="font-display text-lg">Este animal ya no está en el mapa.</p>
        <Link href="/" className={buttonClass("primary", "mt-4")}>
          Ir al inicio
        </Link>
      </div>
    );
  }

  // Reporte duplicado que se unió a otro: se manda al que quedó.
  if (animal.fusionado_en) {
    return (
      <div className="mx-4 mt-10 flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center ring-1 ring-arena-oscura">
        <Combine className="size-8 text-terracota" />
        <p className="font-display text-lg">Este reporte se unió con otro del mismo animal.</p>
        <Link href={`/animal/${animal.fusionado_en}`} className={buttonClass("primary")} data-testid="ir-fusionado">
          Ver el reporte completo
        </Link>
      </div>
    );
  }

  const nombre = animal.apodo ?? ESPECIES[animal.especie].label;
  const activo = animal.estado === "avistado" || animal.estado === "en_atencion";
  const mensajeWhatsApp = textoParaCompartir({ ...animal, colonia: animal.colonia?.nombre });
  const fotos = [
    ...new Set([animal.foto_portada_url, ...avistamientos.map((a) => a.foto_url)].filter((f): f is string => !!f)),
  ];

  async function compartir() {
    try {
      if (navigator.share) await navigator.share({ title: `${nombre} · CallejerOS`, text: mensajeWhatsApp });
      else {
        await navigator.clipboard.writeText(mensajeWhatsApp);
        setAviso("Enlace copiado");
        setTimeout(() => setAviso(null), 2500);
      }
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  }

  return (
    <motion.article
      className="flex flex-col gap-5 px-4 pt-4 pb-10"
      data-testid="ficha"
      variants={escalonar(0.07)}
      initial="oculto"
      animate="visible"
    >
      <motion.div variants={entrarArriba} className="flex items-center justify-between">
        <Link href="/" className="group flex min-h-11 items-center gap-1 text-base font-bold text-tinta-suave">
          <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" /> Inicio
        </Link>
        <button type="button" onClick={compartir} className="flex items-center gap-1 text-sm font-bold text-tinta-suave">
          <Share2 className="size-4" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={aviso ?? "compartir"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {aviso ?? "Compartir"}
            </motion.span>
          </AnimatePresence>
        </button>
      </motion.div>

      <motion.div variants={entrarArriba}>
        <GaleriaFotos fotos={fotos} alt={nombre} />
      </motion.div>

      <motion.header variants={entrarArriba} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold">{nombre}</h1>
          {/* Cuando el estado cambia en vivo, la etiqueta "salta". */}
          <motion.span key={animal.estado} variants={entrarEscala} initial="oculto" animate="visible">
            <StatusPill estado={animal.estado} tipo={animal.tipo} className="px-3 py-1 text-sm" />
          </motion.span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {animal.tipo !== "perdido" && <Urgencia nivel={animal.urgencia} />}
          {animal.condiciones.map((c) => (
            <span key={c} className="rounded-full bg-arena px-2.5 py-0.5 text-xs font-bold text-tinta-suave">
              {CONDICIONES[c].label}
            </span>
          ))}
        </div>
        {animal.rasgos && <p className="text-lg text-tinta-suave">{animal.rasgos}</p>}
        {animal.registro_folio && (
          <p className="flex items-center gap-1.5 text-sm font-bold text-salvia">
            <BadgeCheck className="size-4" /> Registrada en el municipio · {animal.registro_folio}
          </p>
        )}
      </motion.header>

      <motion.section variants={entrarArriba} className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
        <ProgresoEstado estado={animal.estado} tipo={animal.tipo} />
      </motion.section>

      <AccionesFamilia
        animalId={animal.id}
        tipo={animal.tipo}
        estado={animal.estado}
        reportadoPor={animal.reportado_por}
        registroFolio={animal.registro_folio}
      />

      {activo && animal.tipo !== "callejero" && (
        <motion.div variants={entrarArriba}>
          <ContactoReporte animalId={animal.id} tipo={animal.tipo} nombreAnimal={nombre} />
        </motion.div>
      )}

      {activo && (
        <motion.a
          variants={entrarArriba}
          href={enlaceWhatsApp(mensajeWhatsApp)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#1f8f4e] font-display text-lg font-semibold text-white"
          data-testid="ficha-whatsapp"
        >
          <MessageCircle className="size-5" /> Compartir en WhatsApp
        </motion.a>
      )}

      <motion.section variants={escalonar(0.05)} className="grid grid-cols-2 gap-3 text-sm">
        <Dato icono={<MapPin className="size-4" />} titulo="Colonia" valor={animal.colonia?.nombre ?? "—"} />
        <Dato
          icono={<Eye className="size-4" />}
          titulo="Avistamientos"
          valor={`${animal.total_avistamientos} · último ${haceCuanto(animal.visto_ultima_vez)}`}
        />
        <Dato
          icono={<UserRound className="size-4" />}
          titulo="Lo reportó"
          valor={`${animal.reportero?.nombre ?? "Un vecino"} · ${fechaCorta(animal.created_at)}`}
        />
        {animal.tipo === "callejero" ? (
          <Dato
            icono={<HeartHandshake className="size-4" />}
            titulo="Rescatista"
            valor={animal.rescatista?.nombre ?? "Sin asignar"}
          />
        ) : (
          <Dato
            icono={<CalendarDays className="size-4" />}
            titulo={animal.tipo === "perdido" ? "Se perdió" : "Lo encontraron"}
            valor={fechaCorta(animal.perdido_desde ?? animal.created_at)}
          />
        )}
        {(animal.raza || animal.color) && (
          <Dato icono={<Tag className="size-4" />} titulo="Raza y color" valor={[animal.raza, animal.color].filter(Boolean).join(" · ")} />
        )}
        {(animal.tamano || animal.sexo || animal.collar !== null) && (
          <Dato
            icono={<Ruler className="size-4" />}
            titulo="Tamaño"
            valor={[
              animal.tamano && TAMANOS[animal.tamano].label,
              animal.sexo && SEXOS[animal.sexo].label,
              animal.collar === true ? "con collar" : animal.collar === false ? "sin collar" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
      </motion.section>

      {animal.origen !== "app" && (
        <p className="text-sm font-semibold text-tinta-suave">Este aviso llegó desde {ORIGENES[animal.origen].label}.</p>
      )}

      <motion.div variants={entrarArriba} className="h-40 overflow-hidden rounded-2xl ring-1 ring-arena-oscura">
        <MiniMapa lat={animal.lat} lng={animal.lng} especie={animal.especie} estado={animal.estado} tipo={animal.tipo} />
      </motion.div>

      <AccionesRescate animalId={animal.id} nombre={nombre} estado={animal.estado} rescatistaId={animal.rescatista_id} />

      {activo && (
        <motion.div variants={entrarArriba} className="flex flex-col gap-2">
          <Link href={`/reportar?animal=${animal.id}`} className={buttonClass("secondary", "min-h-14 text-lg")}>
            <Eye className="size-5" /> {animal.tipo === "perdido" ? "¡Lo vi!" : "Lo vi también"}
          </Link>
          <UnirDuplicado animal={animal} />
        </motion.div>
      )}

      <motion.section variants={entrarArriba}>
        <h2 className="mb-4 font-display text-xl font-semibold">Historia</h2>
        <LineaDeTiempo avistamientos={avistamientos} cambios={cambios} />
      </motion.section>
    </motion.article>
  );
}

function Dato({ icono, titulo, valor }: { icono: React.ReactNode; titulo: string; valor: string }) {
  return (
    <motion.div variants={entrarArriba} className="rounded-2xl bg-white p-3 ring-1 ring-arena-oscura">
      <p className="flex items-center gap-1.5 text-xs font-bold text-tinta-suave">
        {icono} {titulo}
      </p>
      <p className="mt-1 font-semibold">{valor}</p>
    </motion.div>
  );
}
