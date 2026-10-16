"use client";

import { useState } from "react";
import { ClipboardPaste, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ORIGENES, type Origen } from "@/lib/constants";
import type { RespuestaPublicacion } from "@/lib/ai/schema";
import { CampoTexto, Grupo, Opciones } from "./controles";
import { Hoja } from "./Hoja";

const ORIGENES_GRUPO: Origen[] = ["whatsapp", "facebook", "instagram"];

/**
 * "Me llegó por un grupo": se pega el mensaje tal cual y la IA saca los datos
 * (tipo, nombre, raza, color, colonia, teléfono…) para no volver a escribirlos.
 */
export function PegarPublicacion({
  abierta,
  onCerrar,
  onLeida,
}: {
  abierta: boolean;
  onCerrar: () => void;
  onLeida: (r: RespuestaPublicacion, origen: Origen) => void;
}) {
  const [texto, setTexto] = useState("");
  const [origen, setOrigen] = useState<Origen>("whatsapp");
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pegar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setTexto(t.slice(0, 3000));
    } catch {
      setError("Tu celular no dejó pegar automáticamente. Mantén presionado el cuadro y elige Pegar.");
    }
  }

  async function leer() {
    setLeyendo(true);
    setError(null);
    try {
      const res = await fetch("/api/analizar-publicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onLeida(json as RespuestaPublicacion, origen);
      setTexto("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No pudimos leer la publicación.");
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <Hoja abierta={abierta} titulo="Pegar mensaje de un grupo" onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        <p className="text-base text-tinta-suave">
          Copia el mensaje del grupo (mantén presionado → Copiar) y pégalo aquí. Nosotros sacamos los datos.
        </p>
        <Button variant="secondary" onClick={pegar} className="min-h-14 text-lg">
          <ClipboardPaste className="size-5" /> Pegar lo que copié
        </Button>
        <CampoTexto
          valor={texto}
          onCambio={setTexto}
          multilinea
          maxLength={3000}
          dictado={false}
          etiqueta="Mensaje del grupo"
          placeholder="Ej. Se busca a Luna, schnauzer gris, se perdió ayer en Del Valle. Informes al 81 1234 5678"
          testId="texto-publicacion"
        />
        <Grupo titulo="¿De dónde viene?">
          <Opciones
            nombre="origen"
            opciones={ORIGENES_GRUPO.map((o) => [o, ORIGENES[o].label])}
            valor={origen}
            onCambio={setOrigen}
          />
        </Grupo>
        {error && <p className="rounded-xl bg-terracota/10 px-3 py-2 text-base text-terracota-oscuro">{error}</p>}
        <Button onClick={leer} disabled={texto.trim().length < 10 || leyendo} className="min-h-14 text-lg" data-testid="leer-publicacion">
          {leyendo ? <LoaderCircle className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          {leyendo ? "Leyendo…" : "Llenar con este mensaje"}
        </Button>
      </div>
    </Hoja>
  );
}
