"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { prepareBatchAction, refreshSelectionAction } from "@/app/actions";
import type { CatalogOffer } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import {
  parseSelection,
  requestSummary,
  SELECTION_STORAGE_KEY,
  type SelectionLine,
} from "@/lib/selection";

type Group = {
  presenceName: string;
  presenceSlug: string;
  lines: Array<{ selection: SelectionLine; live: CatalogOffer }>;
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function SelectionClient({ signedIn }: { signedIn: boolean }) {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(SELECTION_STORAGE_KEY),
    () => null,
  );
  const lines = parseSelection(raw);
  const [live, setLive] = useState<CatalogOffer[] | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (lines.length === 0) return;
    const ids = lines.map((line) => line.offerId);
    let cancelled = false;
    void refreshSelectionAction(ids).then((offers) => {
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
    for (const selection of lines) {
      const current = byId.get(selection.offerId);
      if (!current) {
        lost += 1;
        continue;
      }
      const group = next.get(current.presence_id) ?? {
        presenceName: current.presence_name,
        presenceSlug: current.presence_slug,
        lines: [],
      };
      group.lines.push({ selection, live: current });
      next.set(current.presence_id, group);
    }
    return { groups: [...next.values()], missing: lost };
  }, [lines, live]);

  if (lines.length === 0) {
    return <p>La selección está vacía. Volvé al catálogo para comparar ofertas.</p>;
  }
  if (live === null) return <p>Revisando contexto publicado…</p>;

  return (
    <div>
      {missing > 0 ? (
        <p role="alert">Hay ofertas de la selección que ya no están publicadas.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.presenceSlug}>
          <h2>
            <Link href={`/pulperia/${group.presenceSlug}`}>
              {group.presenceName}
            </Link>
          </h2>
          <p>Se preparará una solicitud para este vendedor.</p>
          <ul>
            {group.lines.map(({ selection, live: offer }) => (
              <li key={offer.id}>
                <Link href={`/oferta/${offer.slug}`}>{offer.title}</Link>
                <p>{requestSummary(selection)}</p>
                <p>{formatPublishedPrice(offer.price_cents, offer.price_mode)}</p>
                <p>{FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}</p>
                {selection.listedPriceCents !== offer.price_cents ||
                selection.listedPriceMode !== offer.price_mode ? (
                  <p>La modalidad o cifra publicada cambió; revisá antes de continuar.</p>
                ) : null}
                {selection.listedAvailabilityState !== offer.availability_state ? (
                  <p>La disponibilidad publicada cambió.</p>
                ) : null}
                {offer.availability_state === "unavailable" ? (
                  <p>Esta oferta ya no puede preparar una solicitud.</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        {signedIn ? (
          <button
            type="button"
            disabled={pending || groups.length === 0}
            onClick={() => start(() => prepareBatchAction(lines))}
          >
            Preparar solicitudes
          </button>
        ) : (
          <Link href="/ingresar?next=/carrito">Ingresar para preparar solicitudes</Link>
        )}
        <p>
          Preparar no envía un mensaje ni registra una venta. Cada vendedor
          conserva su propia solicitud y WhatsApp.
        </p>
      </section>
    </div>
  );
}
