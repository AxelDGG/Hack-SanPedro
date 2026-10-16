/* eslint-disable @next/next/no-img-element -- fotos de Storage, placeholders o del registro */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Check, ExternalLink, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ESPECIES, TIPOS, etiquetaEstado, type Especie, type Estado, type TipoReporte } from "@/lib/constants";
import { distancia, haceCuanto } from "@/lib/format";
import { entrarArriba, escalonar } from "@/lib/motion";
import type { CoincidenciaRegistro } from "@/lib/registro/tipos";
import { Pregunta } from "./controles";

export interface AnimalCandidato {
  id: string;
  tipo: TipoReporte;
  especie: Especie;
  apodo: string | null;
  rasgos: string | null;
  raza?: string | null;
  color?: string | null;
  estado: Estado;
  fotos: string[];
  visto_ultima_vez: string;
  total_avistamientos: number;
  distancia_m?: number;
  puntaje?: number;
  motivos?: string[];
  misma_foto?: boolean;
}

interface Props {
  tipo: TipoReporte;
  candidatos: AnimalCandidato[];
  registro: CoincidenciaRegistro[];
  seleccionado: string | null;
  registroElegido: string | null;
  onSeleccionar: (a: AnimalCandidato | null) => void;
  onRegistro: (folio: string | null) => void;
}

function etiquetaParecido(c: AnimalCandidato) {
  if (c.misma_foto) return "¡Es la misma foto!";
  if ((c.puntaje ?? 0) >= 0.75) return "Se parece mucho";
  return "Se parece";
}

/**
 * "¿Es alguno de estos?": evita el reporte duplicado y conecta perdidos con encontrados.
 * - Quien encontró o vio uno: si es el mismo, confirma (suma avistamiento, no crea otro).
 * - Quien busca a su mascota: si la reconoce, ve el contacto de quien la encontró.
 */
