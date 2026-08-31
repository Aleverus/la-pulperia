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
  const [offers, requests] = await Promise.all([
    getOwnedOffers(presence.id),
    getSellerRequests(presence.id),
  ]);
  const offerTasks = getSellerOfferTasks(offers);
  const freshnessDue = countOffersNeedingFreshness(offerTasks);
  const inactiveOffers = countInactiveOffers(offerTasks);
  const openedRequests = requests.filter(
    (request) => request.status === "handoff_opened",
  ).length;
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

      {params.ok === "fresh" ? (
        <p role="status">Vigencia confirmada. La oferta vuelve a aparecer como reciente.</p>
      ) : null}

      <section className="seller-attention" aria-labelledby="seller-attention-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Trabajo del día</p>
            <h2 id="seller-attention-title">Atención hoy</h2>
          </div>
          <span className="seller-attention__count" aria-label="tareas pendientes">
            {requests.length + freshnessDue + inactiveOffers}
          </span>
        </div>
        {requests.length || freshnessDue || inactiveOffers || presence.status !== "published" ? (
          <ul className="seller-attention__list">
            {requests.length ? (
              <li className="seller-attention__item is-request">
                <IconInbox aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>
                    {requests.length === 1
                      ? "Hay una solicitud preparada"
                      : `Hay ${requests.length} solicitudes preparadas`}
                  </strong>
                  <p>
                    {openedRequests
                      ? `${openedRequests} ya pasó a WhatsApp; revisá sólo lo que la plataforma puede mostrar.`
                      : "Revisá la intención antes de cualquier conversación en WhatsApp."}
                  </p>
                </div>
                <Link href={sellerUrl("/mi-pulperia/solicitudes", presence.id)}>
                  Ver solicitudes
                  <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
                </Link>
              </li>
            ) : null}
            {freshnessDue ? (
              <li className="seller-attention__item is-freshness">
                <IconRefresh aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>
                    {freshnessDue === 1
                      ? "Una oferta necesita reconfirmación"
                      : `${freshnessDue} ofertas necesitan reconfirmación`}
                  </strong>
                  <p>
                    Actualizá sólo lo que sigue vigente; no cambia precio ni registra una venta.
                  </p>
                </div>
                <a href="#seller-offers-title">
                  Revisar catálogo
                  <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
                </a>
              </li>
            ) : null}
            {inactiveOffers ? (
              <li className="seller-attention__item is-inactive">
                <IconBuildingStore aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>
                    {inactiveOffers === 1
                      ? "Hay una oferta fuera del catálogo público"
                      : `Hay ${inactiveOffers} ofertas fuera del catálogo público`}
                  </strong>
                  <p>Revisá borradores y pausadas cuando estés lista para mostrarlas otra vez.</p>
                </div>
                <a href="#seller-offers-title">
                  Ver ofertas
                  <IconArrowUpRight aria-hidden="true" size={17} stroke={1.9} />
                </a>
              </li>
            ) : null}
            {presence.status !== "published" ? (
              <li className="seller-attention__item is-setup">
                <IconSettings aria-hidden="true" size={23} stroke={1.9} />
                <div>
                  <strong>Falta terminar la publicación de la pulpería</strong>
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
