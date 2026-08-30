"use client";

import { useEffect, useRef, useState } from "react";
import { layers, namedFlavor } from "@protomaps/basemaps";
import * as maplibregl from "maplibre-gl";
import type {
  LngLatBoundsLike,
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import { PMTiles, Protocol } from "pmtiles";
import { SIGUATEPEQUE } from "@/lib/geo";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export function CityMap({
  pins,
  selectedId,
  onSelect,
  onMapClick,
  here,
  labelledBy,
}: {
  pins: MapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  here?: { lat: number; lng: number } | null;
  labelledBy?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const configuredUrl =
      process.env.NEXT_PUBLIC_PMTILES_URL ?? "/maps/siguatepeque.pmtiles";
    const archiveUrl = new URL(configuredUrl, window.location.href).toString();
    ensurePmtilesProtocol(archiveUrl);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: regionalStyle(archiveUrl),
      center: [-87.831, 14.5969],
      zoom: 13,
      maxBounds: cityBounds(),
      minZoom: 10,
      maxZoom: 17,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.on("load", () => {
      setReady(true);
      setFailed(false);
      setMapError(null);
    });
    map.on("error", (event) => {
      if (!map.loaded()) {
        setFailed(true);
        setMapError(event.error.message);
      }
    });
    map.on("click", (event) => {
      onMapClickRef.current?.(event.lngLat.lat, event.lngLat.lng);
    });
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    if (here) {
      const element = document.createElement("span");
      element.className = "map-here";
      element.textContent = "Vos";
      element.title = "Tu ubicación de esta sesión";
      markerRefs.current.push(
        new maplibregl.Marker({ element }).setLngLat([here.lng, here.lat]).addTo(map),
      );
    }

    for (const pin of pins) {
      const element = document.createElement("button");
      const selected = pin.id === selectedId;
      element.type = "button";
      element.className = selected ? "map-pin is-selected" : "map-pin";
      element.setAttribute("aria-label", pin.name);
      if (selected) element.setAttribute("aria-current", "true");
      element.textContent = pin.name;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.(pin.id);
      });
      markerRefs.current.push(
        new maplibregl.Marker({ element, anchor: "bottom" })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map),
      );
    }
  }, [here, onSelect, pins, selectedId]);

  return (
    <div className="map-frame">
      <div
        ref={containerRef}
        className="city-map"
        role="region"
        aria-labelledby={labelledBy}
        style={{ minHeight: "20rem", width: "100%" }}
        data-map-status={failed ? "failed" : ready ? "ready" : "loading"}
        data-map-error={mapError ?? undefined}
      />
      {failed ? (
        <p className="map-status" role="status">
          El mapa base no está disponible. La lista de negocios sigue activa.
        </p>
      ) : null}
    </div>
  );
}

let protocol: Protocol | null = null;

function ensurePmtilesProtocol(archiveUrl: string) {
  if (!protocol) {
    protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tilev4);
  }
  if (!protocol.get(archiveUrl)) protocol.add(new PMTiles(archiveUrl));
}

function cityBounds(): LngLatBoundsLike {
  return [
    [SIGUATEPEQUE.west, SIGUATEPEQUE.south],
    [SIGUATEPEQUE.east, SIGUATEPEQUE.north],
  ];
}

function regionalStyle(archiveUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${archiveUrl}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      },
    },
    layers: layers("protomaps", namedFlavor("light"), { lang: "es" }),
  };
}
