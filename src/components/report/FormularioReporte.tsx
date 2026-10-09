"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFotoReporte } from "@/hooks/useFotoReporte";
import { Button } from "@/components/ui/Button";
import { CENTRO_SAN_PEDRO, ESPECIES, HUELLAS } from "@/lib/constants";
import type { Analisis } from "@/lib/ai/schema";
import type { Json } from "@/types/database.types";
import { PhotoCapture } from "./PhotoCapture";
import { AiBanner } from "./AiBanner";
import { UbicacionPicker } from "./UbicacionPicker";
import { CamposAnimal, type DatosAnimal } from "./CamposAnimal";
import { DuplicadosSugeridos, type AnimalCandidato } from "./DuplicadosSugeridos";
import { ReporteExitoso, type ResultadoReporte } from "./ReporteExitoso";

const DATOS_INICIALES: DatosAnimal = { especie: "perro", condiciones: [], urgencia: 2, rasgos: "", notas: "" };

interface Props {
  userId: string;
  /** Animal a confirmar cuando se llega desde "Lo vi también". */
  animalInicialId: string | null;
  onOtro: () => void;
}

export function FormularioReporte({ userId, animalInicialId, onOtro }: Props) {
  const { refreshProfile } = useSession();
  const gps = useGeolocation();

  const [datos, setDatos] = useState<DatosAnimal>(DATOS_INICIALES);
  const tocados = useRef(new Set<keyof DatosAnimal>());
  const [ubicacionManual, setUbicacionManual] = useState<{ lat: number; lng: number } | null>(null);
  const [candidatos, setCandidatos] = useState<AnimalCandidato[]>([]);
  const [vinculado, setVinculado] = useState<AnimalCandidato | null>(null);
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

  // "Lo vi también": carga el animal a confirmar.
  useEffect(() => {
    if (!animalInicialId) return;
    let activo = true;
    void createClient()
      .from("animals")
      .select("id, especie, apodo, rasgos, estado, foto_portada_url, visto_ultima_vez, total_avistamientos")
      .eq("id", animalInicialId)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo || !data) return;
        const { foto_portada_url, ...resto } = data;
        setVinculado({ ...resto, fotos: foto_portada_url ? [foto_portada_url] : [] });
      });
    return () => {
      activo = false;
    };
  }, [animalInicialId]);

  // "¿Es este?": busca animales parecidos cerca en cuanto hay foto, especie y ubicación.
  const { lat, lng } = ubicacion;
  useEffect(() => {
    if (!foto.tieneFoto || animalInicialId) return;
    let activo = true;
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("find_duplicate_candidates", {
        p_lat: lat,
        p_lng: lng,
        p_especie: datos.especie,
      });
      if (!activo) return;
      setCandidatos(
        (data ?? []).map((c) => ({
          ...c,
          fotos: c.fotos.length > 0 ? c.fotos : c.foto_portada_url ? [c.foto_portada_url] : [],
        })),
      );
    }, 500);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [foto.tieneFoto, animalInicialId, lat, lng, datos.especie]);

  const esConfirmacion = vinculado !== null;
  const mostrarFormulario = foto.tieneFoto || esConfirmacion;
  const puedePublicar = (esConfirmacion || foto.tieneFoto) && foto.ia.tipo !== "analizando";

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
        p_especie: vinculado?.especie ?? datos.especie,
        p_urgencia: datos.urgencia,
        p_condiciones: datos.condiciones,
        p_rasgos: esConfirmacion ? undefined : datos.rasgos.trim() || undefined,
        p_notas: datos.notas.trim() || undefined,
        p_foto_url: fotoUrl ?? undefined,
        p_analisis_ia: analisis ?? undefined,
        p_animal_id: vinculado?.id,
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

  if (resultado) return <ReporteExitoso resultado={resultado} esConfirmacion={esConfirmacion} onOtro={onOtro} />;

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      {animalInicialId && vinculado && (
        <DuplicadosSugeridos candidatos={[vinculado]} seleccionado={vinculado.id} onSeleccionar={() => undefined} />
      )}

      <section className="flex flex-col gap-3">
        {esConfirmacion && !foto.tieneFoto && (
          <p className="text-sm font-semibold text-tinta-suave">Agrega una foto actual si puedes (opcional).</p>
        )}
        <PhotoCapture previewUrl={foto.preview} onFoto={foto.elegir} />
        <AiBanner estado={foto.ia} />
      </section>

      {!animalInicialId && (
        <DuplicadosSugeridos candidatos={candidatos} seleccionado={vinculado?.id ?? null} onSeleccionar={setVinculado} />
      )}

      {mostrarFormulario && (
        <>
          <section className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
            <h2 className="mb-3 text-sm font-bold">¿Dónde lo viste?</h2>
            <UbicacionPicker
              ubicacion={ubicacion}
              manual={ubicacionManual !== null}
              gps={gps}
              especie={vinculado?.especie ?? datos.especie}
              onMover={moverPin}
              onUsarGps={() => setUbicacionManual(null)}
            />
          </section>

          <section className="rounded-3xl bg-white p-4 ring-1 ring-arena-oscura">
            {esConfirmacion && (
              <p className="mb-4 rounded-xl bg-salvia/10 px-3 py-2 text-sm font-semibold text-salvia">
                Vas a confirmar a {vinculado.apodo ?? `este ${ESPECIES[vinculado.especie].label.toLowerCase()}`}: cuéntanos cómo lo viste hoy.
              </p>
            )}
            <CamposAnimal datos={datos} onCambio={cambiar} soloSeguimiento={esConfirmacion} />
          </section>

          {error && <p className="rounded-xl bg-terracota/10 px-3 py-2 text-sm text-terracota-oscuro">{error}</p>}

          <Button onClick={publicar} disabled={!puedePublicar || enviando} className="py-4 text-lg" data-testid="publicar">
            {enviando ? (
              <>
                <LoaderCircle className="size-5 animate-spin" /> Publicando…
              </>
            ) : esConfirmacion ? (
              <>
                <Send className="size-5" /> Confirmar avistamiento · +{HUELLAS.confirmacion}
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
