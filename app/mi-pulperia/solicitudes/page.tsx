import Link from "next/link";
import type { Metadata } from "next";
import { IconArrowLeft, IconInbox } from "@tabler/icons-react";
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

  return (
    <main className="detail-page seller-inbox">
      <p className="eyebrow">Panel de dueña</p>
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
            <strong>No hay solicitudes nuevas</strong>
            <p>
              Cuando un cliente prepare un pedido para {presence.name}, aparecerá
              acá con el detalle antes de cualquier conversación en WhatsApp.
            </p>
          </div>
        </div>
      ) : (
        requests.map((request) => (
          <article className="seller-request-card" key={request.seller_request_id}>
            <h2>{request.presence_name}</h2>
            <p>
              Referencia {request.seller_request_id.slice(0, 8)} · preparada el{" "}
              {new Date(request.prepared_at).toLocaleString("es-HN")}
            </p>
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
                Comprensión confirmada el{" "}
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
