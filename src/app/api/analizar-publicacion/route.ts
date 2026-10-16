import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analizarPublicacion } from "@/lib/ai/analizar";
import type { RespuestaPublicacion } from "@/lib/ai/schema";
import { revisarLimite } from "@/lib/seguridad/limite";

export const maxDuration = 30;

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** POST { texto } → datos del reporte extraídos de una publicación de un grupo. Requiere sesión (o invitado). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const limitado = await revisarLimite(request, "publicacion", user.id);
  if (limitado) return limitado;

  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (texto.length < 10) return NextResponse.json({ error: "Pega el texto completo de la publicación." }, { status: 400 });

  try {
    const { publicacion, fuente } = await analizarPublicacion(texto);

    // La colonia del catálogo cuyo nombre aparece en lo que dijo la publicación (la más larga gana:
    // "Valle Oriente" antes que "Del Valle").
    const { data: colonias } = await supabase.from("colonias").select("id, nombre");
    const donde = ` ${normalizar(`${publicacion.colonia} ${texto}`)} `;
    const colonia =
      (colonias ?? [])
        .map((c) => ({ id: c.id, n: normalizar(c.nombre) }))
        .filter((c) => c.n.length > 2 && donde.includes(` ${c.n} `))
        .sort((a, b) => b.n.length - a.n.length)[0] ?? null;

    const respuesta: RespuestaPublicacion = { publicacion, colonia_id: colonia?.id ?? null, fuente };
    return NextResponse.json(respuesta);
  } catch (error) {
    console.error("[analizar-publicacion]", error);
    return NextResponse.json({ error: "No pudimos leer la publicación. Llena los datos a mano." }, { status: 500 });
  }
}
