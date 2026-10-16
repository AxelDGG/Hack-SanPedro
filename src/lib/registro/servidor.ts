import "server-only";

/** El registro solo se usa si su URL está configurada; sin ella la app funciona igual, sin esa parte. */
export function registroDisponible() {
  return !!process.env.REGISTRO_API_URL;
}

export class ErrorRegistro extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Llama a la API del registro municipal con su llave. */
export async function registro<T>(ruta: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const base = process.env.REGISTRO_API_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}${ruta}`, {
    method: init.method ?? "GET",
    headers: {
      "X-Api-Key": process.env.REGISTRO_API_KEY ?? "",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ErrorRegistro(res.status, json?.error ?? `El registro respondió ${res.status}`);
  return json as T;
}
