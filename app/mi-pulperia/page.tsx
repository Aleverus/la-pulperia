import Link from "next/link";
import type { Metadata } from "next";
import {
  IconArrowUpRight,
  IconCircleCheck,
  IconExternalLink,
  IconInbox,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { PresenceSelector } from "@/app/_components/PresenceSelector";
import { SellerWorkspaceNav } from "@/app/_components/SellerWorkspaceNav";
import { ShareButton } from "@/app/_components/ShareButton";
import { confirmOfferAction } from "@/app/seller-actions";
import {
  AVAILABILITY_STATE_LABEL,
  OFFER_CLASS_LABEL,
  type OfferClass,
  PRESENCE_MODE_LABEL,
} from "@/lib/catalog";
import { FRESHNESS_LABEL } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import { getSellerOfferTasks } from "@/lib/seller-dashboard";
import {
  formErrorMessage,
  OFFER_STATUS_LABEL,
  PRESENCE_STATUS_LABEL,
} from "@/lib/seller";
import {
  getOwnedOffers,
  getOwnedPresences,
  getSellerRequests,
} from "@/lib/seller-data";
import { selectOwnedPresence, sellerUrl } from "@/lib/seller-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi pulpería",
  robots: { index: false, follow: false },
};

const COMPOSER_OPTIONS: Array<{ value: OfferClass; label: string }> = [
  { value: "stocked_product", label: "Producto" },
  { value: "scheduled_food", label: "Encargo" },
  { value: "local_service", label: "Servicio" },
  { value: "digital_offer", label: "Digital" },
];

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

  const [offers, requests] = await Promise.all([
    getOwnedOffers(presence.id),
    getSellerRequests(presence.id),
  ]);
  const offerTasks = getSellerOfferTasks(offers);
  const requestAttention = requests[0] ?? null;
  const freshnessAttention = requestAttention
    ? null
    : offerTasks.find(
        ({ offer, freshness }) =>
          offer.status === "published" && freshness !== "recent",
      ) ?? null;
  const inactiveAttention = requestAttention || freshnessAttention
    ? null
    : offerTasks.find(
        ({ offer }) => offer.status === "draft" || offer.status === "paused",
      ) ?? null;
  const setupAttention =
    !requestAttention &&
    !freshnessAttention &&
    !inactiveAttention &&
    presence.status !== "published";
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );
  const confirmedOffer =
    params.ok === "fresh" && typeof params.offer === "string"
      ? offers.find((offer) => offer.id === params.offer)
      : null;
  const whatsappConfirmed = params.ok === "whatsapp";
  const newOfferHref = sellerUrl("/mi-pulperia/ofertas/nueva", presence.id);

  return (
    <main className="detail-page seller-dashboard workspace-page">
      <header className="seller-profile-header">
        <div className="seller-profile-header__identity">
          <span className="presence-avatar" aria-hidden="true">
            {initials(presence.name)}
          </span>
          <div>
            <p className="eyebrow">Tu pulpería</p>
            <h1>{presence.name}</h1>
            <p>
              {PRESENCE_MODE_LABEL[presence.mode]} · Siguatepeque
            </p>
          </div>
        </div>
        {presence.status === "published" ? (
          <Link className="secondary-action" href={`/pulperia/${presence.slug}`}>
            Ver perfil
            <IconExternalLink aria-hidden="true" size={16} stroke={1.8} />
          </Link>
        ) : (
          <span className="seller-profile-header__private">Perfil todavía privado</span>
        )}
        {presences.length > 1 ? (
          <PresenceSelector
            presences={presences}
            activeId={presence.id}
            action="/mi-pulperia"
          />
        ) : null}
        <div className="seller-status-line" aria-label="Estado del negocio">
          <span className={`status-badge is-${presence.status}`}>
            {PRESENCE_STATUS_LABEL[presence.status]}
          </span>
          <span>
            {presence.whatsapp_verification_status === "verified"
              ? "WhatsApp confirmado"
              : "WhatsApp pendiente"}
          </span>
          <span>
            {offers.filter((offer) => offer.status === "published").length}{" "}
            publicaciones
          </span>
        </div>
      </header>

      {presence.status !== "published" ? (
        <p className="notice-card" role="status">
          Tus borradores siguen privados hasta publicar el perfil y cada oferta.
        </p>
      ) : null}
      {confirmedOffer ? (
        <p role="status">
          Vigencia de <strong>{confirmedOffer.title}</strong> confirmada. No se
          modificaron precio, contenido ni una venta.
        </p>
      ) : null}
      {whatsappConfirmed ? (
        <p role="status">
          WhatsApp confirmado. Ya podés publicar cuando los demás datos estén
          completos.
        </p>
      ) : null}

      <section className="seller-composer" aria-labelledby="seller-composer-title">
        <span className="presence-avatar" aria-hidden="true">
          {initials(presence.name)}
        </span>
        <div>
          <h2 id="seller-composer-title" className="sr-only">
            Crear una publicación
          </h2>
          <Link className="seller-composer__prompt" href={newOfferHref}>
            ¿Qué querés publicar hoy?
          </Link>
          <nav aria-label="Tipo de publicación">
            {COMPOSER_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={`${newOfferHref}&clase=${option.value}`}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="seller-attention" aria-labelledby="seller-attention-title">
        <div>
          <p className="eyebrow">
            {requestAttention || freshnessAttention || inactiveAttention || setupAttention
              ? "Una cosa requiere atención"
              : "Atención al día"}
          </p>
          <h2 id="seller-attention-title" className="sr-only">
            Atención prioritaria
          </h2>
        </div>
        {requestAttention ? (
          <div className="seller-attention__item is-request">
            <IconInbox aria-hidden="true" size={23} stroke={1.9} />
            <div>
              <strong>
                Solicitud sobre {requestAttention.items[0]?.title ?? "una oferta"}
              </strong>
              <p>
                {requestAttention.status === "handoff_opened"
                  ? "La persona abrió WhatsApp; eso no confirma mensaje, pedido ni venta."
                  : "Revisá la intención preparada antes de cualquier conversación."}
              </p>
            </div>
            <Link
              href={`${sellerUrl("/mi-pulperia/solicitudes", presence.id)}#solicitud-${requestAttention.seller_request_id}`}
            >
              Abrir solicitud
              <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
            </Link>
          </div>
        ) : freshnessAttention ? (
          <div className="seller-attention__item is-freshness">
            <IconRefresh aria-hidden="true" size={23} stroke={1.9} />
            <div>
              <strong>Reconfirmá {freshnessAttention.offer.title}</strong>
              <p>
                Está {FRESHNESS_LABEL[freshnessAttention.freshness].toLowerCase()}.
                Confirmar sólo renueva la vigencia; no cambia precio ni registra
                una venta.
              </p>
            </div>
            <form action={confirmOfferAction} className="seller-attention__action">
              <input type="hidden" name="presence_id" value={presence.id} />
              <input
                type="hidden"
                name="offer_id"
                value={freshnessAttention.offer.id}
              />
              <input type="hidden" name="return_to" value="dashboard" />
              <button type="submit">Reconfirmar ahora</button>
            </form>
          </div>
        ) : inactiveAttention ? (
          <div className="seller-attention__item is-inactive">
            <IconArrowUpRight aria-hidden="true" size={23} stroke={1.9} />
            <div>
              <strong>Retomá {inactiveAttention.offer.title}</strong>
              <p>
                Está {OFFER_STATUS_LABEL[inactiveAttention.offer.status].toLowerCase()}
                y no aparece en el perfil público.
              </p>
            </div>
            <Link
              href={sellerUrl(
                `/mi-pulperia/ofertas/${inactiveAttention.offer.id}`,
                presence.id,
              )}
            >
              Abrir publicación
            </Link>
          </div>
        ) : setupAttention ? (
          <div className="seller-attention__item is-setup">
            <IconSettings aria-hidden="true" size={23} stroke={1.9} />
            <div>
              <strong>Terminá el perfil público</strong>
              <p>Revisá atención, WhatsApp y ubicación antes de publicar.</p>
            </div>
            <a href="#seller-settings">Completar perfil</a>
          </div>
        ) : (
          <div className="seller-attention__ready" role="status">
            <IconCircleCheck aria-hidden="true" size={25} stroke={1.9} />
            <div>
              <strong>Todo lo visible está al día</strong>
              <p>No hay una publicación o solicitud que requiera acción ahora.</p>
            </div>
          </div>
        )}
      </section>

      <SellerWorkspaceNav active="publications" presenceId={presence.id} />

      <section
        id="publicaciones"
        className="seller-offers"
        aria-labelledby="seller-offers-title"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Publicaciones</p>
            <h2 id="seller-offers-title">Lo que ofrecés</h2>
          </div>
        </div>
        {offers.length === 0 ? (
          <div className="empty-state seller-empty-state">
            <div>
              <strong>Todavía no publicaste una oferta</strong>
              <p>Empezá arriba; podés dejarla como borrador privado.</p>
            </div>
          </div>
        ) : (
          <ul className="seller-offer-list">
            {offerTasks.map(({ offer, freshness }) => (
              <li key={offer.id} className={`is-${freshness}`}>
                <header>
                  <span className="presence-avatar" aria-hidden="true">
                    {initials(presence.name)}
                  </span>
                  <div>
                    <strong>{presence.name}</strong>
                    <small>
                      {OFFER_STATUS_LABEL[offer.status]} · {FRESHNESS_LABEL[freshness]}
                    </small>
                  </div>
                  <span className={`status-badge is-${offer.status}`}>
                    {OFFER_STATUS_LABEL[offer.status]}
                  </span>
                </header>
                <div className="seller-offer-list__body">
                  <p className="seller-offer-list__identity">
                    {OFFER_CLASS_LABEL[offer.offer_class]} ·{" "}
                    {AVAILABILITY_STATE_LABEL[offer.availability_state]}
                  </p>
                  <Link
                    href={sellerUrl(
                      `/mi-pulperia/ofertas/${offer.id}`,
                      presence.id,
                    )}
                  >
                    {offer.title}
                  </Link>
                  <p>{offer.description}</p>
                  <strong className="price-tag">
                    {formatPublishedPrice(
                      offer.price_cents,
                      offer.price_mode,
                      offer.unit,
                    )}
                  </strong>
                </div>
                <div className="seller-offer-list__actions">
                  <Link
                    className="secondary-action"
                    href={sellerUrl(
                      `/mi-pulperia/ofertas/${offer.id}`,
                      presence.id,
                    )}
                  >
                    Editar
                  </Link>
                  {offer.status === "published" ? (
                    <ShareButton
                      label="Compartir"
                      secondary
                      url={`/oferta/${offer.slug}`}
                      title={offer.title}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details
        id="seller-settings"
        className="seller-settings"
        open={presence.status !== "published" || Boolean(error)}
      >
        <summary>
          <IconSettings aria-hidden="true" size={24} stroke={1.8} />
          <span>
            <strong>Perfil de {presence.name}</strong>
            <small>Identidad, atención, WhatsApp y ubicación pública.</small>
          </span>
        </summary>
        <div className="seller-settings__body">
          <PresenceForm presence={presence} error={error ?? undefined} />
          <p>
            <Link href="/vender">Agregar otro negocio</Link>
          </p>
        </div>
      </details>
    </main>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-HN");
}
