"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { IconShoppingCart } from "@tabler/icons-react";
import {
  parseSelection,
  SELECTION_CHANGE_EVENT,
  SELECTION_STORAGE_KEY,
} from "@/lib/selection";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SELECTION_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SELECTION_CHANGE_EVENT, onStoreChange);
  };
}

export function CartLink() {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(SELECTION_STORAGE_KEY),
    () => null,
  );
  const count = useMemo(() => parseSelection(raw).length, [raw]);

  return (
    <Link href="/carrito" className="cart-link">
      <IconShoppingCart aria-hidden="true" size={25} stroke={1.8} />
      <span>Carrito{count > 0 ? ` (${count})` : ""}</span>
    </Link>
  );
}
