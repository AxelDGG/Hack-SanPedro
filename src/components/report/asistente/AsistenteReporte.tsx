"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, LoaderCircle, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/SessionProvider";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFotoReporte } from "@/hooks/useFotoReporte";
import { useColonias } from "@/hooks/useColonias";
import { CENTRO_SAN_PEDRO, HUELLAS, TIPOS, type Origen, type TipoReporte } from "@/lib/constants";
import { EASE_SOFT } from "@/lib/motion";
import type { Analisis, RespuestaPublicacion } from "@/lib/ai/schema";
import type { CoincidenciaRegistro, MascotaRegistro } from "@/lib/registro/tipos";
import type { Json } from "@/types/database.types";
import { ReporteExitoso, type ResultadoReporte } from "../ReporteExitoso";
import { BotonesTipo } from "./BotonesTipo";
import { BuscarRegistro } from "./BuscarRegistro";
import { PasoCoincidencias, type AnimalCandidato } from "./PasoCoincidencias";
import { PasoContacto, telefonoValido } from "./PasoContacto";
import { PasoDatos } from "./PasoDatos";
import { PasoDonde } from "./PasoDonde";
import { PasoFoto } from "./PasoFoto";
import { PegarPublicacion } from "./PegarPublicacion";
import { Pregunta } from "./controles";
import { DATOS_INICIALES, fechaDesdeTexto, normalizarTelefono, ordenPasos, type DatosReporte, type Paso } from "./estado";

interface Props {
  userId: string;
  tipoInicial: TipoReporte | null;
  /** Animal a confirmar cuando se llega desde "Lo vi también". */
  animalInicialId: string | null;
  /** Foto y texto que llegaron compartidos desde otra app (WhatsApp → Compartir → CallejerOS). */
  fotoCompartida: string | null;
  textoCompartido: string | null;
  origenInicial: Origen | null;
  /** Abre directo "Pegar mensaje de un grupo". */
  abrirPegar?: boolean;
  onOtro: () => void;
}

/**
 * Asistente para reportar, una pregunta por pantalla y con botones grandes:
 * pensado para que una persona mayor pueda reportar sin escribir casi nada.
 */
