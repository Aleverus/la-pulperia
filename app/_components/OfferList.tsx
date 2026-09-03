import Link from "next/link";
import { OfferContext } from "@/app/_components/OfferContext";
import { OfferFallback } from "@/app/_components/OfferArtwork";
import {
  OFFER_CLASS_LABEL,
  PRESENCE_MODE_LABEL,
  type SearchOffer,
} from "@/lib/catalog";
import { mediaPublicUrl } from "@/lib/media-url";
import { formatPublishedPrice } from "@/lib/money";
import { getOfferPreviewMedia } from "@/lib/seller-data";

export async function OfferList({
  offers,
  emptyState,
}: {
  offers: SearchOffer[];
  emptyState?: {
    query: string;
    filtersApplied: boolean;
    clearFiltersHref: string;
  };
}) {
  if (offers.length === 0) {
    return (
      <section aria-labelledby="empty-search-title" role="status">
        <h2 id="empty-search-title">Sin coincidencias publicadas</h2>
        <p>
          {emptyState?.query
            ? `No encontramos una oferta publicada que coincida con “${emptyState.query}”.`
            : "Todavía no hay ofertas publicadas para estos criterios."}
        </p>
        <p>
          Esto no demuestra que la oferta no exista en Siguatepeque; sólo que
          La Pulpería no tiene ahora una ficha pública que responda a esta
          búsqueda. Probá otra palabra o ampliá los filtros.
        </p>
        <div className="empty-search-actions">
          {emptyState?.filtersApplied ? (
            <Link href={emptyState.clearFiltersHref}>Quitar filtros</Link>
          ) : null}
          <Link href="/buscar">Ver todas las ofertas</Link>
          <Link href="/mapa">Explorar ubicaciones fijas</Link>
        </div>
      </section>
    );
  }

  const previews = await getOfferPreviewMedia(
    offers.map((offer) => offer.offer_id),
  );

  return (
    <ul className="offer-list">
      {offers.map((offer) => (
        <li key={offer.offer_id}>
          <article className="offer-card">
            <OfferPreview offer={offer} preview={previews.get(offer.offer_id)} />
            <div className="offer-card__content">
              <p className="offer-card__seller">
                <Link href={`/pulperia/${offer.presence_slug}`}>
                  {offer.presence_name}
                </Link>
                <span>{PRESENCE_MODE_LABEL[offer.presence_mode]}</span>
              </p>
              <h2>
                <Link href={`/oferta/${offer.offer_slug}`}>{offer.title}</Link>
              </h2>
              <p className="offer-card__class">{OFFER_CLASS_LABEL[offer.offer_class]}</p>
              <p className="price-tag">
                {formatPublishedPrice(offer.price_cents, offer.price_mode, offer.unit)}
              </p>
              <p className="offer-card__description">{offer.description}</p>
            </div>
            <div className="offer-card__facts">
              <OfferContext offer={offer} compact />
              {offer.dist_meters !== null ? (
                <p className="distance">
                  {Math.round(offer.dist_meters)} m de distancia aproximada
                </p>
              ) : null}
              <Link className="offer-card__cta" href={`/oferta/${offer.offer_slug}`}>
                Ver oferta
              </Link>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function OfferPreview({
  offer,
  preview,
}: {
  offer: SearchOffer;
  preview?: {
    storage_path: string;
    alt_text: string;
  };
}) {
  const src = preview ? mediaPublicUrl(preview.storage_path) : null;
  if (src) {
    return (
      <div className="offer-card__media">
        {/* Seller-uploaded URLs are served by the configured public Supabase bucket. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={preview?.alt_text || offer.title} loading="lazy" />
      </div>
    );
  }

  return (
    <OfferFallback
      className="offer-card__media"
      offerClass={offer.offer_class}
      title={offer.title}
    />
  );
}
