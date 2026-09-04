"use client";

import { useEffect, useRef, useState } from "react";
import { layers, namedFlavor, type Flavor } from "@protomaps/basemaps";
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
      element.textContent = initials(pin.name);
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || pins.length === 0) return;
    const points = pins.map((pin) => [pin.lng, pin.lat] as [number, number]);
    if (here) points.push([here.lng, here.lat]);
    if (points.length === 1) {
      map.jumpTo({ center: points[0], zoom: 14 });
      return;
    }
    const bounds = points.reduce(
      (current, point) => current.extend(point),
      new maplibregl.LngLatBounds(points[0], points[0]),
    );
    map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
  }, [here, pins, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = pins.find((pin) => pin.id === selectedId);
    if (!map || !ready || !selected) return;
    map.easeTo({
      center: [selected.lng, selected.lat],
      duration: reducedMotion() ? 0 : 260,
    });
  }, [pins, ready, selectedId]);

  return (
    <div className="map-frame">
      <div
        ref={containerRef}
        className="city-map"
        role="region"
        aria-labelledby={labelledBy}
        aria-busy={!ready && !failed}
        style={{ minHeight: "20rem", width: "100%" }}
        data-map-status={failed ? "failed" : ready ? "ready" : "loading"}
        data-map-error={mapError ?? undefined}
      />
      {!ready && !failed ? (
        <p className="map-status is-loading" role="status">
          Cargando mapa local…
        </p>
      ) : null}
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
    layers: layers("protomaps", plazaMapFlavor(), { lang: "es" }),
  };
}

function plazaMapFlavor(): Flavor {
  return {
    ...namedFlavor("light"),
    background: "#dcd7cd",
    earth: "#dcd7cd",
    buildings: "#cec8bd",
    industrial: "#cec8bd",
    school: "#e7dfd3",
    hospital: "#e7dfd3",
    park_a: "#d6d0c5",
    park_b: "#cec8bd",
    wood_a: "#d6d0c5",
    wood_b: "#cec8bd",
    scrub_a: "#d6d0c5",
    scrub_b: "#cec8bd",
    pedestrian: "#eee9df",
    water: "#c8b8b8",
    minor_service_casing: "#d6c9be",
    minor_casing: "#d6c9be",
    link_casing: "#d6c9be",
    major_casing_late: "#d6c9be",
    highway_casing_late: "#d6c9be",
    other: "#f5f0e8",
    minor_service: "#f5f0e8",
    minor_a: "#f5f0e8",
    minor_b: "#fffaf2",
    link: "#fffaf2",
    major_casing_early: "#d6c9be",
    major: "#fffaf2",
    highway_casing_early: "#d6c9be",
    highway: "#fffaf2",
    roads_label_minor: "#6c615e",
    roads_label_minor_halo: "#fffdf8",
    roads_label_major: "#281b1e",
    roads_label_major_halo: "#fffdf8",
    subplace_label: "#6c615e",
    subplace_label_halo: "#eee9df",
    city_label: "#281b1e",
    city_label_halo: "#eee9df",
    address_label: "#6c615e",
    address_label_halo: "#fffdf8",
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-HN");
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
