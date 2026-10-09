"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { redimensionarFoto } from "@/lib/image/resize";
import { BUCKET_FOTOS } from "@/lib/constants";
import type { EstadoIA } from "@/components/report/AiBanner";
import type { Analisis, RespuestaAnalisis } from "@/lib/ai/schema";

async function subir(blob: Blob, userId: string): Promise<string> {
  const supabase = createClient();
  const ruta = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
}

async function analizar(blob: Blob): Promise<EstadoIA> {
  try {
    const form = new FormData();
    form.append("foto", blob, "foto.jpg");
    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) return { tipo: "error", mensaje: json.error ?? "No se pudo analizar la foto." };
    return { tipo: "listo", respuesta: json as RespuestaAnalisis };
  } catch {
    return { tipo: "error", mensaje: "Sin conexión con el análisis." };
  }
}

/**
 * Foto del reporte: la reduce, la sube a Storage y la manda a analizar en paralelo.
 * `onAnalisis` recibe el resultado de la IA para prellenar el formulario.
 */
export function useFotoReporte(userId: string, onAnalisis: (a: Analisis) => void) {
  const [preview, setPreview] = useState<string | null>(null);
  const [ia, setIa] = useState<EstadoIA>({ tipo: "inactivo" });
  const blob = useRef<Blob | null>(null);
  const subida = useRef<Promise<string> | null>(null);
  const version = useRef(0);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const elegir = useCallback(
    async (archivo: File) => {
      const v = ++version.current;
      setIa({ tipo: "analizando" });

      let reducida: Blob;
      try {
        reducida = await redimensionarFoto(archivo);
      } catch {
        setIa({ tipo: "error", mensaje: "No pudimos leer esa foto." });
        return;
      }
      if (v !== version.current) return;

      blob.current = reducida;
      setPreview(URL.createObjectURL(reducida));
      subida.current = subir(reducida, userId);
      subida.current.catch(() => undefined); // se reintenta al publicar

      const resultado = await analizar(reducida);
      if (v !== version.current) return;
      setIa(resultado);
      if (resultado.tipo === "listo" && resultado.respuesta.analisis.es_animal) onAnalisis(resultado.respuesta.analisis);
    },
    [userId, onAnalisis],
  );

  /** URL pública de la foto; reintenta la subida una vez si falló. */
  const urlFoto = useCallback(async (): Promise<string | null> => {
    if (!blob.current || !subida.current) return null;
    try {
      return await subida.current;
    } catch {
      subida.current = subir(blob.current, userId);
      return await subida.current;
    }
  }, [userId]);

  return { preview, ia, elegir, urlFoto, tieneFoto: preview !== null };
}
