"use client";

import { useEffect } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/components/map/mapa.css";
import { CENTRO_SAN_PEDRO } from "@/lib/constants";
import { claseDe, ESCALA_ZONAS, type Zona } from "@/lib/geo/zonas";
import { plural } from "@/lib/format";

interface Props {
  zonas: (Zona & { colonia?: string })[];
  seleccionada: string | null;
  onSeleccionar: (celda: string) => void;
}

/** Coroplético de hexágonos H3 sobre OpenStreetMap. */
export default function MapaZonas({ zonas, seleccionada, onSeleccionar }: Props) {
  return (
    <MapContainer center={CENTRO_SAN_PEDRO} zoom={13} minZoom={11} zoomControl={false} className="h-full w-full">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {zonas.map((z) => {
        const activa = z.celda === seleccionada;
        return (
          <Polygon
            key={z.celda}
            positions={z.borde}
            pathOptions={{
              fillColor: ESCALA_ZONAS[claseDe(z.total)],
              fillOpacity: 0.78,
              color: activa ? "#2b2118" : "#ffffff",
              weight: activa ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => onSeleccionar(z.celda),
              mouseover: (e) => e.target.setStyle({ weight: 3, color: "#2b2118" }),
              mouseout: (e) => !activa && e.target.setStyle({ weight: 1.5, color: "#ffffff" }),
            }}
          >
            <Tooltip sticky direction="top">
              <strong>{plural(z.total, "animal", "animales")}</strong>
              {z.colonia && ` · ${z.colonia}`}
              <br />
              {plural(z.perros, "perro")} · {plural(z.gatos, "gato")}
              {z.otros > 0 && ` · ${plural(z.otros, "otro")}`}
              {z.urgentes > 0 && (
                <>
                  <br />
                  {plural(z.urgentes, "urgente")}
                </>
              )}
            </Tooltip>
          </Polygon>
        );
      })}
      <Enfocar zona={zonas.find((z) => z.celda === seleccionada)} />
    </MapContainer>
  );
}

function Enfocar({ zona }: { zona?: Zona }) {
  const map = useMap();
  useEffect(() => {
    if (zona) map.flyTo(zona.centro, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [zona, map]);
  return null;
}
