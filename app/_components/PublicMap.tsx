"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCurrentLocation,
  IconMapPin,
} from "@tabler/icons-react";
import { CityMap } from "@/app/_components/CityMap";
import {
  FULFILLMENT_MODE_LABEL,
  type CatalogOffer,
  type CatalogPresence,
} from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { offerAvailabilitySummary } from "@/lib/offer-context";
import {
  classifyGeolocation,
  GEO_ISSUE_LABEL,
  haversineMeters,
  type GeoIssue,
} from "@/lib/geo";
import { formatPublishedPrice } from "@/lib/money";

type MapPresence = CatalogPresence & { offers?: CatalogOffer[] };

export function PublicMap({
  places,
  compact = false,
  showDirectory = true,
  selectedId,
  onSelect,
}: {
  places: MapPresence[];
  compact?: boolean;
  showDirectory?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const pins = places.filter(
    (place): place is MapPresence & { lat: number; lng: number } =>
      place.mode === "fixed_location" && place.lat !== null && place.lng !== null,
  );
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    pins[0]?.id ?? null,
  );
  const activeId = selectedId === undefined ? internalSelectedId : selectedId;
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
  const selected = ordered.find((place) => place.id === activeId) ?? ordered[0];

  function select(id: string) {
    setInternalSelectedId(id);
    onSelect?.(id);
  }

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
    <div className={compact ? "public-map public-map--compact" : "public-map"}>
      <h2 id="public-map-label" className="sr-only">
        Mapa de Siguatepeque
      </h2>
      <div className="public-map__canvas">
        <CityMap
          labelledBy="public-map-label"
          pins={ordered.map((place) => ({
            id: place.id,
            name: place.name,
            lat: place.lat,
            lng: place.lng,
          }))}
          selectedId={selected?.id ?? null}
          onSelect={select}
          here={here}
        />
        {!compact ? (
          <button
            type="button"
            className="public-map__location"
            onClick={useGps}
          >
            <IconCurrentLocation aria-hidden="true" size={18} stroke={1.9} />
            Usar mi ubicación
          </button>
        ) : null}
        {issue ? (
          <p className="public-map__location-status" role="status">
            {GEO_ISSUE_LABEL[issue]}
          </p>
        ) : null}
      </div>

      {!compact && showDirectory ? (
        <div className="public-map__directory">
          <header>
            <div>
              <strong>
                {ordered.length} {ordered.length === 1 ? "negocio cerca" : "negocios cerca"}
              </strong>
              <span>Ubicaciones fijas confirmadas en Siguatepeque</span>
            </div>
            <span className="public-map__privacy">
              {here ? "Ordenados desde esta sesión" : "Ubicación voluntaria"}
            </span>
          </header>

          {ordered.length === 0 ? (
            <div className="map-empty" role="status">
              <IconMapPin aria-hidden="true" size={25} stroke={1.7} />
              <div>
                <strong>No hay ubicaciones fijas que coincidan.</strong>
                <p>
                  Esto no demuestra que no exista oferta local. Probá otra
                  búsqueda o revisá En línea.
                </p>
              </div>
            </div>
          ) : (
            <>
              <ul
                className="public-map__places"
                aria-label="Ubicaciones fijas"
              >
                {ordered.map((place) => {
                  const distance = here
                    ? Math.round(
                        haversineMeters(here, {
                          lat: place.lat,
                          lng: place.lng,
                        }),
                      )
                    : null;
                  return (
                    <li key={place.id}>
                      <button
                        type="button"
                        aria-current={place.id === selected?.id ? "true" : undefined}
                        onClick={() => select(place.id)}
                      >
                        <span className="presence-avatar" aria-hidden="true">
                          {initials(place.name)}
                        </span>
                        <span>
                          <strong>{place.name}</strong>
                          <small>
                            {distance === null
                              ? place.served_city
                              : `${distance} m de distancia aproximada`}
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selected ? <PresenceSheet place={selected} here={here} /> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PresenceSheet({
  place,
  here,
}: {
  place: MapPresence & { lat: number; lng: number };
  here: { lat: number; lng: number } | null;
}) {
  const offers = place.offers ?? [];
  const recent = offers[0]?.confirmed_at;
  const distance = here
    ? Math.round(haversineMeters(here, { lat: place.lat, lng: place.lng }))
    : null;

  return (
    <article className="presence-sheet" aria-live="polite">
      <header>
        <span className="presence-avatar" aria-hidden="true">
          {initials(place.name)}
        </span>
        <div>
          <p className="eyebrow">Presencia local</p>
          <h3>{place.name}</h3>
          <p>
            {distance === null
              ? "Ubicación fija · Siguatepeque"
              : `${distance} m de distancia aproximada`}
          </p>
        </div>
        <Link href={`/pulperia/${place.slug}`}>Ver perfil</Link>
      </header>
      <p>{place.description}</p>
      <dl>
        <div>
          <dt>Vigencia</dt>
          <dd>
            {recent
              ? FRESHNESS_LABEL[freshnessBand(new Date(recent))]
              : "Sin publicaciones vigentes"}
          </dd>
        </div>
        <div>
          <dt>Atención</dt>
          <dd>{fulfillmentSummary(offers)}</dd>
        </div>
      </dl>
      {offers.length > 0 ? (
        <ul className="presence-sheet__publications">
          {offers.slice(0, 3).map((offer) => (
            <li key={offer.id}>
              <Link href={`/oferta/${offer.slug}`}>
                <div>
                  <span>{offer.title}</span>
                  <strong>
                    {formatPublishedPrice(
                      offer.price_cents,
                      offer.price_mode,
                      offer.unit,
                    )}
                  </strong>
                  <small>{offerAvailabilitySummary(offer)}</small>
                </div>
                <IconArrowRight aria-hidden="true" size={16} stroke={1.9} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="presence-sheet__empty">
          Esta presencia no tiene publicaciones visibles ahora.
        </p>
      )}
    </article>
  );
}

function fulfillmentSummary(offers: CatalogOffer[]): string {
  const modes = Array.from(
    new Set(
      offers.flatMap((offer) =>
        offer.fulfillment_modes.map((mode) => FULFILLMENT_MODE_LABEL[mode]),
      ),
    ),
  );
  if (modes.length === 0) {
    return "La modalidad de atención se detalla en cada publicación.";
  }
  return `Modalidades publicadas: ${modes.join(", ")}. Confirmá en cada publicación.`;
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
