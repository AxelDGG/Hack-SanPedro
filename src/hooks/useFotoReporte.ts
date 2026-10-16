"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { redimensionarFoto } from "@/lib/image/resize";
import { huellaFoto } from "@/lib/image/huella";
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

async function analizar(blob: Blob, huella: Awaited<ReturnType<typeof huellaFoto>> | null): Promise<EstadoIA> {
  try {
    const form = new FormData();
    form.append("foto", blob, "foto.jpg");
    // Con IA simulada, la huella y el color sirven para reconocer las fotos de la demo.
    if (huella) {
      form.append("huella", String(huella.huella));
      form.append("color", huella.color.join(","));
    }
    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) return { tipo: "error", mensaje: json.error ?? "No se pudo analizar la foto." };
    return { tipo: "listo", respuesta: json as RespuestaAnalisis };
  } catch {
    return { tipo: "error", mensaje: "Sin conexión con el análisis." };
  }
}

/**
 * Foto del reporte: la reduce, la sube a Storage, calcula su huella (para detectar la misma foto
 * reenviada) y la manda a analizar, todo en paralelo.
 * `onAnalisis` recibe el resultado de la IA para prellenar el formulario.
 */
export function useFotoReporte(userId: string, onAnalisis: (a: Analisis) => void) {
  const [preview, setPreview] = useState<string | null>(null);
  const [ia, setIa] = useState<EstadoIA>({ tipo: "inactivo" });
  const [huella, setHuella] = useState<number | null>(null);
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

      const h = await huellaFoto(reducida).catch(() => null);
      if (v !== version.current) return;
      setHuella(h?.huella ?? null);

      const resultado = await analizar(reducida, h);
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

  /**
   * Foto que llegó por URL (compartida desde WhatsApp hacia la app). Se procesa como cualquier
   * otra —al redibujarla se pierden los metadatos EXIF, incluido el GPS de quien la tomó— y el
   * original se borra de Storage para que no quede público.
   */
  const cargarDesdeUrl = useCallback(
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return;
      const b = await res.blob();
      await elegir(new File([b], "compartida.jpg", { type: b.type || "image/jpeg" }));
      const ruta = url.split(`/object/public/${BUCKET_FOTOS}/`)[1];
      if (ruta?.startsWith(`${userId}/`)) await createClient().storage.from(BUCKET_FOTOS).remove([ruta]);
    },
    [elegir, userId],
  );

  return { preview, ia, huella, elegir, cargarDesdeUrl, urlFoto, tieneFoto: preview !== null };
}