export function PasoCoincidencias({ tipo, candidatos, registro, seleccionado, registroElegido, onSeleccionar, onRegistro }: Props) {
  const buscaSuMascota = tipo === "perdido";
  const [contacto, setContacto] = useState<{ nombre: string; telefono: string } | null>(null);

  // La familia reconoció a su mascota: mostramos cómo comunicarse con quien la reportó.
  useEffect(() => {
    if (!buscaSuMascota || !seleccionado) return;
    let activo = true;
    void createClient()
      .rpc("ver_contacto", { p_animal_id: seleccionado })
      .then(({ data }) => activo && setContacto(data?.[0] ?? null));
    return () => {
      activo = false;
      setContacto(null);
    };
  }, [buscaSuMascota, seleccionado]);

  return (
    <div className="flex flex-col gap-4" data-testid="duplicados">
      <Pregunta
        titulo={buscaSuMascota ? "¿Alguno es tu mascota?" : "¿Es alguno de estos?"}
        ayuda={
          buscaSuMascota
            ? "Vecinos reportaron animales parecidos cerca. Revisa las fotos."
            : "Ya los reportaron cerca de aquí. Si es el mismo, lo confirmas y no se duplica."
        }
      />

      <motion.ul className="flex flex-col gap-3" variants={escalonar(0.06)} initial="oculto" animate="visible">
        {candidatos.map((c) => {
          const activo = c.id === seleccionado;
          const foto = c.fotos[0];
          return (
            <motion.li key={c.id} variants={entrarArriba}>
              <button
                type="button"
                onClick={() => onSeleccionar(activo ? null : c)}
                aria-pressed={activo}
                className={`relative flex w-full gap-3 overflow-hidden rounded-3xl bg-white p-3 text-left ring-[3px] transition active:scale-[0.99] ${
                  activo ? "ring-terracota" : "ring-arena-oscura"
                }`}
              >
                <div className="size-28 shrink-0 overflow-hidden rounded-2xl bg-arena">
                  {foto && <img src={foto} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className="self-start rounded-full px-2.5 py-0.5 text-sm font-bold"
                    style={{ backgroundColor: TIPOS[c.tipo].fondo, color: TIPOS[c.tipo].color }}
                  >
                    {etiquetaEstado(c.estado, c.tipo)}
                  </span>
                  <p className="truncate font-display text-xl font-semibold">{c.apodo ?? ESPECIES[c.especie].label}</p>
                  <p className="line-clamp-2 text-base text-tinta-suave">
                    {[c.raza, c.color, c.rasgos].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm font-semibold text-tinta-suave">
                    {c.distancia_m !== undefined && `${distancia(c.distancia_m)} · `}
                    {haceCuanto(c.visto_ultima_vez)}
                  </p>
                  <p className="text-sm font-bold text-salvia">
                    {etiquetaParecido(c)}
                    {c.motivos && c.motivos.length > 0 && ` · ${c.motivos.filter((m) => m !== "Misma foto").join(", ")}`}
                  </p>
                </div>
                {activo && (
                  <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-terracota text-white shadow">
                    <Check className="size-5" strokeWidth={3} />
                  </span>
                )}
              </button>
            </motion.li>
          );
        })}
      </motion.ul>

      {buscaSuMascota && seleccionado && (
        <div className="flex flex-col gap-2 rounded-3xl bg-salvia/10 p-4" data-testid="contacto-encontrado">
          <p className="font-display text-xl font-semibold text-salvia">¡Ojalá sea!</p>
          {contacto ? (
            <>
              <p className="text-base">
                Lo reportó <strong>{contacto.nombre}</strong>. Comunícate para confirmar:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:+52${contacto.telefono}`}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-semibold ring-2 ring-arena-oscura"
                >
                  <Phone className="size-5" /> Llamar
                </a>
                <a
                  href={`https://wa.me/52${contacto.telefono}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#1f8f4e] text-lg font-semibold text-white"
                >
                  <MessageCircle className="size-5" /> WhatsApp
                </a>
              </div>
            </>
          ) : (
            <p className="text-base">Abre la ficha para ver dónde lo vieron y avisar ahí.</p>
          )}
          <Link href={`/animal/${seleccionado}`} target="_blank" className="flex items-center gap-1 text-base font-bold text-salvia underline">
            Ver la ficha completa <ExternalLink className="size-4" />
          </Link>
          <p className="text-sm text-tinta-suave">Igual puedes publicar tu reporte para que más vecinos lo busquen.</p>
        </div>
      )}

      {registro.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <BadgeCheck className="size-5 text-salvia" /> En el registro municipal hay mascotas parecidas
          </h3>
          <p className="text-sm text-tinta-suave">Si crees que es una de ellas, le avisamos a su familia cuando publiques.</p>
          {registro.map(({ mascota: m, motivos }) => {
            const activo = registroElegido === m.folio;
            return (
              <button
                key={m.folio}
                type="button"
                onClick={() => onRegistro(activo ? null : m.folio)}
                aria-pressed={activo}
                className={`relative flex items-center gap-3 rounded-3xl bg-white p-3 text-left ring-[3px] transition ${
                  activo ? "ring-salvia" : "ring-arena-oscura"
                }`}
              >
                <img src={m.foto_url} alt="" className="size-20 shrink-0 rounded-2xl bg-arena object-cover" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-xl font-semibold">
                    {m.nombre} {m.estatus === "extraviado" && <span className="text-base text-terracota">· la buscan</span>}
                  </span>
                  <span className="text-base text-tinta-suave">
                    {m.raza} · {m.color} · {m.colonia.nombre}
                  </span>
                  <span className="text-sm font-bold text-salvia">{motivos.join(", ")}</span>
                </span>
                {activo && (
                  <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-salvia text-white">
                    <Check className="size-5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </section>
      )}

      {candidatos.length > 0 && (
        <button
          type="button"
          onClick={() => onSeleccionar(null)}
          aria-pressed={seleccionado === null}
          className={`min-h-14 rounded-2xl font-display text-lg font-medium ring-2 transition ${
            seleccionado === null ? "bg-tinta text-white ring-tinta" : "bg-white text-tinta ring-arena-oscura"
          }`}
        >
          {buscaSuMascota ? "Ninguno es mi mascota" : "No, es otro animal"}
        </button>
      )}
    </div>
  );
}
