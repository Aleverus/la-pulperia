"use client";

import { useState, useSyncExternalStore } from "react";
import { classifyGeolocation, GEO_ISSUE_LABEL, type GeoIssue } from "@/lib/geo";
import {
  searchHref,
  type SearchAvailabilityFilter,
  type SearchOfferClassFilter,
  type SearchPresenceFilter,
} from "@/lib/search";

export function LocationSearchControl({
  query,
  offerClass,
  presence,
  availability,
  active,
}: {
  query: string;
  offerClass: SearchOfferClassFilter;
  presence: SearchPresenceFilter;
  availability: SearchAvailabilityFilter;
  active: boolean;
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);
  const [issue, setIssue] = useState<GeoIssue | null>(null);
  const [busy, setBusy] = useState(false);

  function enable() {
    if (!navigator.geolocation) {
      setIssue("unavailable");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const classified = classifyGeolocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
        setIssue(classified);
        if (classified === "out_of_coverage" || classified === "unavailable") {
          setBusy(false);
          return;
        }
        const response = await fetch("/ubicacion/sesion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        });
        setBusy(false);
        if (!response.ok) {
          setIssue("unavailable");
          return;
        }
        window.location.assign(
          searchHref({
            query,
            offerClass,
            presence,
            availability,
            sort: "nearby",
            page: 1,
          }),
        );
      },
      (error) => {
        setBusy(false);
        setIssue(classifyGeolocation({ errorCode: error.code }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function disable() {
    setBusy(true);
    await fetch("/ubicacion/sesion", { method: "DELETE" });
    setBusy(false);
    setIssue(null);
    window.location.assign(
      searchHref({
        query,
        offerClass,
        presence,
        availability,
        sort: "organic",
        page: 1,
      }),
    );
  }

  return (
    <div className="location-control">
      <button
        type="button"
        onClick={active ? disable : enable}
        disabled={busy || !ready}
      >
        {!ready
          ? "Preparando ubicación…"
          : busy
            ? "Actualizando…"
            : active
              ? "Dejar de usar ubicación"
              : "Cerca de mí"}
      </button>
      <span> La coordenada exacta vive sólo en esta sesión.</span>
      {issue ? <p role="status">{GEO_ISSUE_LABEL[issue]}</p> : null}
    </div>
  );
}

function subscribe() {
  return () => undefined;
}

function clientReady() {
  return true;
}

function serverNotReady() {
  return false;
}
