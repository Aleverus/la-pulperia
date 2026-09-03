import Link from "next/link";
import type { Metadata } from "next";
import {
  IconArrowUpRight,
  IconBuildingStore,
  IconCircleCheck,
  IconExternalLink,
  IconInbox,
  IconPlus,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { PresenceForm } from "@/app/_components/PresenceForm";
import { PresenceSelector } from "@/app/_components/PresenceSelector";
import { SellerWorkspaceNav } from "@/app/_components/SellerWorkspaceNav";
import { confirmOfferAction } from "@/app/seller-actions";
import {
  AVAILABILITY_STATE_LABEL,
  OFFER_CLASS_LABEL,
  PRESENCE_MODE_LABEL,
} from "@/lib/catalog";
import { FRESHNESS_LABEL } from "@/lib/freshness";
import { formatPublishedPrice } from "@/lib/money";
import {
  countInactiveOffers,
  countOffersNeedingFreshness,
  getSellerOfferTasks,
} from "@/lib/seller-dashboard";
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
  title: "Mi negocio",
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
  const [offers, requests] = await Promise.all([
    getOwnedOffers(presence.id),
    getSellerRequests(presence.id),
  ]);
  const offerTasks = getSellerOfferTasks(offers);
  const freshnessTasks = offerTasks.filter(
    ({ offer, freshness }) =>
      offer.status === "published" && freshness !== "recent",
  );
  const inactiveTasks = offerTasks.filter(
    ({ offer }) => offer.status === "draft" || offer.status === "paused",
  );
  const freshnessDue = countOffersNeedingFreshness(offerTasks);
  const inactiveOffers = countInactiveOffers(offerTasks);
  const openedRequests = requests.filter(
    (request) => request.status === "handoff_opened",
  ).length;
  const error = formErrorMessage(
    typeof params.error === "string" ? params.error : undefined,
  );
  const confirmedOffer =
    params.ok === "fresh" && typeof params.offer === "string"
      ? offers.find((offer) => offer.id === params.offer)
      : null;
  const whatsappConfirmed = params.ok === "whatsapp";

  return (
    <main className="detail-page seller-dashboard">
      <header className="seller-dashboard__header">
        <div>
          <p className="eyebrow">Trabajo del vendedor</p>
          <h1>Mi negocio</h1>
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

      <SellerWorkspaceNav active="overview" presenceId={presence.id} />

      <div className="seller-status-line" aria-label="Estado del negocio">
        <span className={`status-badge is-${presence.status}`}>
          {PRESENCE_STATUS_LABEL[presence.status]}
        </span>
        <span>{PRESENCE_MODE_LABEL[presence.mode]}</span>
        <span>
          {presence.whatsapp_verification_status === "verified"
            ? "WhatsApp confirmado"
            : "WhatsApp pendiente"}
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
          Tus ofertas se guardan en privado hasta que publiques el negocio.
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
          WhatsApp confirmado. Ya podés publicar el negocio cuando los demás
          datos estén completos.
        </p>
      ) : null}

      <section className="seller-attention" aria-labelledby="seller-attention-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Trabajo del día</p>
            <h2 id="seller-attention-title">Atención hoy</h2>
          </div>
          <span className="seller-attention__count" aria-label="tareas pendientes">
            {requests.length +
              freshnessDue +
              inactiveOffers +
              (presence.status === "published" ? 0 : 1)}
          </span>
        </div>
        {requests.length || freshnessDue || inactiveOffers || presence.status !== "published" ? (
          <ul className="seller-attention__list">
            {requests.map((request) => (
              <li
                key={request.seller_request_id}
                className="seller-attention__item is-request"
              >
                <IconInbox aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>
                    Solicitud sobre {request.items[0]?.title ?? "una oferta"}
                  </strong>
                  <p>
                    {request.status === "handoff_opened"
                      ? "La persona abrió WhatsApp; eso no confirma mensaje, pedido ni venta."
                      : "Revisá la intención preparada antes de cualquier conversación."}
                  </p>
                </div>
                <Link
                  href={`${sellerUrl("/mi-pulperia/solicitudes", presence.id)}#solicitud-${request.seller_request_id}`}
                >
                  Abrir esta solicitud
                  <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
                </Link>
              </li>
            ))}
            {freshnessTasks.map(({ offer, freshness }) => (
              <li key={offer.id} className="seller-attention__item is-freshness">
                <IconRefresh aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>Reconfirmá {offer.title}</strong>
                  <p>
                    Está {FRESHNESS_LABEL[freshness].toLowerCase()}. Confirmar
                    sólo actualiza vigencia; no cambia precio ni registra una venta.
                  </p>
                </div>
                <form action={confirmOfferAction} className="seller-attention__action">
                  <input type="hidden" name="presence_id" value={presence.id} />
                  <input type="hidden" name="offer_id" value={offer.id} />
                  <input type="hidden" name="return_to" value="dashboard" />
                  <button type="submit">Reconfirmar esta oferta</button>
                </form>
              </li>
            ))}
            {inactiveTasks.map(({ offer }) => (
              <li key={offer.id} className="seller-attention__item is-inactive">
                <IconBuildingStore aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>Retomá {offer.title}</strong>
                  <p>
                    Está {OFFER_STATUS_LABEL[offer.status].toLowerCase()} y no
                    aparece en la vitrina pública.
                  </p>
                </div>
                <Link
                  href={sellerUrl(
                    `/mi-pulperia/ofertas/${offer.id}`,
                    presence.id,
                  )}
                >
                  Abrir esta oferta
                  <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
                </Link>
              </li>
            ))}
            {presence.status !== "published" ? (
              <li className="seller-attention__item is-setup">
                <IconSettings aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>Falta terminar la publicación del negocio</strong>
                  <p>Revisá WhatsApp, atención y ubicación pública antes de mostrar ofertas.</p>
                </div>
                <a href="#seller-settings">
                  Completar datos
                  <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
                </a>
              </li>
            ) : null}
          </ul>
        ) : (
          <div className="seller-attention__ready" role="status">
            <IconCircleCheck aria-hidden="true" size={26} stroke={1.9} />
            <div>
              <strong>Todo está al día</strong>
              <p>Las ofertas publicadas están recientes y no hay solicitudes preparadas.</p>
            </div>
          </div>
        )}
      </section>

      <nav className="seller-quick-actions" aria-label="Acciones del negocio">
        <Link href={sellerUrl("/mi-pulperia/solicitudes", presence.id)}>
          <IconInbox aria-hidden="true" size={26} stroke={1.8} />
          <span>
            <strong>Solicitudes</strong>
            <small>
              {openedRequests
                ? `${openedRequests} con apertura de WhatsApp, sin afirmar venta.`
                : "Revisá intenciones preparadas por clientes."}
            </small>
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

      <section
        id="publicaciones"
        className="seller-offers"
        aria-labelledby="seller-offers-title"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Publicaciones</p>
            <h2 id="seller-offers-title">Ofertas de tu pulpería</h2>
          </div>
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
            {offerTasks.map(({ offer, freshness }) => (
              <li key={offer.id} className={`is-${freshness}`}>
                <div>
                  <p className="seller-offer-list__identity">
                    {OFFER_CLASS_LABEL[offer.offer_class]} · {AVAILABILITY_STATE_LABEL[offer.availability_state]}
                  </p>
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
                    {FRESHNESS_LABEL[freshness]}
                  </span>
                  <div className="seller-offer-list__actions">
                    {offer.status === "published" && freshness !== "recent" ? (
                      <form action={confirmOfferAction}>
                        <input type="hidden" name="presence_id" value={presence.id} />
                        <input type="hidden" name="offer_id" value={offer.id} />
                        <input type="hidden" name="return_to" value="dashboard" />
                        <button type="submit">Reconfirmar</button>
                      </form>
                    ) : null}
                    <Link
                      className="secondary-action"
                      href={sellerUrl(
                        `/mi-pulperia/ofertas/${offer.id}`,
                        presence.id,
                      )}
                    >
                      Editar
                    </Link>
                  </div>
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
            <strong>Datos de {presence.name}</strong>
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
