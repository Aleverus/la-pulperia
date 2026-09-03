import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  IconArrowRight,
  IconBuildingStore,
  IconMapPin,
} from "@tabler/icons-react";
import { notFound } from "next/navigation";
import { JsonLd } from "@/app/_components/JsonLd";
import { OfferContext } from "@/app/_components/OfferContext";
import { PublicContextNotes } from "@/app/_components/PublicContextNotes";
import { ReportForm } from "@/app/_components/ReportForm";
import { ShareButton } from "@/app/_components/ShareButton";
import { getPresence, getPresenceOffers } from "@/lib/data";
import { OFFER_CLASS_LABEL, PRESENCE_MODE_LABEL } from "@/lib/catalog";
import { formatPublishedPrice } from "@/lib/money";
import { getPublicContextNotes } from "@/lib/operations";
import { absoluteUrl, metadataDescription } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/pulperia/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const presence = await getPresence(slug);
  if (!presence) {
    return { title: "Pulpería no encontrada", robots: { index: false } };
  }
  const description = metadataDescription(
    `${PRESENCE_MODE_LABEL[presence.mode]} en Siguatepeque. ${presence.description}`,
  );
  const canonical = `/pulperia/${presence.slug}`;
  return {
    title: presence.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: presence.name,
      description,
      url: canonical,
    },
  };
}

export default async function PulperiaPage({
  params,
  searchParams,
}: PageProps<"/pulperia/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const presence = await getPresence(slug);
  if (!presence) notFound();
  const [offers, notes] = await Promise.all([
    getPresenceOffers(presence.id),
    getPublicContextNotes({ presenceId: presence.id }),
  ]);
  const structuredData =
    presence.mode === "fixed_location"
      ? {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: presence.name,
          description: presence.description,
          url: absoluteUrl(`/pulperia/${presence.slug}`),
          address: {
            "@type": "PostalAddress",
            addressLocality: presence.served_city,
            addressCountry: "HN",
          },
          ...(presence.lat !== null && presence.lng !== null
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: presence.lat,
                  longitude: presence.lng,
                },
              }
            : {}),
        }
      : null;

  return (
    <main className="detail-page presence-page">
      {structuredData ? <JsonLd data={structuredData} /> : null}
      <section className="public-profile">
        <div className="public-profile__identity">
          <span className="public-profile__mark" aria-hidden="true">
            <Image
              src="/brand/la-pulperia-monogram-one-ink.png"
              alt=""
              width={112}
              height={112}
            />
          </span>
          <div>
            <p className="eyebrow">Perfil público</p>
            <h1>{presence.name}</h1>
            <p className="public-profile__meta">
              <IconBuildingStore aria-hidden="true" size={18} stroke={1.8} />
              {PRESENCE_MODE_LABEL[presence.mode]}
              <span aria-hidden="true">·</span>
              <IconMapPin aria-hidden="true" size={18} stroke={1.8} />
              {presence.served_city}
            </p>
          </div>
        </div>
        <p className="lede">{presence.description}</p>
        <div className="button-row">
          <Link className="primary-action" href="#publications-title">
            Explorar ofertas
            <IconArrowRight aria-hidden="true" size={17} stroke={1.8} />
          </Link>
          <ShareButton label="Compartir pulpería" secondary />
        </div>
      </section>
      {query.reporte === "recibido" ? (
        <p role="status">Reporte recibido. Un operador lo revisará.</p>
      ) : null}
      {query.reporte === "error" ? (
        <p role="alert">No se pudo enviar el reporte.</p>
      ) : null}
      <section className="public-profile__context" aria-label="Cómo atiende">
        <p className="eyebrow">Cómo atiende</p>
        {presence.mode !== "fixed_location" ? (
          <p>
          No aparece como punto en el mapa. {presence.coverage_label ?? presence.service_territory}
          </p>
        ) : (
          <p>
            Negocio físico. El pin es público porque el vendedor lo confirmó.{" "}
            <Link href="/mapa">Ver en el mapa</Link>
          </p>
        )}
      </section>
      <PublicContextNotes notes={notes} />
      <section className="publications" aria-labelledby="publications-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Publicaciones</p>
            <h2 id="publications-title">Lo que ofrece esta pulpería</h2>
          </div>
          <span>{offers.length} {offers.length === 1 ? "oferta" : "ofertas"}</span>
        </div>
        <ul className="presence-offer-list">
          {offers.map((offer) => (
            <li key={offer.id}>
              <div>
                <p className="eyebrow">{OFFER_CLASS_LABEL[offer.offer_class]}</p>
                <Link href={`/oferta/${offer.slug}`}>{offer.title}</Link>
                <p>{offer.description}</p>
                <OfferContext offer={offer} compact />
              </div>
              <div className="presence-offer-list__action">
                <span className="price-tag">
                  {formatPublishedPrice(offer.price_cents, offer.price_mode, offer.unit)}
                </span>
                <Link href={`/oferta/${offer.slug}`}>
                  Ver publicación
                  <IconArrowRight aria-hidden="true" size={17} stroke={1.8} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <ReportForm
        presenceId={presence.id}
        returnPath={`/pulperia/${presence.slug}`}
      />
    </main>
  );
}
