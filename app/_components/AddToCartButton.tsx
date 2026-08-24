"use client";

import { useState, useSyncExternalStore } from "react";
import { recordPublicEventAction } from "@/app/operation-actions";
import {
  CART_STORAGE_KEY,
  parseCart,
  upsertLine,
  type CartLine,
} from "@/lib/cart";

export function AddToCartButton(props: {
  offerId: string;
  listedPriceCents: number;
  listedPriceMode: CartLine["listedPriceMode"];
  listedAvailability: string;
  listedConfirmedAt: string;
}) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);
  const [added, setAdded] = useState(false);

  function add() {
    const lines = parseCart(window.localStorage.getItem(CART_STORAGE_KEY));
    const next = upsertLine(lines, {
      offerId: props.offerId,
      quantity: 1,
      listedPriceCents: props.listedPriceCents,
      listedPriceMode: props.listedPriceMode,
      listedAvailability: props.listedAvailability,
      listedConfirmedAt: props.listedConfirmedAt,
    });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    setAdded(true);
    void recordPublicEventAction("cart_add");
  }

  return (
    <button type="button" onClick={add} disabled={!ready}>
      {!ready ? "Preparando carrito…" : added ? "En el carrito" : "Agregar al carrito"}
    </button>
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
