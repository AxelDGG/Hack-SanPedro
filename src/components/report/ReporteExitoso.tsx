"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Award, BellRing, Heart, MessageCircle, PawPrint } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { enlaceWhatsApp, textoParaCompartir } from "@/lib/compartir";
import { NumeroAnimado } from "@/components/ui/NumeroAnimado";
import { EASE_SOFT, RESORTE_REBOTE, entrarArriba, entrarEscala, escalonar } from "@/lib/motion";

export interface ResultadoReporte {
  animal_id: string;
  sighting_id: string;
  puntos: number;
  /** Notificaciones creadas para vecinos o para la familia de una mascota perdida. */
  notificados: number;
  insignias: { codigo: string; nombre: string; icono: string }[];
  /** Frases de lo que se avisó (vecinos, registro municipal…), calculadas en el cliente. */
  avisos?: string[];
}

interface Props {
  resultado: ResultadoReporte;
  esConfirmacion: boolean;
  /** Datos para armar el mensaje de WhatsApp. */
  compartir: Parameters<typeof textoParaCompartir>[0];
  onOtro: () => void;
}

export function ReporteExitoso({ resultado, esConfirmacion, compartir, onOtro }: Props) {
  return (
    <motion.div
      className="flex flex-col items-center gap-5 px-4 pt-10 text-center"
      data-testid="reporte-exitoso"
      variants={escalonar(0.09, 0.35)}
      initial="oculto"
      animate="visible"
    >
      <Celebracion />

      <motion.div variants={entrarArriba}>
        <h1 className="font-display text-3xl font-semibold">
          {esConfirmacion ? "¡Gracias por confirmar!" : "¡Reporte publicado!"}
        </h1>
        <p className="mt-2 text-tinta-suave">
          {esConfirmacion
            ? "Tu avistamiento ayuda a saber dónde está y cómo sigue."
            : "Ya aparece en el mapa de toda la comunidad y los rescatistas pueden verlo."}
        </p>
      </motion.div>

      {resultado.avisos && resultado.avisos.length > 0 && (
        <motion.ul variants={entrarArriba} className="flex w-full flex-col gap-2" data-testid="avisos-enviados">
          {resultado.avisos.map((a) => (
            <li key={a} className="flex items-start gap-2 rounded-2xl bg-salvia/10 px-4 py-3 text-left text-base font-semibold text-salvia">
              <BellRing className="mt-0.5 size-5 shrink-0" /> {a}
            </li>
          ))}
        </motion.ul>
      )}

      {!esConfirmacion && (
        <motion.a
          variants={entrarArriba}
          href={enlaceWhatsApp(textoParaCompartir(compartir))}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#1f8f4e] px-4 font-display text-xl font-semibold text-white shadow-md"
          data-testid="compartir-whatsapp"
        >
          <MessageCircle className="size-6" /> Compartir en mis grupos
        </motion.a>
      )}

      {resultado.puntos > 0 ? (
        <motion.p
          variants={entrarEscala}
          className="rounded-full bg-terracota/10 px-5 py-2 font-display text-2xl font-semibold text-terracota"
        >
          +<NumeroAnimado valor={resultado.puntos} retraso={0.6} /> huellas
        </motion.p>
      ) : (
        esConfirmacion && (
          <motion.p variants={entrarArriba} className="text-sm text-tinta-suave">
            Ya habías sumado huellas por este animal; tu avistamiento igual cuenta.
          </motion.p>
        )
      )}

      {resultado.insignias.length > 0 && (
        <motion.div variants={entrarArriba} className="w-full rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
          <p className="mb-2 text-sm font-bold">¡Nueva insignia!</p>
          <motion.ul className="flex flex-col gap-2" variants={escalonar(0.12)}>
            {resultado.insignias.map((i) => (
              <motion.li key={i.codigo} variants={entrarEscala} className="flex items-center gap-2 font-display text-lg">
                <motion.span
                  animate={{ rotate: [0, -18, 14, -8, 0], scale: [1, 1.2, 1] }}
                  transition={{ delay: 1.1, duration: 0.8 }}
                >
                  <Award className="size-6 text-ambar" />
                </motion.span>
                {i.nombre}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      )}

      <motion.div variants={entrarArriba} className="grid w-full grid-cols-2 gap-2">
        <button type="button" onClick={onOtro} className={buttonClass("secondary")}>
          Reportar otro
        </button>
        <Link href={`/animal/${resultado.animal_id}`} className={buttonClass("primary")}>
          Ver ficha
        </Link>
      </motion.div>
      <motion.div variants={entrarArriba}>
        <Link href="/" className="text-base font-semibold text-tinta-suave underline">
          Volver al inicio
        </Link>
      </motion.div>
    </motion.div>
  );
}

// Huellitas y corazones que salen disparados en círculo (posiciones fijas, sin azar).
const PARTICULAS = Array.from({ length: 12 }, (_, i) => {
  const angulo = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const distancia = 82 + (i % 3) * 16;
  return {
    x: Math.cos(angulo) * distancia,
    y: Math.sin(angulo) * distancia,
    giro: (i % 2 ? 1 : -1) * (25 + i * 8),
    Icono: i % 3 === 1 ? Heart : PawPrint,
    color: ["text-terracota", "text-ambar", "text-salvia"][i % 3],
  };
});

function Celebracion() {
  return (
    <div className="relative my-4">
      {/* Ondas que se expanden detrás de la huella. */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full bg-terracota/25"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 2.1, opacity: [0, 0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 + i, ease: "easeOut" }}
        />
      ))}

      {PARTICULAS.map(({ x, y, giro, Icono, color }, i) => (
        <motion.span
          key={i}
          className={`absolute top-1/2 left-1/2 -mt-2.5 -ml-2.5 ${color}`}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
          animate={{ x, y, scale: [0, 1.15, 0.8], opacity: [0, 1, 0], rotate: giro }}
          transition={{ duration: 1.2, delay: 0.25 + (i % 4) * 0.03, ease: EASE_SOFT }}
        >
          <Icono className="size-5 fill-current" />
        </motion.span>
      ))}

      <motion.span
        className="relative flex size-24 items-center justify-center rounded-full bg-terracota text-white shadow-lg"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...RESORTE_REBOTE, delay: 0.1 }}
      >
        <motion.span
          className="block"
          animate={{ rotate: [0, -14, 12, -6, 0] }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeInOut" }}
        >
          <PawPrint className="size-12" />
        </motion.span>
      </motion.span>
    </div>
  );
}
