"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CityMap } from "@/app/_components/CityMap";
import type { CatalogPresence } from "@/lib/catalog";
import {
  classifyGeolocation,
  GEO_ISSUE_LABEL,
  haversineMeters,
  type GeoIssue,
} from "@/lib/geo";

export function PublicMap({ places }: { places: CatalogPresence[] }) {
  const pins = places.filter(
    (place): place is CatalogPresence & { lat: number; lng: number } =>
      place.mode === "fixed_location" && place.lat !== null && place.lng !== null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(pins[0]?.id ?? null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [issue, setIssue] = useState<GeoIssue | null>(null);

  const ordered = useMemo(() => {
    if (!here) return pins;
    return [...pins].sort(
      (a, b) =>
        haversineMeters(here, { lat: a.lat, lng: a.lng }) -
        haversineMeters(here, { lat: b.lat, lng: b.lng }),
    );
  }, [here, pins]);

  function useGps() {
    if (!navigator.geolocation) {
      setIssue("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const classified = classifyGeolocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
        setIssue(classified);
        if (classified === "out_of_coverage") {
          setHere(null);
          return;
        }
        setHere({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setHere(null);
        setIssue(classifyGeolocation({ errorCode: err.code }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  return (
    <div>
      <p>
        <button type="button" onClick={useGps}>
          Usar mi ubicación
        </button>
        . Sólo vale para esta sesión; no se guarda.
      </p>
      {issue ? <p>{GEO_ISSUE_LABEL[issue]}</p> : null}
      <h2 id="public-map-label">Mapa de Siguatepeque</h2>
      {pins.length === 0 ? (
        <p>Todavía no hay ubicaciones fijas publicadas.</p>
      ) : null}
      <CityMap
        labelledBy="public-map-label"
        pins={ordered.map((place) => ({
          id: place.id,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
        }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
        here={here}
      />
      <ul className="offer-list" aria-label="Ubicaciones fijas">
        {ordered.map((place) => {
          const selected = place.id === selectedId;
          const distance =
            here != null
              ? Math.round(haversineMeters(here, { lat: place.lat, lng: place.lng }))
              : null;
          return (
            <li key={place.id}>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => setSelectedId(place.id)}
              >
                {place.name}
              </button>
              {distance !== null ? <span> · {distance} m</span> : null}
              {" · "}
              <Link href={`/pulperia/${place.slug}`}>Ver pulpería</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
