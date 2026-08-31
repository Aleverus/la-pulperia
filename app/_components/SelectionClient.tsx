"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { prepareBatchAction, refreshSelectionAction } from "@/app/actions";
import { OfferContext } from "@/app/_components/OfferContext";
import type { CatalogOffer } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import { isOfferEffectivelyAvailable } from "@/lib/offer-context";
import {
  acceptCurrentContext,
  contextChangeSummary,
  contextChanged,
  parseSelection,
  removeSelection,
  requestSummary,
  SELECTION_CHANGE_EVENT,
  SELECTION_STORAGE_KEY,
  selectionNeedsOfferReview,
  type SelectionLine,
} from "@/lib/selection";

type Group = {
  presenceName: string;
  presenceSlug: string;
  lines: Array<{ selection: SelectionLine; live: CatalogOffer }>;
};

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SELECTION_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SELECTION_CHANGE_EVENT, onStoreChange);
  };
}

export function SelectionClient({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(SELECTION_STORAGE_KEY),
    () => null,
  );
  const lines = useMemo(() => parseSelection(raw), [raw]);
  const idsKey = lines.map((line) => line.offerId).join(",");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refreshKey = `${idsKey}:${refreshNonce}`;
  const [refresh, setRefresh] = useState<{
    key: string;
    offers: CatalogOffer[] | null;
    error: boolean;
  }>({ key: "", offers: null, error: false });
  const refreshIsCurrent = refresh.key === refreshKey;
  const live = refreshIsCurrent && !refresh.error ? refresh.offers : null;
  const refreshError = refreshIsCurrent && refresh.error;
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    let cancelled = false;
    void refreshSelectionAction(ids)
      .then((offers) => {
        if (!cancelled) {
          setRefresh({ key: refreshKey, offers, error: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRefresh({ key: refreshKey, offers: null, error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, refreshKey]);

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

  const blocked = useMemo(() => {
    if (!live) return true;
    const byId = new Map(live.map((offer) => [offer.id, offer]));
    return lines.some((line) => {
      const offer = byId.get(line.offerId);
      return (
        !offer ||
        !isOfferEffectivelyAvailable(offer) ||
        contextChanged(line, offer)
      );
    });
  }, [lines, live]);

  function writeSelection(next: SelectionLine[]) {
    window.localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SELECTION_CHANGE_EVENT));
  }

  function prepare() {
    setPrepareError(null);
    start(async () => {
      const result = await prepareBatchAction(lines);
      if (result.ok) {
        window.localStorage.removeItem(SELECTION_STORAGE_KEY);
        window.dispatchEvent(new Event(SELECTION_CHANGE_EVENT));
        router.push(`/cuenta/solicitudes/${result.batchId}`);
        return;
      }
      if (result.reason === "auth_required") {
        router.push("/ingresar?next=/carrito");
        return;
      }
      if (result.reason === "context_changed") {
        setPrepareError(
          "El contexto cambió mientras armabas el pedido. Revisalo otra vez.",
        );
        setRefreshNonce((value) => value + 1);
        return;
      }
      if (result.reason === "offer_not_public") {
        setPrepareError(
          "Una oferta dejó de estar publicada o su ventana cerró. Revisá el carrito.",
        );
        setRefreshNonce((value) => value + 1);
        return;
      }
      setPrepareError("No se pudieron armar los pedidos para WhatsApp.");
    });
  }

  if (lines.length === 0) {
    return (
      <p className="empty-state">
        Tu carrito está vacío. <Link href="/buscar">Buscá comercios y ofertas</Link>
        {" "}para empezar.
      </p>
    );
  }
  if (live === null) {
    if (refreshError) {
      return (
        <div role="alert">
          <p>No se pudo revisar el contexto publicado.</p>
          <button
            type="button"
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return <p>Revisando contexto publicado…</p>;
  }

  return (
    <div className="selection-groups">
      {missing > 0 ? (
        <div role="alert">
          <p>
            Hay ofertas del carrito que ya no están publicadas. Quitalas para
            continuar.
          </p>
          <button
            type="button"
            onClick={() => {
              const liveIds = new Set((live ?? []).map((offer) => offer.id));
              writeSelection(lines.filter((line) => liveIds.has(line.offerId)));
            }}
          >
            Quitar ofertas no publicadas
          </button>
        </div>
      ) : null}
      {groups.map((group) => (
        <section className="selection-group" key={group.presenceSlug}>
          <h2>
            <Link href={`/pulperia/${group.presenceSlug}`}>
              {group.presenceName}
            </Link>
          </h2>
          <p>Este vendedor recibirá su propio pedido por WhatsApp.</p>
          <ul className="selection-lines">
            {group.lines.map(({ selection, live: offer }) => (
              <li className="selection-line" key={offer.id}>
                <Link className="selection-line__title" href={`/oferta/${offer.slug}`}>
                  {offer.title}
                </Link>
                <p>{requestSummary(selection)}</p>
                <p className="price-tag">
                  {formatPublishedPrice(offer.price_cents, offer.price_mode, offer.unit)}
                </p>
                <p>{FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}</p>
                <OfferContext offer={offer} />
                {selectionNeedsOfferReview(selection) ? (
                  <p role="alert">
                    Este carrito se guardó con un contrato anterior. Volvé a la
                    oferta y configurá el pedido otra vez; no vamos a inventar
                    unidad ni destino.
                  </p>
                ) : selection.offerClass !== offer.offer_class ? (
                  <p role="alert">
                    La clase de la oferta cambió. Volvé a la oferta para
                    configurar un pedido compatible.
                  </p>
                ) : contextChanged(selection, offer) ? (
                  <p role="alert">
                    Cambió: {contextChangeSummary(selection, offer)}. Revisá el
                    contexto actual antes de continuar.
                  </p>
                ) : null}
                {!isOfferEffectivelyAvailable(offer) ? (
                  <p role="alert">
                    Esta oferta o su ventana ya no se puede incluir en el pedido.
                  </p>
                ) : null}
                <div className="selection-line__actions">
                  {contextChanged(selection, offer) &&
                  !selectionNeedsOfferReview(selection) &&
                  selection.offerClass === offer.offer_class &&
                  isOfferEffectivelyAvailable(offer) ? (
                    <button
                      type="button"
                      onClick={() =>
                        writeSelection(acceptCurrentContext(lines, offer))
                      }
                    >
                      Revisé y acepto el contexto actual
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      writeSelection(removeSelection(lines, offer.id))
                    }
                  >
                    Quitar del carrito
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="selection-checkout">
        {signedIn ? (
          <button
            type="button"
            disabled={pending || groups.length === 0 || blocked}
            onClick={prepare}
          >
            {pending ? "Armando pedidos…" : "Armar pedidos para WhatsApp"}
          </button>
        ) : (
          <Link href="/ingresar?next=/carrito">
            Ingresar para armar los pedidos
          </Link>
        )}
        {blocked ? (
          <p>Resolvé los avisos de contexto antes de armar los pedidos.</p>
        ) : null}
        {prepareError ? <p role="alert">{prepareError}</p> : null}
        <p>
          La Pulpería prepara un pedido separado por vendedor. Todavía tenés que
          abrir cada WhatsApp, revisar el mensaje y enviarlo; esto no registra una
          venta.
        </p>
      </section>
    </div>
  );
}
