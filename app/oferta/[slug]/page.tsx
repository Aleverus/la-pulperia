import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { IconArrowLeft, IconBuildingStore } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import { AddToSelection } from "@/app/_components/AddToSelection";
import { JsonLd } from "@/app/_components/JsonLd";
import { OfferFallback } from "@/app/_components/OfferArtwork";
import { OfferContext } from "@/app/_components/OfferContext";
import { PublicContextNotes } from "@/app/_components/PublicContextNotes";
import { ReportForm } from "@/app/_components/ReportForm";
import { ShareButton } from "@/app/_components/ShareButton";
import { getCatalogOffer } from "@/lib/data";
import {
  OFFER_CLASS_LABEL,
  PRESENCE_MODE_LABEL,
} from "@/lib/catalog";
import { freshnessBand } from "@/lib/freshness";
import { isOfferEffectivelyAvailable } from "@/lib/offer-context";
import { formatPublishedPrice } from "@/lib/money";
import { getPublicContextNotes, recordPublicEvent } from "@/lib/operations";
import { mediaPublicUrl } from "@/lib/media-url";
import { getOfferMedia } from "@/lib/seller-data";
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
    `${formatPublishedPrice(offer.price_cents, offer.price_mode, offer.unit)} en ${offer.presence_name}. ${offer.description}`,
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
    offer.presence_mode === "fixed_location" ? "LocalBusiness" : "Organization";
  const freshness = freshnessBand(new Date(offer.confirmed_at));
  const requestable = isOfferEffectivelyAvailable(offer);
  const schemaAvailability =
    freshness === "stale" || !requestable
      ? null
      : availabilitySchemaUrl(offer.availability_state);
  const structuredData = {
    "@context": "https://schema.org",
    "@type":
      offer.offer_class === "local_service" ||
      offer.offer_class === "digital_offer"
        ? "Service"
        : "Product",
    name: offer.title,
    description: offer.description,
    url: canonical,
    offers: {
      "@type": "Offer",
      ...(offer.price_cents !== null
        ? { price: (offer.price_cents / 100).toFixed(2) }
        : {}),
      priceCurrency: "HNL",
      ...(schemaAvailability ? { availability: schemaAvailability } : {}),
      url: canonical,
      seller: {
        "@type": sellerType,
        name: offer.presence_name,
        url: absoluteUrl(`/pulperia/${offer.presence_slug}`),
      },
    },
  };

  return (
    <main className="detail-page offer-publication-page">
      <JsonLd data={structuredData} />
      <p className="back-link">
        <Link href={`/pulperia/${offer.presence_slug}`}>
          <IconArrowLeft aria-hidden="true" size={17} stroke={1.8} />
          Volver a {offer.presence_name}
        </Link>
      </p>
      <section className="publication-author" aria-label="Pulpería responsable">
        <span aria-hidden="true">
          <Image
            src="/brand/la-pulperia-monogram-one-ink.png"
            alt=""
            width={112}
            height={112}
          />
        </span>
        <div>
          <p>Publicado por</p>
          <Link href={`/pulperia/${offer.presence_slug}`}>
            {offer.presence_name}
          </Link>
          <small>
            <IconBuildingStore aria-hidden="true" size={15} stroke={1.8} />
            {PRESENCE_MODE_LABEL[offer.presence_mode]}
          </small>
        </div>
      </section>
      <header className="publication-heading">
        <p className="eyebrow">{OFFER_CLASS_LABEL[offer.offer_class]}</p>
        <h1>{offer.title}</h1>
        <p className="lede">{offer.description}</p>
      </header>
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
      ) : (
        <OfferFallback
          className="detail-media-fallback"
          offerClass={offer.offer_class}
          title={offer.title}
        />
      )}
      <div className="detail-summary">
        <p className="price-tag price-tag--large">
          {formatPublishedPrice(offer.price_cents, offer.price_mode, offer.unit)}
        </p>
        <p>Precio publicado; confirmalo con la pulpería antes de cerrar.</p>
      </div>
      <OfferContext offer={offer} />
      <div className="button-row">
        {!requestable ? (
          <p>
            Esta oferta ya no admite pedidos con el contexto publicado. Sigue
            visible para que puedas revisar la ficha.
          </p>
        ) : (
          <AddToSelection
            offerId={offer.id}
            offerClass={offer.offer_class}
            availabilityDetails={offer.availability_details}
            listedPriceCents={offer.price_cents}
            listedPriceMode={offer.price_mode}
            listedUnit={offer.unit}
            listedAvailabilityState={offer.availability_state}
            listedConfirmedAt={offer.confirmed_at}
            requestContextToken={offer.request_context_token}
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
