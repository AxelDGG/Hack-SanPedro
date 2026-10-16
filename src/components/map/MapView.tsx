"use client";

import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./mapa.css";
import { HeatLayer } from "./HeatLayer";
import { iconoAnimal } from "./markerIcon";
import { CENTRO_SAN_PEDRO } from "@/lib/constants";
import type { AnimalMapa } from "@/hooks/useRealtimeAnimals";
import type { Posicion } from "@/hooks/useGeolocation";

export interface Enfoque {
  lat: number;
  lng: number;
  zoom?: number;
  /** Cambia para volver a centrar aunque las coordenadas sean las mismas. */
  clave: number;
}

interface Props {
  animales: AnimalMapa[];
  recientes: Set<string>;
  calor: L.HeatLatLngTuple[] | null;
  posicion: Posicion | null;
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
  enfoque: Enfoque | null;
}

const ICONO_YO = L.divIcon({ className: "cos-pin-wrap", html: '<div class="cos-yo"></div>', iconSize: [18, 18] });

export default function MapView({ animales, recientes, calor, posicion, seleccionado, onSeleccionar, enfoque }: Props) {
  return (
    <MapContainer
      center={CENTRO_SAN_PEDRO}
      zoom={14}
      minZoom={11}
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      {calor && <HeatLayer puntos={calor} />}

      {animales.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={iconoAnimal({
            estado: a.estado,
            tipo: a.tipo,
            especie: a.especie,
            urgente: a.urgencia >= 4 && (a.estado === "avistado" || a.estado === "en_atencion"),
            nuevo: recientes.has(a.id),
            seleccionado: a.id === seleccionado,
          })}
          zIndexOffset={a.id === seleccionado ? 1000 : recientes.has(a.id) ? 500 : a.urgencia * 10}
          opacity={calor && a.id !== seleccionado ? 0.35 : 1}
          eventHandlers={{ click: () => onSeleccionar(a.id) }}
          keyboard
          title={a.apodo ?? a.especie}
        />
      ))}

      {posicion && (
        <>
          <Circle
            center={[posicion.lat, posicion.lng]}
            radius={posicion.precision}
            pathOptions={{ color: "#3d8bd9", weight: 1, fillOpacity: 0.08 }}
          />
          <Marker position={[posicion.lat, posicion.lng]} icon={ICONO_YO} interactive={false} />
        </>
      )}

      <Enfocar enfoque={enfoque} />
      <ClickFondo onClick={() => onSeleccionar(null)} />
    </MapContainer>
  );
}

function Enfocar({ enfoque }: { enfoque: Enfoque | null }) {
  const map = useMap();
  useEffect(() => {
    if (enfoque) map.flyTo([enfoque.lat, enfoque.lng], enfoque.zoom ?? Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [enfoque, map]);
  return null;
}

function ClickFondo({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick });
  return null;
}
