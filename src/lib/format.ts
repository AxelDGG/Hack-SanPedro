const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "hace 3 horas", "ayer", "hace 2 semanas"… */
export function haceCuanto(fecha: string | Date, ahora = Date.now()): string {
  const segundos = Math.round((new Date(fecha).getTime() - ahora) / 1000);
  for (const [unidad, s] of UNIDADES) {
    if (Math.abs(segundos) >= s) return rtf.format(Math.round(segundos / s), unidad);
  }
  return "justo ahora";
}

/** "a 120 m", "a 2.3 km" */
export function distancia(metros: number): string {
  return metros < 1000 ? `a ${Math.round(metros / 10) * 10} m` : `a ${(metros / 1000).toFixed(1)} km`;
}

export function fechaCorta(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}
