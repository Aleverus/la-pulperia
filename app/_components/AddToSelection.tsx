"use client";

import { useState, useSyncExternalStore } from "react";
import { recordPublicEventAction } from "@/app/operation-actions";
import type {
  AvailabilityDetails,
  AvailabilityState,
  OfferClass,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";
import {
  parseSelection,
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
  listedAvailabilityState: AvailabilityState;
  listedConfirmedAt: string;
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);
  const [quantity, setQuantity] = useState(1);
  const [scope, setScope] = useState("");
  const [added, setAdded] = useState(false);

  const needsScope =
    props.offerClass === "local_service" || props.offerClass === "digital_offer";
  const request = buildRequest(props.offerClass, props.availabilityDetails, {
    quantity,
    scope,
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
      listedAvailabilityState: props.listedAvailabilityState,
      listedConfirmedAt: props.listedConfirmedAt,
    });
    window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(next));
    setAdded(true);
    void recordPublicEventAction("selection_add");
  }

  return (
    <div>
      {props.offerClass === "stocked_product" ||
      props.offerClass === "scheduled_food" ? (
        <label>
          Cantidad
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
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
      <button type="button" onClick={add} disabled={!ready || request === null}>
        {!ready
          ? "Preparando selección…"
          : added
            ? "En la selección"
            : "Agregar a la selección"}
      </button>
    </div>
  );
}

function buildRequest(
  offerClass: OfferClass,
  details: AvailabilityDetails,
  input: { quantity: number; scope: string },
): SelectionRequest | null {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) return null;
  if (offerClass === "stocked_product") return { quantity: input.quantity };
  if (offerClass === "scheduled_food") {
    if (!details.starts_at || !details.ends_at) return null;
    return {
      quantity: input.quantity,
      requested_window_start: details.starts_at,
      requested_window_end: details.ends_at,
    };
  }
  const scope = input.scope.trim();
  return scope ? { scope } : null;
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
