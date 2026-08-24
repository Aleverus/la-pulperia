"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { prepareBatchAction, refreshCartAction } from "@/app/actions";
import {
  CART_STORAGE_KEY,
  parseCart,
  type CartLine,
} from "@/lib/cart";
import type { CatalogOffer } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatHnl, formatPublishedPrice } from "@/lib/money";

type Group = {
  presenceName: string;
  presenceSlug: string;
  lines: Array<{ cart: CartLine; live: CatalogOffer }>;
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function CartClient({ signedIn }: { signedIn: boolean }) {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(CART_STORAGE_KEY),
    () => null,
  );
  const lines = parseCart(raw);
  const [live, setLive] = useState<CatalogOffer[] | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (lines.length === 0) return;
    const ids = lines.map((line) => line.offerId);
    let cancelled = false;
    void refreshCartAction(ids).then((offers) => {
      if (!cancelled) setLive(offers);
    });
    return () => {
      cancelled = true;
    };
  }, [lines]);

  const { groups, missing } = useMemo(() => {
    if (!live) return { groups: [] as Group[], missing: 0 };
    const byId = new Map(live.map((offer) => [offer.id, offer]));
    const next = new Map<string, Group>();
    let lost = 0;
    for (const cart of lines) {
      const current = byId.get(cart.offerId);
      if (!current) {
        lost += 1;
        continue;
      }
      const group = next.get(current.presence_id) ?? {
        presenceName: current.presence_name,
        presenceSlug: current.presence_slug,
        lines: [],
      };
      group.lines.push({ cart, live: current });
      next.set(current.presence_id, group);
    }
    return { groups: [...next.values()], missing: lost };
  }, [lines, live]);

  if (lines.length === 0) {
    return <p className="empty-state">El carrito está vacío. Volvé al mostrador para comparar ofertas.</p>;
  }

  if (live === null) {
    return <p>Revisando precios publicados…</p>;
  }

  return (
    <div className="cart-groups">
      {missing > 0 ? (
        <p role="alert">Hay ofertas del carrito que ya no están publicadas.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.presenceSlug} className="cart-counter">
          <header>
            <h2>
              <Link href={`/pulperia/${group.presenceSlug}`}>
                {group.presenceName}
              </Link>
            </h2>
            <span>Un WhatsApp</span>
          </header>
          <ul className="cart-lines">
            {group.lines.map(({ cart, live: offer }) => (
              <li key={offer.id}>
                <div>
                  <Link href={`/oferta/${offer.slug}`}>{offer.title}</Link>
                  <p>
                    {cart.quantity} ×{" "}
                    {formatPublishedPrice(offer.price_cents, offer.price_mode)}
                  </p>
                </div>
                <div className="freshness">
                  {FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}
                </div>
                {cart.listedPriceCents !== offer.price_cents ? (
                  <p>
                    El precio publicado cambió de{" "}
                    {formatHnl(cart.listedPriceCents)} a{" "}
                    {formatHnl(offer.price_cents)}.
                  </p>
                ) : null}
                {cart.listedAvailability !== offer.availability ? (
                  <p>La disponibilidad publicada cambió.</p>
                ) : null}
                {offer.availability === "unavailable" ? (
                  <p>Esta oferta ya no se puede pedir.</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="cart-checkout">
        {signedIn ? (
          <button
            type="button"
            disabled={pending || groups.length === 0}
            onClick={() => start(() => prepareBatchAction(lines))}
          >
            Preparar solicitudes
          </button>
        ) : (
          <Link className="primary-link" href="/ingresar?next=/carrito">
            Ingresar para preparar solicitudes
          </Link>
        )}
        <p>
          Preparar no envía un mensaje ni registra una venta. Cada vendedor recibe
          su propio WhatsApp.
        </p>
      </section>
    </div>
  );
}
