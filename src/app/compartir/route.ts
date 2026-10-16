import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_FOTOS } from "@/lib/constants";
import { revisarLimite } from "@/lib/seguridad/limite";

const TIPOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Destino de "Compartir" del celular (share_target del manifest, Android): en WhatsApp se
 * mantiene presionada la foto del perro → Compartir → CallejerOS, y se abre el asistente con
 * la foto y el texto ya cargados. La foto se sube aquí porque no se puede pasar un archivo por URL.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const texto = ["title", "text", "url"]
    .map((k) => form?.get(k))
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n")
    .slice(0, 1500);
  const foto = form?.get("foto");

  const destino = new URL("/reportar", request.url);
  destino.searchParams.set(
    "origen",
    /facebook\.com|fb\.watch/i.test(texto) ? "facebook" : /instagram\.com/i.test(texto) ? "instagram" : "whatsapp",
  );
  if (texto) destino.searchParams.set("texto", texto);

  if (foto instanceof File && foto.size > 0 && foto.size <= MAX_BYTES && TIPOS_FOTO[foto.type]) {
    const supabase = await createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();
    // Sin cuenta también se puede: entra como invitado igual que con los links de los grupos.
    if (!user) user = (await supabase.auth.signInAnonymously()).data.user;
    const limitado = await revisarLimite(request, "compartir", user?.id ?? null);
    if (user && !limitado) {
      const ruta = `${user.id}/${crypto.randomUUID()}.${TIPOS_FOTO[foto.type]}`;
      const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, foto, { contentType: foto.type });
      if (!error) destino.searchParams.set("foto", supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl);
      else console.error("[compartir]", error.message);
    }
  }

  // 303: el navegador abre el asistente con GET.
  return NextResponse.redirect(destino, 303);
}