export function AsistenteReporte({
  userId,
  tipoInicial,
  animalInicialId,
  fotoCompartida,
  textoCompartido,
  origenInicial,
  abrirPegar = false,
  onOtro,
}: Props) {
  const router = useRouter();
  const { profile, refreshProfile } = useSession();
  const gps = useGeolocation();
  const colonias = useColonias();
  const supabase = useMemo(() => createClient(), []);

  const tipoFijo = tipoInicial !== null || animalInicialId !== null;
  const [datos, setDatos] = useState<DatosReporte>({
    ...DATOS_INICIALES,
    tipo: tipoInicial,
    origen: origenInicial ?? "app",
  });
  const tocados = useRef(new Set<keyof DatosReporte>());
  const [prellenado, setPrellenado] = useState<"ia" | "registro" | "publicacion" | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [registroMascota, setRegistroMascota] = useState<MascotaRegistro | null>(null);
  const [leido, setLeido] = useState<string | null>(null);
  const [ubicacionManual, setUbicacionManual] = useState<{ lat: number; lng: number } | null>(null);
  const [candidatos, setCandidatos] = useState<AnimalCandidato[]>([]);
  const [registroCoinc, setRegistroCoinc] = useState<CoincidenciaRegistro[]>([]);
  // Mientras se buscan parecidos no se avanza de "¿Dónde?": si no, un toque rápido salta "¿Es alguno de estos?".
  const [buscandoParecidos, setBuscandoParecidos] = useState(false);
  const [vinculado, setVinculado] = useState<AnimalCandidato | null>(null);
  const [registroAviso, setRegistroAviso] = useState<string | null>(null);
  const [paso, setPaso] = useState<Paso>(tipoFijo ? "foto" : "tipo");
  const [hoja, setHoja] = useState<"pegar" | "registro" | null>(abrirPegar ? "pegar" : null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoReporte | null>(null);
  const contenido = useRef<HTMLDivElement>(null);

  const cambiar = useCallback(<K extends keyof DatosReporte>(campo: K, valor: DatosReporte[K]) => {
    tocados.current.add(campo);
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  /** Llena solo lo que la persona no ha tocado. */
  const prellenar = useCallback((nuevos: Partial<DatosReporte>, marcar = false) => {
    setDatos((prev) => {
      const sig = { ...prev };
      for (const [k, v] of Object.entries(nuevos) as [keyof DatosReporte, never][]) {
        if (v === undefined || v === "" || tocados.current.has(k)) continue;
        sig[k] = v;
        if (marcar) tocados.current.add(k);
      }
      return sig;
    });
  }, []);

  const aplicarIA = useCallback(
    (a: Analisis) => {
      prellenar({
        especie: a.especie,
        raza: a.raza,
        color: a.color,
        tamano: a.tamano,
        sexo: a.sexo === "desconocido" ? undefined : a.sexo,
        collar: a.collar,
        rasgos: a.rasgos,
        condiciones: a.condiciones,
        urgencia: a.urgencia,
      });
      setPrellenado((p) => p ?? "ia");
    },
    [prellenar],
  );

  const foto = useFotoReporte(userId, aplicarIA);

  // ───────── Datos de contacto guardados (para no volver a escribirlos) ─────────
  useEffect(() => {
    let activo = true;
    void supabase
      .from("perfiles_privados")
      .select("telefono")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return;
        prellenar({
          contactoTelefono: data?.telefono ?? undefined,
          contactoNombre: profile && profile.nombre !== "Vecino" ? profile.nombre : undefined,
        });
      });
    return () => {
      activo = false;
    };
  }, [supabase, userId, profile, prellenar]);

  // ───────── Ubicación ─────────
  const ubicacion =
    ubicacionManual ??
    (gps.posicion ? { lat: gps.posicion.lat, lng: gps.posicion.lng } : { lat: CENTRO_SAN_PEDRO[0], lng: CENTRO_SAN_PEDRO[1] });
  const moverPin = useCallback((lat: number, lng: number) => setUbicacionManual({ lat, lng }), []);

  // ───────── Publicación pegada de un grupo ─────────
  const aplicarPublicacion = useCallback(
    (r: RespuestaPublicacion, origen: Origen) => {
      const p = r.publicacion;
      const telefono = normalizarTelefono(p.telefono);
      prellenar(
        {
          especie: p.especie === "desconocido" ? undefined : p.especie,
          apodo: p.nombre,
          raza: p.raza,
          color: p.color,
          tamano: p.tamano === "desconocido" ? undefined : p.tamano,
          sexo: p.sexo === "desconocido" ? undefined : p.sexo,
          rasgos: p.rasgos,
          contactoNombre: p.contacto || undefined,
          contactoTelefono: telefono.length === 10 ? telefono : undefined,
          perdidoDesde: fechaDesdeTexto(p.fecha) ?? undefined,
        },
        true,
      );
      setDatos((prev) => ({ ...prev, origen, tipo: tipoFijo ? prev.tipo : p.tipo }));
      const colonia = colonias.find((c) => c.id === r.colonia_id);
      if (colonia) setUbicacionManual({ lat: colonia.lat, lng: colonia.lng });
      setPrellenado("publicacion");
      setLeido(
        [
          TIPOS[tipoFijo && datos.tipo ? datos.tipo : p.tipo].titulo.toLowerCase(),
          p.nombre,
          p.raza,
          p.color,
          colonia?.nombre ?? p.colonia,
          telefono.length === 10 ? `tel. ${telefono}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      setHoja(null);
      if (!tipoFijo) setPaso("foto");
    },
    [prellenar, colonias, tipoFijo, datos.tipo],
  );

  // Contenido compartido desde otra app: se carga una sola vez.
  const compartidoCargado = useRef(false);
  useEffect(() => {
    if (compartidoCargado.current || colonias.length === 0) return;
    compartidoCargado.current = true;
    if (fotoCompartida) void foto.cargarDesdeUrl(fotoCompartida);
    if (textoCompartido && textoCompartido.trim().length >= 10) {
      void fetch("/api/analizar-publicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoCompartido }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((r: RespuestaPublicacion | null) => r && aplicarPublicacion(r, origenInicial ?? "whatsapp"));
    }
  }, [colonias.length, fotoCompartida, textoCompartido, origenInicial, foto, aplicarPublicacion]);

  // ───────── Registro municipal ─────────
  function aplicarRegistro(m: MascotaRegistro) {
    prellenar(
      {
        apodo: m.nombre,
        especie: m.especie,
        raza: m.raza,
        color: m.color,
        tamano: m.tamano,
        sexo: m.sexo,
        rasgos: m.senas_particulares ?? undefined,
        registroFolio: m.folio,
      },
      true,
    );
    setRegistroMascota(m);
    setPrellenado("registro");
    setHoja(null);
  }

  // ───────── "¿Es este?": parecidos en la app y en el registro ─────────
  const { lat, lng } = ubicacion;
  const listoParaBuscar = datos.tipo !== null && !animalInicialId && (foto.tieneFoto || datos.tipo === "perdido");
  useEffect(() => {
    if (!listoParaBuscar || !datos.tipo) return;
    let activo = true;
    const tipo = datos.tipo;
    queueMicrotask(() => activo && setBuscandoParecidos(true));
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("find_duplicate_candidates", {
        p_lat: lat,
        p_lng: lng,
        p_especie: datos.especie,
        p_tipo: tipo,
        p_color: datos.color || undefined,
        p_raza: datos.raza || undefined,
        p_tamano: datos.tamano ?? undefined,
        p_foto_hash: foto.huella ?? undefined,
      });
      if (!activo) return;
      setCandidatos(
        (data ?? []).map((c) => ({
          ...c,
          fotos: c.fotos.length > 0 ? c.fotos : c.foto_portada_url ? [c.foto_portada_url] : [],
        })),
      );

      // Un perro "encontrado" o callejero puede ser una mascota registrada que se salió.
      if (tipo !== "perdido" && (datos.raza || datos.color)) {
        const res = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "coincidencias",
            especie: datos.especie,
            raza: datos.raza,
            color: datos.color,
            tamano: datos.tamano,
            lat,
            lng,
          }),
        }).catch(() => null);
        const json = res?.ok ? await res.json() : null;
        if (activo) setRegistroCoinc(json?.data ?? []);
      }
      if (activo) setBuscandoParecidos(false);
    }, 600);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [listoParaBuscar, datos.tipo, datos.especie, datos.color, datos.raza, datos.tamano, lat, lng, foto.huella, supabase]);

  // "Lo vi también": carga el animal a confirmar.
  useEffect(() => {
    if (!animalInicialId) return;
    let activo = true;
    void supabase
      .from("animals")
      .select("id, tipo, especie, apodo, rasgos, raza, color, estado, foto_portada_url, visto_ultima_vez, total_avistamientos")
      .eq("id", animalInicialId)
      .maybeSingle()
      .then(({ data }) => {
        if (!activo || !data) return;
        const { foto_portada_url, ...resto } = data;
        setVinculado({ ...resto, fotos: foto_portada_url ? [foto_portada_url] : [] });
        setDatos((prev) => ({ ...prev, tipo: data.tipo, especie: data.especie === "gato" ? "gato" : "perro" }));
      });
    return () => {
      activo = false;
    };
  }, [animalInicialId, supabase]);

  // ───────── Pasos ─────────
  const confirmaExistente = animalInicialId !== null || (vinculado !== null && datos.tipo !== "perdido");
  const pasos = useMemo(() => {
    const lista = ordenPasos({
      tipo: datos.tipo,
      tipoFijo,
      confirmacion: animalInicialId !== null,
      hayCoincidencias: candidatos.length > 0 || registroCoinc.length > 0 || paso === "coincidencias",
    });
    // Si eligió un reporte existente, ya no hace falta su contacto: se suma como avistamiento.
    return confirmaExistente ? lista.filter((p) => p !== "contacto") : lista;
  }, [datos.tipo, tipoFijo, animalInicialId, candidatos.length, registroCoinc.length, paso, confirmaExistente]);

  const indice = Math.max(0, pasos.indexOf(paso));
  const esUltimo = indice === pasos.length - 1;

  const irA = useCallback((p: Paso) => {
    setPaso(p);
    setError(null);
    contenido.current?.scrollTo({ top: 0 });
  }, []);

  const esperandoParecidos = paso === "donde" && (buscandoParecidos || foto.ia.tipo === "analizando");
  const puedeSeguir = (() => {
    switch (paso) {
      case "tipo":
        return datos.tipo !== null;
      case "foto":
        // La foto es obligatoria para avistamientos nuevos; una mascota perdida puede ir sin foto.
        return confirmaExistente || foto.tieneFoto || datos.tipo === "perdido";
      case "contacto":
        return datos.tipo === "perdido"
          ? telefonoValido(datos.contactoTelefono)
          : !datos.contactoTelefono.trim() || telefonoValido(datos.contactoTelefono);
      default:
        return true;
    }
  })();

  async function publicar() {
    setEnviando(true);
    setError(null);
    try {
      const tipo = datos.tipo ?? "callejero";
      const animalId = animalInicialId ?? (tipo !== "perdido" ? vinculado?.id : undefined);
      const esNuevo = !animalId;
      const fotoUrl = (await foto.urlFoto()) ?? registroMascota?.foto_url ?? null;
      const analisis =
        foto.ia.tipo === "listo"
          ? ({ ...foto.ia.respuesta.analisis, fuente: foto.ia.respuesta.fuente, modelo: foto.ia.respuesta.modelo ?? null } as Json)
          : null;
      const telefono = normalizarTelefono(datos.contactoTelefono);
      const conContacto = esNuevo && tipo !== "callejero" && telefono.length === 10;

      const { data, error } = await supabase.rpc("report_sighting", {
        p_lat: ubicacion.lat,
        p_lng: ubicacion.lng,
        p_especie: vinculado?.especie ?? datos.especie,
        p_urgencia: datos.urgencia,
        p_condiciones: datos.condiciones,
        p_rasgos: esNuevo ? datos.rasgos.trim() || undefined : undefined,
        p_notas: datos.notas.trim() || undefined,
        p_foto_url: fotoUrl ?? undefined,
        p_analisis_ia: analisis ?? undefined,
        p_animal_id: animalId,
        p_tipo: tipo,
        p_apodo: datos.apodo.trim() || undefined,
        p_raza: datos.raza.trim() || undefined,
        p_color: datos.color.trim() || undefined,
        p_tamano: datos.tamano ?? undefined,
        p_sexo: datos.sexo ?? undefined,
        p_collar: datos.collar ?? undefined,
        p_perdido_desde: tipo === "perdido" ? (datos.perdidoDesde ?? undefined) : undefined,
        p_registro_folio: datos.registroFolio ?? undefined,
        p_origen: datos.origen,
        p_foto_hash: foto.huella ?? undefined,
        p_contacto_nombre: conContacto ? datos.contactoNombre.trim() || undefined : undefined,
        p_contacto_telefono: conContacto ? telefono : undefined,
      });
      if (error) throw error;
      const r = data as unknown as ResultadoReporte;

      // Lo que sigue no debe tumbar el reporte si falla.
      const avisos: string[] = [];
      if (telefono.length === 10) {
        void supabase.from("perfiles_privados").upsert({ user_id: userId, telefono });
      }
      if (datos.contactoNombre.trim() && profile?.nombre === "Vecino") {
        void supabase.from("profiles").update({ nombre: datos.contactoNombre.trim().slice(0, 60) }).eq("id", userId);
      }
      // Push y correo a los vecinos suscritos (las notificaciones ya se crearon en la base).
      void fetch("/api/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animal_id: r.animal_id }),
      }).catch(() => undefined);

      if (esNuevo && tipo === "perdido" && datos.registroFolio) {
        const ok = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "extravio", folio: datos.registroFolio, animal_id: r.animal_id }),
        })
          .then((x) => x.ok)
          .catch(() => false);
        if (ok) avisos.push("Quedó marcada como extraviada en el registro municipal.");
      }
      if (registroAviso) {
        const ok = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "avisar", folio: registroAviso, animal_id: r.animal_id }),
        })
          .then((x) => x.ok)
          .catch(() => false);
        const nombre = registroCoinc.find((c) => c.mascota.folio === registroAviso)?.mascota.nombre;
        if (ok) avisos.push(`Le mandamos un mensaje a la familia de ${nombre ?? "la mascota registrada"} por el registro municipal.`);
      }
      if (r.notificados > 0) {
        avisos.unshift(
          animalId && vinculado?.tipo === "perdido"
            ? "Le avisamos a su familia que la viste."
            : `Avisamos a ${r.notificados} ${r.notificados === 1 ? "vecino" : "vecinos"} de la zona.`,
        );
      }

      setResultado({ ...r, avisos });
      void refreshProfile();
    } catch (e) {
      console.error(e);
      const mensaje = e && typeof e === "object" && "message" in e ? String(e.message) : "";
      setError(
        /solo registramos|teléfono|muchos reportes/i.test(mensaje)
          ? mensaje
          : "No se pudo publicar el reporte. Revisa tu conexión e intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function siguiente() {
    if (esUltimo) void publicar();
    else irA(pasos[indice + 1]);
  }

  if (resultado) {
    return (
      <div className="fixed inset-0 z-[1200] overflow-y-auto bg-crema pb-10">
        <div className="mx-auto max-w-lg">
          <ReporteExitoso
            resultado={resultado}
            esConfirmacion={confirmaExistente}
            compartir={{
              id: resultado.animal_id,
              tipo: vinculado?.tipo ?? datos.tipo ?? "callejero",
              especie: vinculado?.especie ?? datos.especie,
              apodo: vinculado?.apodo ?? (datos.apodo.trim() || null),
              raza: vinculado?.raza ?? datos.raza,
              color: vinculado?.color ?? datos.color,
              rasgos: datos.rasgos,
            }}
            onOtro={onOtro}
          />
        </div>
      </div>
    );
  }

  const tipo = datos.tipo;
  const titulo = animalInicialId ? "Lo vi también" : tipo ? TIPOS[tipo].titulo : "Reportar";

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-crema" data-testid="asistente">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Salir sin publicar"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-arena-oscura"
        >
          <X className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold" style={{ color: tipo ? TIPOS[tipo].color : undefined }}>
            {titulo}
          </p>
          <p className="text-sm font-semibold text-tinta-suave">
            Paso {indice + 1} de {pasos.length}
          </p>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-lg gap-1.5 px-4 pb-3" aria-hidden>
        {pasos.map((p, i) => (
          <motion.span
            key={p}
            layout
            className="h-2 flex-1 rounded-full"
            animate={{ backgroundColor: i <= indice ? (tipo ? TIPOS[tipo].color : "#e2583e") : "#e6d5ba" }}
          />
        ))}
      </div>

      <div ref={contenido} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 pt-2 pb-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={paso}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: EASE_SOFT }}
            >
              {paso === "tipo" && (
                <>
                  <Pregunta titulo="¿Qué pasó?" ayuda="Elige una opción." />
                  <BotonesTipo
                    onElegir={(t) => {
                      setDatos((prev) => ({ ...prev, tipo: t }));
                      irA("foto");
                    }}
                  />
                </>
              )}
              {paso === "foto" && (
                <PasoFoto
                  tipo={tipo}
                  confirmacion={animalInicialId !== null}
                  preview={foto.preview}
                  ia={foto.ia}
                  registro={registroMascota}
                  leidoDePublicacion={leido}
                  onFoto={foto.elegir}
                  onPegar={() => setHoja("pegar")}
                  onBuscarRegistro={() => setHoja("registro")}
                />
              )}
              {paso === "donde" && (
                <PasoDonde
                  tipo={tipo}
                  confirmacion={confirmaExistente}
                  especie={datos.especie}
                  ubicacion={ubicacion}
                  manual={ubicacionManual !== null}
                  gps={gps}
                  perdidoDesde={datos.perdidoDesde}
                  onMover={moverPin}
                  onUsarGps={() => setUbicacionManual(null)}
                  onCuando={(iso) => cambiar("perdidoDesde", iso)}
                />
              )}
              {paso === "coincidencias" && tipo && (
                <PasoCoincidencias
                  tipo={tipo}
                  candidatos={candidatos}
                  registro={registroCoinc}
                  seleccionado={vinculado?.id ?? null}
                  registroElegido={registroAviso}
                  onSeleccionar={setVinculado}
                  onRegistro={setRegistroAviso}
                />
              )}
              {paso === "datos" && (
                <PasoDatos
                  tipo={tipo}
                  confirmacion={confirmaExistente}
                  datos={datos}
                  prellenado={prellenado}
                  corrigiendo={corrigiendo}
                  onCorregir={() => setCorrigiendo(true)}
                  onCambio={cambiar}
                />
              )}
              {paso === "contacto" && (
                <PasoContacto
                  tipo={tipo}
                  apodo={datos.apodo}
                  nombre={datos.contactoNombre}
                  telefono={datos.contactoTelefono}
                  onNombre={(v) => cambiar("contactoNombre", v)}
                  onTelefono={(v) => cambiar("contactoTelefono", v)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="mt-4 rounded-2xl bg-terracota/10 px-4 py-3 text-base font-semibold text-terracota-oscuro" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {paso !== "tipo" && (
        <footer className="border-t-2 border-arena-oscura bg-crema/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-lg gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => irA(pasos[indice - 1])}
                className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-display text-lg font-medium ring-2 ring-arena-oscura"
              >
                <ArrowLeft className="size-5" /> Atrás
              </button>
            )}
            <button
              type="button"
              onClick={siguiente}
              disabled={!puedeSeguir || enviando || esperandoParecidos}
              className="flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-terracota px-5 font-display text-xl font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-45"
              data-testid={esUltimo ? "publicar" : "siguiente"}
            >
              {enviando ? (
                <>
                  <LoaderCircle className="size-6 animate-spin" /> Publicando…
                </>
              ) : esperandoParecidos ? (
                <>
                  <LoaderCircle className="size-6 animate-spin" /> Buscando parecidos…
                </>
              ) : esUltimo ? (
                <>
                  <Send className="size-6" />
                  {confirmaExistente ? `Confirmar · +${HUELLAS.confirmacion}` : `Publicar · +${HUELLAS.reporte}`}
                </>
              ) : paso === "datos" && prellenado && !corrigiendo && !confirmaExistente ? (
                <>Sí, así es</>
              ) : (
                <>
                  {paso === "foto" && !foto.tieneFoto && tipo === "perdido" && !registroMascota ? "Seguir sin foto" : "Siguiente"}
                  <ArrowRight className="size-6" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}

      <PegarPublicacion abierta={hoja === "pegar"} onCerrar={() => setHoja(null)} onLeida={aplicarPublicacion} />
      <BuscarRegistro
        abierta={hoja === "registro"}
        especie={foto.tieneFoto || prellenado ? datos.especie : null}
        onCerrar={() => setHoja(null)}
        onElegir={aplicarRegistro}
      />
    </div>
  );
}
