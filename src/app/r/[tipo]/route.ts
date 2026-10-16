import { NextResponse, type NextRequest } from "next/server";

/** Alias cortos y fáciles de dictar: "callejeros.mx/r/vi". */
const ALIAS: Record<string, string> = {
  perdido: "perdido",
  perdida: "perdido",
  busco: "perdido",
  vi: "encontrado",
  encontre: "encontrado",
  encontrado: "encontrado",
  callejero: "callejero",
  calle: "callejero",
};

const ORIGENES: Record<string, string> = { wa: "whatsapp", fb: "facebook", ig: "instagram" };

/**
 * Link corto para pegar en grupos de WhatsApp o Facebook: abre el asistente del tipo indicado,
 * sin cuenta. `?de=wa|fb|ig` registra de qué grupo llegó el reporte.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[tipo]">) {
  const { tipo } = await ctx.params;
  const destino = new URL("/reportar", request.url);
  const t = ALIAS[tipo.toLowerCase()];
  if (t) destino.searchParams.set("tipo", t);
  const de = ORIGENES[request.nextUrl.searchParams.get("de") ?? ""];
  if (de) destino.searchParams.set("origen", de);
  return NextResponse.redirect(destino);
}
