import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { PRESENCE_MODE_LABEL } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import {
  formErrorMessage,
  OFFER_STATUS_LABEL,
  PRESENCE_STATUS_LABEL,
} from "@/lib/seller";
import { getOwnedOffers, getOwnedPresence } from "@/lib/seller-data";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi pulpería",
  robots: { index: false, follow: false },
};

export default async function MiPulperiaPage({
  searchParams,
}: PageProps<"/mi-pulperia">) {
  await requireSession("/mi-pulperia");
  const presence = await getOwnedPresence();
  if (!presence) redirect("/vender");
  const offers = await getOwnedOffers(presence.id);
  const params = await searchParams;
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main>
      <h1>Mi pulpería</h1>
      <p>
        {PRESENCE_STATUS_LABEL[presence.status]} ·{" "}
        {PRESENCE_MODE_LABEL[presence.mode]}
        {presence.status === "published" ? (
          <>
            {" · "}
            <Link href={`/pulperia/${presence.slug}`}>Ver página pública</Link>
          </>
        ) : null}
      </p>
      {presence.status !== "published" ? (
        <p>Tus ofertas no salen en el catálogo hasta que publiques la pulpería.</p>
      ) : null}
      <PresenceForm presence={presence} error={error ?? undefined} />

      <h2>Ofertas</h2>
      <p>
        <Link href="/mi-pulperia/ofertas/nueva">Crear oferta</Link>
      </p>
      {offers.length === 0 ? (
        <p>Todavía no hay ofertas. Creá la primera desde el teléfono.</p>
      ) : (
        <ul className="offer-list">
          {offers.map((offer) => (
            <li key={offer.id}>
              <Link href={`/mi-pulperia/ofertas/${offer.id}`}>{offer.title}</Link>
              {" · "}
              {formatPublishedPrice(offer.price_cents, offer.price_mode)}
              {" · "}
              {OFFER_STATUS_LABEL[offer.status]}
              {" · "}
              {FRESHNESS_LABEL[freshnessBand(new Date(offer.confirmed_at))]}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
