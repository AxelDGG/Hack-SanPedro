import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const origen = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
};
const supabase = origen(process.env.NEXT_PUBLIC_SUPABASE_URL);
const registro = origen(process.env.REGISTRO_API_URL);

/**
 * Política de contenido: solo se cargan scripts propios y solo se habla con Supabase.
 * Sin nonces (la guía de Next 16 los permite solo con render dinámico, y la app usa
 * Cache Components); 'unsafe-inline' cubre los scripts que Next incrusta en el HTML.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Fotos (Storage), mosaicos del mapa, fotos del registro municipal y vistas previas locales.
  `img-src 'self' blob: data: ${supabase} https://tile.openstreetmap.org ${registro}`,
  "font-src 'self'",
  // API, Auth y Realtime de Supabase (websocket).
  `connect-src 'self' ${supabase} ${supabase.replace(/^https/, "wss")}${dev ? " ws: http://localhost:*" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const encabezadosSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  // Solo HTTPS durante dos años (Vercel sirve todo por HTTPS).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Nadie puede meter la app en un iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Los links compartidos no filtran rutas internas a otros sitios.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Cámara (foto), micrófono (dictado) y ubicación solo para la propia app; nada más.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // No anunciar la tecnología del servidor.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: encabezadosSeguridad },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
