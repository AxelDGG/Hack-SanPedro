import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarAlertasDe } from "@/lib/alertas/enviar";
import { revisarLimite } from "@/lib/seguridad/limite";

export const maxDuration = 30;

/**
 * POST { animal_id } → manda por push y correo las alertas de un reporte recién publicado.
 * Lo llama quien reporta; enviar es idempotente (cada notificación sale una sola vez).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const limitado = await revisarLimite(request, "alertas", user.id);
  if (limitado) return limitado;

  const body = await request.json().catch(() => null);
  const animalId = typeof body?.animal_id === "string" ? body.animal_id : null;
  if (!animalId) return NextResponse.json({ error: "Falta animal_id." }, { status: 400 });

  // Se responde de inmediato; el envío sigue después de la respuesta.
  after(async () => {
    try {
      const r = await enviarAlertasDe(animalId);
      if (r.push || r.correos) console.info(`[alertas] ${animalId}: ${r.push} push, ${r.correos} correos`);
    } catch (e) {
      console.error("[alertas]", e);
    }
  });
  return NextResponse.json({ ok: true }, { status: 202 });
}
