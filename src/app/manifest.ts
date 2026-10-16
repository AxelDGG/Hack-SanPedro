import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CallejerOS · Perros y gatos de San Pedro",
    short_name: "CallejerOS",
    description:
      "Avisos de perros y gatos perdidos, encontrados y en la calle de San Pedro Garza García, en un solo lugar.",
    lang: "es-MX",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8ee",
    theme_color: "#e2583e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Mantener presionado el ícono de la app: atajos directos a cada tipo de reporte.
    shortcuts: [
      { name: "Se me perdió", short_name: "Se me perdió", url: "/r/perdido" },
      { name: "Vi o encontré uno", short_name: "Encontré uno", url: "/r/vi" },
      { name: "Hay un callejero", short_name: "Callejero", url: "/r/callejero" },
    ],
    // Aparece en "Compartir" de Android: de una foto o mensaje de WhatsApp directo a un reporte.
    share_target: {
      action: "/compartir",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [{ name: "foto", accept: ["image/jpeg", "image/png", "image/webp", "image/*"] }],
      },
    },
  };
}
