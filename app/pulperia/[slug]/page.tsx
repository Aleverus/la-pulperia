import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/app/_components/JsonLd";
import { PublicContextNotes } from "@/app/_components/PublicContextNotes";
import { ReportForm } from "@/app/_components/ReportForm";
import { ShareButton } from "@/app/_components/ShareButton";
import { getPresence, getPresenceOffers } from "@/lib/data";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
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
    `${presence.kind === "physical" ? "Negocio físico" : "Pulpería virtual"} en Siguatepeque. ${presence.description}`,
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
    presence.kind === "physical"
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
      <section className="presence-sign">
        <p className="eyebrow">Pulpería {presence.kind === "physical" ? "física" : "virtual"}</p>
        <h1>{presence.name}</h1>
        <p>{presence.served_city}</p>
      </section>
      {query.reporte === "recibido" ? (
        <p role="status">Reporte recibido. Un operador lo revisará.</p>
      ) : null}
      {query.reporte === "error" ? (
        <p role="alert">No se pudo enviar el reporte.</p>
      ) : null}
      {presence.kind === "virtual" ? (
        <p>No aparece en el mapa. Atiende Siguatepeque por WhatsApp, sin pin público.</p>
      ) : (
        <p>
          Negocio físico. El pin es público porque el vendedor lo confirmó.{" "}
          <Link href="/mapa">Ver en el mapa</Link>
        </p>
      )}
      <p className="lede">{presence.description}</p>
      <div className="button-row">
        <ShareButton label="Compartir pulpería" />
      </div>
      <PublicContextNotes notes={notes} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">En este mostrador</p>
          <h2>Ofertas</h2>
        </div>
      </div>
      <ul className="presence-offer-list">
        {offers.map((offer) => (
          <li key={offer.id}>
            <div>
              <Link href={`/oferta/${offer.slug}`}>{offer.title}</Link>
              <p className="freshness">
                {offer.availability === "unavailable"
                  ? "No disponible"
                  : FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}
              </p>
            </div>
            <span className="price-tag">
              {formatPublishedPrice(offer.price_cents, offer.price_mode)}
            </span>
          </li>
        ))}
      </ul>
      <ReportForm
        presenceId={presence.id}
        returnPath={`/pulperia/${presence.slug}`}
      />
    </main>
  );
}
