import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/app/_components/AddToCartButton";
import { JsonLd } from "@/app/_components/JsonLd";
import { PublicContextNotes } from "@/app/_components/PublicContextNotes";
import { ReportForm } from "@/app/_components/ReportForm";
import { ShareButton } from "@/app/_components/ShareButton";
import { getCatalogOffer } from "@/lib/data";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import { getPublicContextNotes, recordPublicEvent } from "@/lib/operations";
import { getOfferMedia, mediaPublicUrl } from "@/lib/seller-data";
import {
  absoluteUrl,
  availabilitySchemaUrl,
  metadataDescription,
} from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/oferta/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getCatalogOffer(slug);
  if (!offer) return { title: "Oferta no encontrada", robots: { index: false } };

  const description = metadataDescription(
    `${formatPublishedPrice(offer.price_cents, offer.price_mode)} en ${offer.presence_name}. ${offer.description}`,
  );
  const canonical = `/oferta/${offer.slug}`;
  return {
    title: offer.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: offer.title,
      description,
      url: canonical,
    },
  };
}

export default async function OfferPage({
  params,
  searchParams,
}: PageProps<"/oferta/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const offer = await getCatalogOffer(slug);
  if (!offer) notFound();
  const [media, notes] = await Promise.all([
    getOfferMedia(offer.id),
    getPublicContextNotes({ offerId: offer.id }),
    recordPublicEvent("offer_open").catch(() => undefined),
  ]);
  const canonical = absoluteUrl(`/oferta/${offer.slug}`);
  const sellerType =
    offer.presence_kind === "physical" ? "LocalBusiness" : "Organization";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": offer.kind === "service" ? "Service" : "Product",
    name: offer.title,
    description: offer.description,
    url: canonical,
    offers: {
      "@type": "Offer",
      price: (offer.price_cents / 100).toFixed(2),
      priceCurrency: "HNL",
      availability: availabilitySchemaUrl(offer.availability),
      url: canonical,
      seller: {
        "@type": sellerType,
        name: offer.presence_name,
        url: absoluteUrl(`/pulperia/${offer.presence_slug}`),
      },
    },
  };

  return (
    <main className="detail-page">
      <JsonLd data={structuredData} />
      <p className="eyebrow">
        <Link href={`/pulperia/${offer.presence_slug}`}>{offer.presence_name}</Link>
        {" · "}
        {offer.presence_kind === "physical" ? "física" : "virtual"}
      </p>
      <h1>{offer.title}</h1>
      {query.reporte === "recibido" ? (
        <p role="status">Reporte recibido. Un operador lo revisará.</p>
      ) : null}
      {query.reporte === "error" ? (
        <p role="alert">No se pudo enviar el reporte.</p>
      ) : null}
      {media.length > 0 ? (
        <ul className="media-grid">
          {media.map((item) => {
            const src = mediaPublicUrl(item.storage_path);
            if (!src) return null;
            return (
              <li key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={item.alt_text || offer.title} />
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="detail-summary">
        <p className="price-tag price-tag--large">
          {formatPublishedPrice(offer.price_cents, offer.price_mode)}
        </p>
        <p className="freshness">
          {FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}
        </p>
      </div>
      <p className="lede">{offer.description}</p>
      <div className="button-row">
        {offer.availability === "unavailable" ? (
          <p>No disponible. Sigue visible en la pulpería.</p>
        ) : (
          <AddToCartButton
            offerId={offer.id}
            listedPriceCents={offer.price_cents}
            listedPriceMode={offer.price_mode}
            listedAvailability={offer.availability}
            listedConfirmedAt={offer.confirmed_at}
          />
        )}
        <ShareButton label="Compartir oferta" />
      </div>
      <p className="trust-note">
        Disponibilidad, precio final, pago y entrega se confirman con el vendedor.
      </p>
      <PublicContextNotes notes={notes} />
      <ReportForm offerId={offer.id} returnPath={`/oferta/${offer.slug}`} />
    </main>
  );
}
