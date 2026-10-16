"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// La Web Speech API no viene en los tipos de TypeScript del DOM.
interface Reconocimiento {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type ConstructorReconocimiento = new () => Reconocimiento;

function constructor(): ConstructorReconocimiento | null {
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocimiento; webkitSpeechRecognition?: ConstructorReconocimiento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictado por voz en español de México: para quien prefiere hablar que escribir en el celular.
 * `onTexto` recibe lo que se dijo cuando termina la frase.
 */
export function useDictado(onTexto: (texto: string) => void) {
  const [soportado, setSoportado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const rec = useRef<Reconocimiento | null>(null);
  const callback = useRef(onTexto);

  useEffect(() => {
    callback.current = onTexto;
  }, [onTexto]);

  // Se decide en el cliente para que el HTML del servidor coincida al hidratar.
  useEffect(() => {
    queueMicrotask(() => setSoportado(constructor() !== null));
    return () => rec.current?.stop();
  }, []);

  const alternar = useCallback(() => {
    if (rec.current) {
      rec.current.stop();
      return;
    }
    const Ctor = constructor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "es-MX";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const texto = Array.from(e.results, (res) => res[0].transcript).join(" ").trim();
      if (texto) callback.current(texto);
    };
    r.onend = r.onerror = () => {
      rec.current = null;
      setEscuchando(false);
    };
    rec.current = r;
    setEscuchando(true);
    r.start();
  }, []);

  return { soportado, escuchando, alternar };
}
