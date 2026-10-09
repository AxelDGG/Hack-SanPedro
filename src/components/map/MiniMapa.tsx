"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./mapa.css";
import { iconoAnimal } from "./markerIcon";
import type { Especie, Estado } from "@/lib/constants";

interface Props {
  lat: number;
  lng: number;
  especie: Especie;
  estado?: Estado;
  /** Si se pasa, el pin se puede arrastrar o mover tocando el mapa. */
  onMover?: (lat: number, lng: number) => void;
}

/** Mapa pequeño con un solo pin; editable cuando recibe `onMover`. */
export default function MiniMapa({ lat, lng, especie, estado = "avistado", onMover }: Props) {
  const icono = iconoAnimal({ estado, especie, urgente: false, nuevo: false, seleccionado: false });
  const handlers = useMemo<L.LeafletEventHandlerFnMap>(
    () => ({
      dragend: (e) => {
        const p = (e.target as L.Marker).getLatLng();
        onMover?.(p.lat, p.lng);
      },
    }),
    [onMover],
  );

  return (
    <MapContainer center={[lat, lng]} zoom={17} zoomControl={false} attributionControl={false} className="h-full w-full">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <Marker position={[lat, lng]} icon={icono} draggable={!!onMover} eventHandlers={handlers} />
      <Seguir lat={lat} lng={lng} />
      {onMover && <TocarParaMover onMover={onMover} />}
    </MapContainer>
  );
}

function Seguir({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true });
  }, [lat, lng, map]);
  return null;
}

function TocarParaMover({ onMover }: { onMover: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMover(e.latlng.lat, e.latlng.lng) });
  return null;
}
