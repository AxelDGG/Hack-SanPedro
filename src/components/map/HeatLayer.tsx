"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";

// leaflet.heat programa un redibujado en el siguiente frame y no lo cancela al quitar la capa;
// si la capa ya no está en el mapa (p. ej. doble montaje de React), ese redibujado truena.
type HeatProto = { _redraw: (this: { _map: L.Map | null }) => void };
const proto = (L as unknown as { HeatLayer: { prototype: HeatProto } }).HeatLayer.prototype;
const redibujar = proto._redraw;
proto._redraw = function () {
  if (this._map) redibujar.call(this);
};

const GRADIENTE = { 0.2: "#f9d9a6", 0.45: "#f2a23a", 0.7: "#e2583e", 1: "#9c2b17" };

/** Capa de calor; cada punto es [lat, lng, intensidad 0–1]. */
export function HeatLayer({ puntos }: { puntos: L.HeatLatLngTuple[] }) {
  const map = useMap();
  const capa = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    const c = L.heatLayer([], { radius: 34, blur: 26, max: 0.8, maxZoom: 15, minOpacity: 0.3, gradient: GRADIENTE }).addTo(map);
    capa.current = c;
    return () => {
      c.remove();
      capa.current = null;
    };
  }, [map]);

  useEffect(() => {
    capa.current?.setLatLngs(puntos);
  }, [puntos, map]);

  return null;
}
