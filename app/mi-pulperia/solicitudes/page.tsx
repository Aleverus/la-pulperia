import Link from "next/link";
import type { Metadata } from "next";
import {
  IconArrowLeft,
  IconCircleCheck,
  IconInbox,
  IconMessage,
  IconReceipt,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { PresenceSelector } from "@/app/_components/PresenceSelector";
import { confirmRequestUnderstoodAction } from "@/app/seller-actions";
import {
  FULFILLMENT_MODE_LABEL,
  OFFER_CLASS_LABEL,
} from "@/lib/catalog";
import { formatPublishedPrice } from "@/lib/money";
import { formatRequestDetails } from "@/lib/selection";
import { getOwnedPresences, getSellerRequests } from "@/lib/seller-data";
import { selectOwnedPresence, sellerUrl } from "@/lib/seller-routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Solicitudes recibidas",
  robots: { index: false, follow: false },
};

export default async function SellerRequestsPage({
  searchParams,
}: PageProps<"/mi-pulperia/solicitudes">) {
  const query = await searchParams;
  const requestedId =
    typeof query.presence === "string" ? query.presence : null;
  const presences = await getOwnedPresences("/mi-pulperia/solicitudes");
  const presence = selectOwnedPresence(presences, requestedId);
  if (!presence) redirect("/vender");
  if (requestedId !== presence.id) {
    redirect(sellerUrl("/mi-pulperia/solicitudes", presence.id));
  }
  const requests = await getSellerRequests(presence.id);
  const openedRequests = requests.filter(
    (request) => request.status === "handoff_opened",
  ).length;
  const understoodRequests = requests.filter(
    (request) => request.seller_understood_at,
  ).length;

  return (
    <main className="detail-page seller-inbox">
      <p className="eyebrow">Trabajo del vendedor</p>
      <h1>Solicitudes recibidas</h1>
      <p className="back-link">
        <Link href={sellerUrl("/mi-pulperia", presence.id)}>
          <IconArrowLeft aria-hidden="true" size={17} stroke={1.8} />
          Volver a {presence.name}
        </Link>
      </p>
      <PresenceSelector
        presences={presences}
        activeId={presence.id}
        action="/mi-pulperia/solicitudes"
      />
      <p>
        Esta vista muestra la intención estructurada. Confirmar que la entendiste
        no significa aceptarla, cobrarla, vender ni prometer cumplimiento.
      </p>
      <section className="seller-inbox-summary" aria-label="Resumen de solicitudes">
        <div>
          <IconReceipt aria-hidden="true" size={22} stroke={1.8} />
          <span>
            <strong>{requests.length}</strong>
            preparadas
          </span>
        </div>
        <div>
          <IconMessage aria-hidden="true" size={22} stroke={1.8} />
          <span>
            <strong>{openedRequests}</strong>
            WhatsApp abierto
          </span>
        </div>
        <div>
          <IconCircleCheck aria-hidden="true" size={22} stroke={1.8} />
          <span>
            <strong>{understoodRequests}</strong>
            comprensión registrada
          </span>
        </div>
      </section>
      {query.ok === "understood" ? (
        <p role="status">Confirmación de comprensión registrada.</p>
      ) : null}
      {query.error ? (
        <p role="alert">No se pudo registrar la confirmación.</p>
      ) : null}
      {requests.length === 0 ? (
        <div className="empty-state seller-empty-state">
          <IconInbox aria-hidden="true" size={30} stroke={1.7} />
          <div>
            <strong>No hay solicitudes preparadas</strong>
            <p>
              Cuando un cliente prepare un pedido para {presence.name}, aparecerá
              acá con el detalle antes de cualquier conversación en WhatsApp.
            </p>
            <Link href={sellerUrl("/mi-pulperia", presence.id)}>
              Volver al panel
            </Link>
          </div>
        </div>
      ) : (
        requests.map((request) => (
          <article
            className="seller-request-card"
            id={`solicitud-${request.seller_request_id}`}
            key={request.seller_request_id}
            tabIndex={-1}
          >
            <header className="seller-request-card__header">
              <div>
                <p className="eyebrow">
                  {request.status === "handoff_opened"
                    ? "WhatsApp abierto"
                    : "Pedido preparado"}
                </p>
                <h2>Solicitud preparada</h2>
                <p>
                  Referencia {request.seller_request_id.slice(0, 8)} · preparada el{" "}
                  {new Date(request.prepared_at).toLocaleString("es-HN")}
                </p>
              </div>
              <span className={`status-badge is-${request.status}`}>
                {request.status === "handoff_opened"
                  ? "WhatsApp abierto"
                  : "Preparada"}
              </span>
            </header>
            <h3>Qué necesita la persona</h3>
            <ul className="handoff-items">
              {request.items.map((item, index) => (
                <li key={`${request.seller_request_id}-${index}`}>
                  <strong>{item.title}</strong>
                  <p>{OFFER_CLASS_LABEL[item.offer_class]}</p>
                  <p>
                    {formatRequestDetails(item.offer_class, item.request, item.unit)}
                  </p>
                  <p>
                    {formatPublishedPrice(item.price_cents, item.price_mode, item.unit)} ·{" "}
                    {item.fulfillment_modes
                      .map((mode) => FULFILLMENT_MODE_LABEL[mode])
                      .join(", ")}
                  </p>
                  <p>
                    Contexto confirmado el{" "}
                    {new Date(item.confirmed_at).toLocaleString("es-HN")}
                  </p>
                </li>
              ))}
            </ul>
            {request.seller_understood_at ? (
              <p>
                Registraste que entendiste esta solicitud el{" "}
                {new Date(request.seller_understood_at).toLocaleString("es-HN")}.
              </p>
            ) : request.handoff_opened_at ? (
              <form action={confirmRequestUnderstoodAction}>
                <input
                  type="hidden"
                  name="presence_id"
                  value={presence.id}
                />
                <input
                  type="hidden"
                  name="seller_request_id"
                  value={request.seller_request_id}
                />
                <button type="submit">Confirmar que entendí la solicitud</button>
              </form>
            ) : (
              <p>
                El comprador todavía no abrió WhatsApp desde La Pulpería; no se
                puede afirmar que haya enviado el mensaje.
              </p>
            )}
          </article>
        ))
      )}
    </main>
  );
}
