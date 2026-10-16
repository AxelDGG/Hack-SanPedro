"use client";

import { Lock } from "lucide-react";
import type { TipoReporte } from "@/lib/constants";
import { normalizarTelefono } from "./estado";
import { CampoTexto, Grupo, Pregunta } from "./controles";

interface Props {
  tipo: TipoReporte | null;
  apodo: string;
  nombre: string;
  telefono: string;
  onNombre: (v: string) => void;
  onTelefono: (v: string) => void;
}

export function telefonoValido(t: string) {
  return normalizarTelefono(t).length === 10;
}

export function PasoContacto({ tipo, apodo, nombre, telefono, onNombre, onTelefono }: Props) {
  const perdido = tipo === "perdido";
  const tel = normalizarTelefono(telefono);
  const mostrarError = tel.length > 0 && tel.length !== 10;

  return (
    <div className="flex flex-col gap-5">
      <Pregunta
        titulo={perdido ? "¿A dónde te avisamos?" : "¿Cómo te contacta la familia?"}
        ayuda={
          perdido
            ? `Si alguien ve a ${apodo.trim() || "tu mascota"}, podrá llamarte o mandarte WhatsApp.`
            : "Opcional. Si es de alguien, su familia podrá comunicarse contigo."
        }
      />
      <Grupo titulo="Tu nombre">
        <CampoTexto valor={nombre} onCambio={onNombre} maxLength={60} etiqueta="Tu nombre" autoComplete="given-name" placeholder="Ej. Doña Mary" testId="contacto-nombre" />
      </Grupo>
      <Grupo titulo="Teléfono o WhatsApp" ayuda="10 dígitos">
        <CampoTexto
          valor={telefono}
          onCambio={onTelefono}
          maxLength={16}
          tipo="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dictado={false}
          etiqueta="Teléfono"
          placeholder="81 1234 5678"
          testId="contacto-telefono"
        />
        {mostrarError && <p className="text-base font-semibold text-terracota-oscuro">Revisa el número: deben ser 10 dígitos.</p>}
      </Grupo>
      <p className="flex items-start gap-2 rounded-2xl bg-arena px-4 py-3 text-base text-tinta-suave">
        <Lock className="mt-0.5 size-5 shrink-0" />
        Tu teléfono no aparece en el mapa público: solo lo ven los vecinos que entran a la app para ayudar.
      </p>
    </div>
  );
}
