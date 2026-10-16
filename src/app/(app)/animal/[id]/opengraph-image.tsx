import { ImageResponse } from "next/og";
import { ESPECIES, TIPOS, etiquetaEstado } from "@/lib/constants";
import { animalPublico } from "@/lib/animal-publico";

export const alt = "Ficha del animal en CallejerOS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Foto como data URL: satori no siempre puede leer URLs relativas ni algunos formatos. */
async function fotoComoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const absoluta = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${url}`;
  try {
    const res = await fetch(absoluta, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const tipo = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${tipo};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Cartel para la vista previa del link: foto grande, "SE BUSCA" / "ENCONTRADO" en el color
 * del tipo, nombre, rasgos y colonia. Es lo que ven los vecinos en el grupo antes de abrirlo.
 */
export default async function Imagen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await animalPublico(id);
  const tipo = animal?.tipo ?? "callejero";
  const color = TIPOS[tipo].color;
  const foto = await fotoComoDataUrl(animal?.foto_portada_url ?? null);
  const etiqueta = animal ? etiquetaEstado(animal.estado, tipo).toUpperCase() : "CALLEJEROS";
  const nombre = animal ? (animal.apodo ?? ESPECIES[animal.especie].label) : "CallejerOS";
  const rasgos = animal ? [animal.raza, animal.color].filter(Boolean).join(" · ") : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff8ee", fontFamily: "sans-serif" }}>
        <div style={{ width: 600, height: 630, display: "flex", background: "#f3e7d3" }}>
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element -- satori solo entiende <img>
            <img src={foto} alt="" width={600} height={630} style={{ width: 600, height: 630, objectFit: "cover" }} />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: color,
              color: "white",
              fontSize: 40,
              fontWeight: 800,
              padding: "10px 26px",
              borderRadius: 999,
              letterSpacing: 2,
            }}
          >
            {etiqueta}
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "#2b2118", marginTop: 28, lineHeight: 1.05 }}>
            {nombre}
          </div>
          {rasgos && <div style={{ display: "flex", fontSize: 36, color: "#6b5b4d", marginTop: 16 }}>{rasgos}</div>}
          {animal?.colonia?.nombre && (
            <div style={{ display: "flex", fontSize: 36, color: "#2b2118", marginTop: 20, fontWeight: 700 }}>
              {`Colonia ${animal.colonia.nombre}`}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 28, color: "#e2583e", marginTop: "auto", fontWeight: 700 }}>
            CallejerOS · San Pedro Garza García
          </div>
        </div>
      </div>
    ),
    size,
  );
}
