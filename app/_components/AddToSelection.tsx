"use client";

import { useState, useSyncExternalStore } from "react";
import { recordPublicEventAction } from "@/app/operation-actions";
import type {
  AvailabilityDetails,
  AvailabilityState,
  OfferClass,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";
import { requestedWindowIssue } from "@/lib/offer-context";
import {
  MAX_SELECTION_QUANTITY,
  MIN_SELECTION_QUANTITY,
  isValidSelectionQuantity,
  parseSelection,
  SELECTION_CHANGE_EVENT,
  SELECTION_STORAGE_KEY,
  upsertSelection,
  type SelectionRequest,
} from "@/lib/selection";

export function AddToSelection(props: {
  offerId: string;
  offerClass: OfferClass;
  availabilityDetails: AvailabilityDetails;
  listedPriceCents: number | null;
  listedPriceMode: PriceMode;
  listedUnit: string | null;
  listedAvailabilityState: AvailabilityState;
  listedConfirmedAt: string;
  requestContextToken: string;
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);
  const [quantity, setQuantity] = useState(1);
  const [scope, setScope] = useState("");
  const [substitutionOk, setSubstitutionOk] = useState(false);
  const [variant, setVariant] = useState("");
  const [requestedWindowStart, setRequestedWindowStart] = useState("");
  const [requestedWindowEnd, setRequestedWindowEnd] = useState("");
  const [appointmentPreference, setAppointmentPreference] = useState("");
  const [approximateLocality, setApproximateLocality] = useState("");
  const [plan, setPlan] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [added, setAdded] = useState(false);

  const needsScope =
    props.offerClass === "local_service" || props.offerClass === "digital_offer";
  const request = buildRequest(props.offerClass, props.availabilityDetails, {
    quantity,
    scope,
    substitutionOk,
    variant,
    requestedWindowStart,
    requestedWindowEnd,
    appointmentPreference,
    approximateLocality,
    plan,
    referenceUrl,
  });

  function add() {
    if (!request) return;
    const lines = parseSelection(
      window.localStorage.getItem(SELECTION_STORAGE_KEY),
    );
    const next = upsertSelection(lines, {
      offerId: props.offerId,
      offerClass: props.offerClass,
      request,
      listedPriceCents: props.listedPriceCents,
      listedPriceMode: props.listedPriceMode,
      listedUnit: props.listedUnit,
      listedAvailabilityState: props.listedAvailabilityState,
      listedConfirmedAt: props.listedConfirmedAt,
      requestContextToken: props.requestContextToken,
    });
    window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SELECTION_CHANGE_EVENT));
    setAdded(true);
    void recordPublicEventAction("selection_add");
  }

  return (
    <div className="selection-config">
      {props.offerClass === "stocked_product" ||
      props.offerClass === "scheduled_food" ? (
        <label>
          Cantidad
          <input
            type="number"
            min={MIN_SELECTION_QUANTITY}
            max={MAX_SELECTION_QUANTITY}
            step={0.001}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
      ) : null}
      {props.offerClass === "stocked_product" ? (
        <label>
          <input
            type="checkbox"
            checked={substitutionOk}
            onChange={(event) => setSubstitutionOk(event.target.checked)}
          />
          Acepto que me propongan un sustituto
        </label>
      ) : null}
      {props.offerClass === "scheduled_food" ? (
        <>
          <label>
            Inicio que necesitás
            <input
              type="datetime-local"
              min={localDateTimeInput(props.availabilityDetails.starts_at)}
              max={localDateTimeInput(props.availabilityDetails.ends_at)}
              value={requestedWindowStart}
              onChange={(event) => setRequestedWindowStart(event.target.value)}
              required
            />
          </label>
          <label>
            Fin que necesitás
            <input
              type="datetime-local"
              min={localDateTimeInput(props.availabilityDetails.starts_at)}
              max={localDateTimeInput(props.availabilityDetails.ends_at)}
              value={requestedWindowEnd}
              onChange={(event) => setRequestedWindowEnd(event.target.value)}
              required
            />
          </label>
          <label>
            Variante o detalle (opcional)
            <input
              value={variant}
              onChange={(event) => setVariant(event.target.value)}
              maxLength={120}
            />
          </label>
          <p>Elegí una subventana dentro del horario publicado.</p>
        </>
      ) : null}
      {needsScope ? (
        <label>
          Qué necesitás
          <textarea
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            maxLength={1000}
            required
          />
        </label>
      ) : null}
      {props.offerClass === "local_service" ? (
        <>
          <label>
            Preferencia de cita (opcional)
            <input
              value={appointmentPreference}
              onChange={(event) => setAppointmentPreference(event.target.value)}
              maxLength={240}
            />
          </label>
          <label>
            Zona aproximada (opcional)
            <input
              value={approximateLocality}
              onChange={(event) => setApproximateLocality(event.target.value)}
              maxLength={80}
            />
          </label>
        </>
      ) : null}
      {props.offerClass === "digital_offer" ? (
        <>
          <label>
            Plan o formato (opcional)
            <input
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              maxLength={120}
            />
          </label>
          <label>
            Enlace de referencia (opcional)
            <input
              type="url"
              value={referenceUrl}
              onChange={(event) => setReferenceUrl(event.target.value)}
              maxLength={500}
              placeholder="https://"
            />
          </label>
        </>
      ) : null}
      <button type="button" onClick={add} disabled={!ready || request === null}>
        {!ready
          ? "Preparando carrito…"
          : added
            ? "En el carrito"
            : "Agregar al carrito"}
      </button>
    </div>
  );
}

function buildRequest(
  offerClass: OfferClass,
  details: AvailabilityDetails,
  input: {
    quantity: number;
    scope: string;
    substitutionOk: boolean;
    variant: string;
    requestedWindowStart: string;
    requestedWindowEnd: string;
    appointmentPreference: string;
    approximateLocality: string;
    plan: string;
    referenceUrl: string;
  },
): SelectionRequest | null {
  if (!isValidSelectionQuantity(input.quantity)) return null;
  if (offerClass === "stocked_product") {
    return {
      quantity: input.quantity,
      substitution_ok: input.substitutionOk,
    };
  }
  if (offerClass === "scheduled_food") {
    const requestedStart = tegucigalpaTimestamp(input.requestedWindowStart);
    const requestedEnd = tegucigalpaTimestamp(input.requestedWindowEnd);
    if (
      !requestedStart ||
      !requestedEnd ||
      requestedWindowIssue(details, requestedStart, requestedEnd) !== null
    ) {
      return null;
    }
    const variant = input.variant.trim();
    return {
      quantity: input.quantity,
      ...(variant ? { variant } : {}),
      requested_window_start: requestedStart,
      requested_window_end: requestedEnd,
    };
  }
  const scope = input.scope.trim();
  if (!scope) return null;
  if (offerClass === "local_service") {
    const appointmentPreference = input.appointmentPreference.trim();
    const approximateLocality = input.approximateLocality.trim();
    return {
      scope,
      ...(appointmentPreference
        ? { appointment_preference: appointmentPreference }
        : {}),
      ...(approximateLocality
        ? { approximate_locality: approximateLocality }
        : {}),
    };
  }
  const plan = input.plan.trim();
  const referenceUrl = input.referenceUrl.trim();
  if (referenceUrl && !isHttpUrl(referenceUrl)) return null;
  return {
    scope,
    ...(plan ? { plan } : {}),
    ...(referenceUrl ? { reference_url: referenceUrl } : {}),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function tegucigalpaTimestamp(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-06:00`
    : null;
}

function localDateTimeInput(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
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
