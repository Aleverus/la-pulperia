import Link from "next/link";
import type { SearchOffer } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";

export function OfferList({ offers }: { offers: SearchOffer[] }) {
  if (offers.length === 0) {
    return <p>No hay ofertas publicadas para esa búsqueda.</p>;
  }

  return (
    <ul className="offer-list">
      {offers.map((offer) => (
        <li key={offer.offer_id}>
          <article className="offer-card">
            <p className="offer-card__seller">
              <Link href={`/pulperia/${offer.presence_slug}`}>
                {offer.presence_name}
              </Link>
              <span>{offer.presence_kind === "physical" ? "Física" : "Virtual"}</span>
            </p>
            <h2>
              <Link href={`/oferta/${offer.offer_slug}`}>{offer.title}</Link>
            </h2>
            <p className="price-tag">
              {formatPublishedPrice(offer.price_cents, offer.price_mode)}
            </p>
            <p className="freshness">
              {FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}
            </p>
            {offer.dist_meters !== null ? (
              <p className="distance">
                {Math.round(offer.dist_meters)} m de distancia aproximada
              </p>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
