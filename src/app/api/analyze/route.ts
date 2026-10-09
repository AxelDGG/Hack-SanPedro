import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { analizarFoto, type TipoImagen } from "@/lib/ai/analizar";

export const maxDuration = 30;

const TIPOS: TipoImagen[] = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/** POST multipart con `foto` → análisis de la IA (o simulado). Requiere sesión. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para analizar fotos." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const foto = form?.get("foto");
  if (!(foto instanceof File)) return NextResponse.json({ error: "Falta la foto." }, { status: 400 });
  if (!TIPOS.includes(foto.type as TipoImagen))
    return NextResponse.json({ error: "Formato no soportado (usa JPG, PNG o WebP)." }, { status: 415 });
  if (foto.size > MAX_BYTES) return NextResponse.json({ error: "La foto pesa más de 5 MB." }, { status: 413 });

  try {
    const resultado = await analizarFoto(Buffer.from(await foto.arrayBuffer()), foto.type as TipoImagen);
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "La IA está saturada. Llena los datos a mano." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[analyze] Anthropic", error.status, error.message);
      return NextResponse.json({ error: "No se pudo analizar la foto." }, { status: 502 });
    }
    console.error("[analyze]", error);
    const mensaje = error instanceof Error ? error.message : "No se pudo analizar la foto.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
