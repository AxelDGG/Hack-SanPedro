import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ErrorRegistro, registro, registroDisponible } from "@/lib/registro/servidor";
import { revisarLimite } from "@/lib/seguridad/limite";
import type { CoincidenciaRegistro, MascotaRegistro } from "@/lib/registro/tipos";

/**
 * Puente con el Registro Municipal de Mascotas: la llave se queda en el servidor.
 *  GET  ?q=texto[&especie=perro]          → buscar por folio, nombre o microchip
 *  POST { accion: "coincidencias", … }     → mascotas registradas parecidas a un reporte
 *  POST { accion: "avisar", folio, animal_id }   → aviso (SMS) a la familia registrada
 *  POST { accion: "extravio", folio, animal_id } → marca la mascota como extraviada en el registro
 *  POST { accion: "reunido", folio }       → la vuelve a marcar como activa
 *
 * Cada acción que escribe en el registro exige un reporte propio que la respalde: nadie puede
 * mandar SMS a una familia ni cambiar el estado de una mascota ajena desde aquí.
 */
const FOLIO = /^[A-Z0-9-]{4,40}$/;
const HORAS_PARA_AVISAR = 2;
async function sesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function respuestaError(error: unknown) {
  if (error instanceof ErrorRegistro) {
    return NextResponse.json({ error: error.message }, { status: error.status === 404 ? 404 : 502 });
  }
  console.error("[registro]", error);
  return NextResponse.json({ error: "El registro municipal no respondió." }, { status: 502 });
}

export async function GET(request: NextRequest) {
  if (!registroDisponible()) return NextResponse.json({ error: "Registro no disponible" }, { status: 503 });
  const { user } = await sesion();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const limitado = await revisarLimite(request, "registro", user.id);
  if (limitado) return limitado;

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 60) ?? "";
  const especie = request.nextUrl.searchParams.get("especie");
  if (q.length < 2) return NextResponse.json({ data: [] });

  try {
    // Un microchip son 15 dígitos; un folio empieza con SPGG.
    if (/^\d{15}$/.test(q)) {
      const m = await registro<MascotaRegistro>(`/v1/mascotas/microchip/${q}`).catch((e) => {
        if (e instanceof ErrorRegistro && e.status === 404) return null;
        throw e;
      });
      return NextResponse.json({ data: m ? [m] : [] });
    }
    const params = new URLSearchParams({ q, limit: "6" });
    if (especie === "perro" || especie === "gato") params.set("especie", especie);
    const r = await registro<{ data: MascotaRegistro[] }>(`/v1/mascotas?${params}`);
    return NextResponse.json({ data: r.data });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!registroDisponible()) return NextResponse.json({ error: "Registro no disponible" }, { status: 503 });
  const { supabase, user } = await sesion();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const limitado = await revisarLimite(request, body?.accion === "avisar" ? "avisoPropietario" : "registro", user.id);
  if (limitado) return limitado;
  if (body?.accion !== "coincidencias" && !(typeof body?.folio === "string" && FOLIO.test(body.folio))) {
    return NextResponse.json({ error: "Folio inválido." }, { status: 400 });
  }

  try {
    switch (body?.accion) {
      case "coincidencias": {
        if (!["perro", "gato"].includes(body.especie) || !Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
          return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
        }
        const r = await registro<{ data: CoincidenciaRegistro[] }>("/v1/mascotas/coincidencias", {
          method: "POST",
          body: {
            especie: body.especie,
            raza: body.raza || undefined,
            color: body.color || undefined,
            tamano: body.tamano || undefined,
            sexo: body.sexo || undefined,
            lat: body.lat,
            lng: body.lng,
            limite: 3,
          },
        });
        return NextResponse.json({ data: r.data });
      }

      case "avisar":
      case "extravio": {
        // Solo con un reporte propio de por medio: así nadie manda avisos sueltos.
        const { data: animal } = await supabase
          .from("animals")
          .select("id, tipo, especie, lat, lng, created_at, perdido_desde, reportado_por, registro_folio")
          .eq("id", String(body.animal_id ?? ""))
          .maybeSingle();
        if (!animal || animal.reportado_por !== user.id) {
          return NextResponse.json({ error: "Solo quien hizo el reporte puede hacer esto." }, { status: 403 });
        }
        // El aviso a la familia sale justo después de reportar un animal encontrado, no después.
        if (
          body.accion === "avisar" &&
          (animal.tipo === "perdido" || Date.now() - new Date(animal.created_at).getTime() > HORAS_PARA_AVISAR * 3_600_000)
        ) {
          return NextResponse.json({ error: "Este reporte ya no puede mandar avisos." }, { status: 403 });
        }
        // Solo la familia marca como extraviada a SU mascota registrada.
        if (body.accion === "extravio" && (animal.tipo !== "perdido" || animal.registro_folio !== body.folio)) {
          return NextResponse.json({ error: "El folio no corresponde a este reporte." }, { status: 403 });
        }
        const enlace = `${sitio}/animal/${animal.id}`;

        if (body.accion === "avisar") {
          const r = await registro("/v1/avisos-propietario", {
            method: "POST",
            body: {
              folio: body.folio,
              mensaje: `CallejerOS: un vecino reportó un ${animal.especie} que podría ser tu mascota. Mira la foto: ${enlace}`,
              referencia_externa: enlace,
            },
          });
          return NextResponse.json(r);
        }
        const r = await registro("/v1/extravios", {
          method: "POST",
          body: {
            folio: body.folio,
            lat: animal.lat,
            lng: animal.lng,
            fecha: animal.perdido_desde ?? animal.created_at,
            referencia_externa: enlace,
          },
        });
        return NextResponse.json(r);
      }

      case "reunido": {
        // Debe existir un reporte de esa mascota ya marcado "en casa" por su familia (o un rescatista).
        const [{ data: reunido }, { data: perfil }] = await Promise.all([
          supabase
            .from("animals")
            .select("reportado_por")
            .eq("registro_folio", body.folio)
            .eq("estado", "reunido")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle(),
        ]);
        const autorizado = reunido && (reunido.reportado_por === user.id || perfil?.rol === "rescatista" || perfil?.rol === "municipio");
        if (!autorizado) return NextResponse.json({ error: "No hay un reencuentro registrado para ese folio." }, { status: 403 });
        await registro(`/v1/extravios/${encodeURIComponent(body.folio)}`, { method: "DELETE" });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
    }
  } catch (error) {
    return respuestaError(error);
  }
}
