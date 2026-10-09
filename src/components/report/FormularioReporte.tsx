"use client";

import { useCallback, useRef, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFotoReporte } from "@/hooks/useFotoReporte";
import { Button } from "@/components/ui/Button";
import { CENTRO_SAN_PEDRO, HUELLAS } from "@/lib/constants";
import type { Analisis } from "@/lib/ai/schema";
import type { Json } from "@/types/database.types";
import { PhotoCapture } from "./PhotoCapture";
import { AiBanner } from "./AiBanner";
import { UbicacionPicker } from "./UbicacionPicker";
import { CamposAnimal, type DatosAnimal } from "./CamposAnimal";
import { ReporteExitoso, type ResultadoReporte } from "./ReporteExitoso";

const DATOS_INICIALES: DatosAnimal = { especie: "perro", condiciones: [], urgencia: 2, rasgos: "", notas: "" };

interface Props {
  userId: string;
  onOtro: () => void;
}

export function FormularioReporte({ userId, onOtro }: Props) {
  const { refreshProfile } = useSession();
  const gps = useGeolocation();

  const [datos, setDatos] = useState<DatosAnimal>(DATOS_INICIALES);
  const tocados = useRef(new Set<keyof DatosAnimal>());
  const [ubicacionManual, setUbicacionManual] = useState<{ lat: number; lng: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoReporte | null>(null);

  // La IA prellena solo lo que el usuario no ha tocado.
  const aplicarIA = useCallback((a: Analisis) => {
    setDatos((prev) => ({
      ...prev,
      especie: tocados.current.has("especie") ? prev.especie : a.especie,
      condiciones: tocados.current.has("condiciones") ? prev.condiciones : a.condiciones,
      urgencia: tocados.current.has("urgencia") ? prev.urgencia : a.urgencia,
      rasgos: tocados.current.has("rasgos") ? prev.rasgos : a.rasgos,
    }));
  }, []);

  const foto = useFotoReporte(userId, aplicarIA);

  const cambiar = useCallback(<K extends keyof DatosAnimal>(campo: K, valor: DatosAnimal[K]) => {
    tocados.current.add(campo);
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const ubicacion =
    ubicacionManual ??
    (gps.posicion ? { lat: gps.posicion.lat, lng: gps.posicion.lng } : { lat: CENTRO_SAN_PEDRO[0], lng: CENTRO_SAN_PEDRO[1] });

  const moverPin = useCallback((lat: number, lng: number) => setUbicacionManual({ lat, lng }), []);

  async function publicar() {
    setEnviando(true);
    setError(null);
    try {
      const fotoUrl = await foto.urlFoto();
      const analisis =
        foto.ia.tipo === "listo"
          ? ({ ...foto.ia.respuesta.analisis, fuente: foto.ia.respuesta.fuente, modelo: foto.ia.respuesta.modelo ?? null } as Json)
          : null;

      const { data, error } = await createClient().rpc("report_sighting", {
        p_lat: ubicacion.lat,
        p_lng: ubicacion.lng,
        p_especie: datos.especie,
        p_urgencia: datos.urgencia,
        p_condiciones: datos.condiciones,
        p_rasgos: datos.rasgos.trim() || undefined,
        p_notas: datos.notas.trim() || undefined,
        p_foto_url: fotoUrl ?? undefined,
        p_analisis_ia: analisis ?? undefined,
      });
      if (error) throw error;

      setResultado(data as unknown as ResultadoReporte);
      void refreshProfile();
    } catch (e) {
      console.error(e);
      setError("No se pudo publicar el reporte. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) return <ReporteExitoso resultado={resultado} esConfirmacion={false} onOtro={onOtro} />;

  const listo = foto.tieneFoto && foto.ia.tipo !== "analizando";

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      <section className="flex flex-col gap-3">
        <PhotoCapture previewUrl={foto.preview} onFoto={foto.elegir} />
        <AiBanner estado={foto.ia} />
      </section>

      {foto.tieneFoto && (
        <>
          <section className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
            <h2 className="mb-3 text-sm font-bold">¿Dónde lo viste?</h2>
            <UbicacionPicker
              ubicacion={ubicacion}
              manual={ubicacionManual !== null}
              gps={gps}
              especie={datos.especie}
              onMover={moverPin}
              onUsarGps={() => setUbicacionManual(null)}
            />
          </section>

          <section className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
            <CamposAnimal datos={datos} onCambio={cambiar} />
          </section>

          {error && <p className="rounded-xl bg-terracota/10 px-3 py-2 text-sm text-terracota-oscuro">{error}</p>}

          <Button onClick={publicar} disabled={!listo || enviando} className="py-4 text-lg" data-testid="publicar">
            {enviando ? (
              <>
                <LoaderCircle className="size-5 animate-spin" /> Publicando…
              </>
            ) : (
              <>
                <Send className="size-5" /> Publicar reporte · +{HUELLAS.reporte} huellas
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
