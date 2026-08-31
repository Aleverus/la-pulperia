import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { PresenceSelector } from "@/app/_components/PresenceSelector";
import { PRESENCE_MODE_LABEL } from "@/lib/catalog";
import { FRESHNESS_LABEL, freshnessBand } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import {
  formErrorMessage,
  OFFER_STATUS_LABEL,
  PRESENCE_STATUS_LABEL,
} from "@/lib/seller";
import { getOwnedOffers, getOwnedPresences } from "@/lib/seller-data";
import { selectOwnedPresence, sellerUrl } from "@/lib/seller-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi pulpería",
  robots: { index: false, follow: false },
};

export default async function MiPulperiaPage({
  searchParams,
}: PageProps<"/mi-pulperia">) {
  const params = await searchParams;
  const requestedId =
    typeof params.presence === "string" ? params.presence : null;
  const presences = await getOwnedPresences("/mi-pulperia");
  const presence = selectOwnedPresence(presences, requestedId);
  if (!presence) redirect("/vender");
  if (requestedId !== presence.id) {
    redirect(sellerUrl("/mi-pulperia", presence.id));
  }
  const offers = await getOwnedOffers(presence.id);
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );

  return (
    <main>
      <h1>Mi pulpería</h1>
      <PresenceSelector
        presences={presences}
        activeId={presence.id}
        action="/mi-pulperia"
      />
      <p>
        <Link href={sellerUrl("/mi-pulperia/solicitudes", presence.id)}>
          Ver solicitudes recibidas
        </Link>
        {" · "}
        <Link href="/vender">Abrir otra pulpería</Link>
      </p>
      <p>
        {PRESENCE_STATUS_LABEL[presence.status]} ·{" "}
        {PRESENCE_MODE_LABEL[presence.mode]}
        {" · "}
        {presence.whatsapp_verification_status === "verified"
          ? "WhatsApp verificado"
          : "WhatsApp sin verificar"}
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
        <Link href={sellerUrl("/mi-pulperia/ofertas/nueva", presence.id)}>
          Crear oferta
        </Link>
      </p>
      {offers.length === 0 ? (
        <p>Todavía no hay ofertas. Creá la primera desde el teléfono.</p>
      ) : (
        <ul className="offer-list">
          {offers.map((offer) => (
            <li key={offer.id}>
              <Link
                href={sellerUrl(`/mi-pulperia/ofertas/${offer.id}`, presence.id)}
              >
                {offer.title}
              </Link>
              {" · "}
              {formatPublishedPrice(offer.price_cents, offer.price_mode, offer.unit)}
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
