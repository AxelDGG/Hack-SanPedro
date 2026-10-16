import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Límites de uso por hora para las rutas del servidor (contador en Postgres: funciona igual con
 * varias instancias de Vercel, a diferencia de un contador en memoria).
 */
/**
 * El límite por usuario frena el abuso individual. El de IP es un tope de respaldo y va holgado:
 * en un evento o una escuela, decenas de personas salen a internet con la misma IP.
 */
export const LIMITES = {
  // La IA cuesta dinero por llamada.
  analizar: { usuario: 20, ip: 300 },
  publicacion: { usuario: 20, ip: 300 },
  // Búsquedas en el registro municipal (evita que se raspe el padrón).
  registro: { usuario: 40, ip: 500 },
  // Avisos por SMS a las familias registradas.
  avisoPropietario: { usuario: 5, ip: 40 },
  alertas: { usuario: 30, ip: 400 },
  compartir: { usuario: 20, ip: 150 },
} as const;

/** IP de quien llama. En Vercel la pone la plataforma (no la puede falsear el cliente). */
export function ipDe(request: NextRequest) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "desconocida"
  );
}

/**
 * Cuenta un uso de `nombre` por usuario y por IP. Devuelve una respuesta 429 si se pasó del
 * límite, o null para seguir. Sin la llave secreta (desarrollo sin configurar) no limita.
 */
export async function revisarLimite(
  request: NextRequest,
  nombre: keyof typeof LIMITES,
  userId: string | null,
): Promise<NextResponse | null> {
  if (!process.env.SUPABASE_SECRET_KEY) return null;
  // En desarrollo y pruebas e2e (todo sale de la misma IP) el margen es 10 veces mayor.
  const factor = process.env.NODE_ENV === "production" ? 1 : 10;
  const limite = { usuario: LIMITES[nombre].usuario * factor, ip: LIMITES[nombre].ip * factor };
  const db = createAdminClient();
  const revisar = (clave: string, max: number) =>
    db.rpc("consumir_cuota", { p_clave: clave, p_limite: max, p_ventana_seg: 3600 }).then(({ data, error }) => {
      if (error) console.error("[limite]", error.message);
      return error ? true : data === true; // si falla el contador, no se bloquea a nadie
    });

  const [porIp, porUsuario] = await Promise.all([
    revisar(`${nombre}:ip:${ipDe(request)}`, limite.ip),
    userId ? revisar(`${nombre}:u:${userId}`, limite.usuario) : Promise.resolve(true),
  ]);
  if (porIp && porUsuario) return null;
  return NextResponse.json(
    { error: "Hiciste muchas solicitudes seguidas. Espera un rato e intenta de nuevo." },
    { status: 429, headers: { "Retry-After": "600" } },
  );
}
