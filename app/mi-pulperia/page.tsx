import Link from "next/link";
import type { Metadata } from "next";
import {
  IconBuildingStore,
  IconExternalLink,
  IconInbox,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
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
    <main className="detail-page seller-dashboard">
      <header className="seller-dashboard__header">
        <div>
          <p className="eyebrow">Panel de dueña</p>
          <h1>Mi pulpería</h1>
          <p className="seller-dashboard__name">
            <IconBuildingStore aria-hidden="true" size={24} stroke={1.8} />
            {presence.name}
          </p>
        </div>
        <PresenceSelector
          presences={presences}
          activeId={presence.id}
          action="/mi-pulperia"
        />
      </header>

      <div className="seller-status-line" aria-label="Estado de la pulpería">
        <span className={`status-badge is-${presence.status}`}>
          {PRESENCE_STATUS_LABEL[presence.status]}
        </span>
        <span>{PRESENCE_MODE_LABEL[presence.mode]}</span>
        <span>
          {presence.whatsapp_verification_status === "verified"
            ? "WhatsApp verificado"
            : "WhatsApp sin verificar"}
        </span>
        {presence.status === "published" ? (
          <Link href={`/pulperia/${presence.slug}`}>
            Ver página pública
            <IconExternalLink aria-hidden="true" size={16} stroke={1.8} />
          </Link>
        ) : null}
      </div>

      {presence.status !== "published" ? (
        <p className="notice-card" role="status">
          Tus ofertas se guardan en privado hasta que publiques la pulpería.
        </p>
      ) : null}

      <nav className="seller-quick-actions" aria-label="Acciones de la pulpería">
        <Link href={sellerUrl("/mi-pulperia/solicitudes", presence.id)}>
          <IconInbox aria-hidden="true" size={26} stroke={1.8} />
          <span>
            <strong>Solicitudes recibidas</strong>
            <small>Revisá intenciones preparadas por clientes.</small>
          </span>
        </Link>
        <Link href={sellerUrl("/mi-pulperia/ofertas/nueva", presence.id)}>
          <IconPlus aria-hidden="true" size={26} stroke={2} />
          <span>
            <strong>Crear oferta</strong>
            <small>
              Publicá un producto, encargo, servicio u oferta digital.
            </small>
          </span>
        </Link>
      </nav>

      <section className="seller-offers" aria-labelledby="seller-offers-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Catálogo propio</p>
            <h2 id="seller-offers-title">Tus ofertas</h2>
          </div>
          <Link
            className="secondary-action"
            href={sellerUrl("/mi-pulperia/ofertas/nueva", presence.id)}
          >
            Nueva oferta
          </Link>
        </div>
        {offers.length === 0 ? (
          <div className="empty-state seller-empty-state">
            <IconPlus aria-hidden="true" size={28} stroke={1.8} />
            <div>
              <strong>Todavía no hay ofertas</strong>
              <p>
                Creá la primera; podés dejarla como borrador antes de publicarla.
              </p>
            </div>
          </div>
        ) : (
          <ul className="seller-offer-list">
            {offers.map((offer) => (
              <li key={offer.id}>
                <div>
                  <Link
                    href={sellerUrl(
                      `/mi-pulperia/ofertas/${offer.id}`,
                      presence.id,
                    )}
                  >
                    {offer.title}
                  </Link>
                  <span>
                    {formatPublishedPrice(
                      offer.price_cents,
                      offer.price_mode,
                      offer.unit,
                    )}
                  </span>
                </div>
                <div className="seller-offer-list__meta">
                  <span className={`status-badge is-${offer.status}`}>
                    {OFFER_STATUS_LABEL[offer.status]}
                  </span>
                  <span>
                    {
                      FRESHNESS_LABEL[
                        freshnessBand(new Date(offer.confirmed_at))
                      ]
                    }
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details
        className="seller-settings"
        open={presence.status !== "published" || Boolean(error)}
      >
        <summary>
          <IconSettings aria-hidden="true" size={24} stroke={1.8} />
          <span>
            <strong>Configuración de {presence.name}</strong>
            <small>Identidad, atención, WhatsApp y ubicación pública.</small>
          </span>
        </summary>
        <div className="seller-settings__body">
          <PresenceForm presence={presence} error={error ?? undefined} />
          <p>
            <Link href="/vender">Abrir otra pulpería</Link>
          </p>
        </div>
      </details>
    </main>
  );
}
