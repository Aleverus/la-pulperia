import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { HandoffButton } from "@/app/_components/HandoffButton";
import { composeHandoffMessage } from "@/lib/handoff";
import {
  FULFILLMENT_MODE_LABEL,
  OFFER_CLASS_LABEL,
  type FulfillmentMode,
  type OfferClass,
} from "@/lib/catalog";
import { formatPublishedPrice, type PriceMode } from "@/lib/money";
import {
  formatRequestDetails,
  type SelectionRequest,
} from "@/lib/selection";
import { waMeUrl } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pedidos por vendedor",
  robots: { index: false, follow: false },
};

type HandoffPayload = {
  seller_request_id: string;
  batch_id: string;
  status: "prepared" | "handoff_opened";
  handoff_opened_at: string | null;
  seller_understood_at: string | null;
  destination_e164: string;
  presence_name: string;
  buyer_name: string;
  items: Array<{
    title: string;
    offer_class: OfferClass;
    request: SelectionRequest;
    price_cents: number | null;
    price_mode: PriceMode;
    unit: string | null;
    fulfillment_modes: FulfillmentMode[];
    confirmed_at: string;
  }>;
};

export default async function SolicitudPage({
  params,
}: PageProps<"/cuenta/solicitudes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("request_batches")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!batch) notFound();

  const { data: requests } = await supabase
    .from("seller_requests")
    .select("id, status")
    .eq("batch_id", id);
  if (!requests || requests.length === 0) notFound();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "http://127.0.0.1:3001";
  const referenceUrl = `${origin}/cuenta/solicitudes/${id}`;

  const cards = [];
  for (const request of requests) {
    const { data, error } = await supabase.rpc("get_handoff", {
      p_seller_request_id: request.id,
    });
    if (error || !data) notFound();
    const payload = data as HandoffPayload;
    const message = composeHandoffMessage({
      sellerName: payload.presence_name,
      buyerName: payload.buyer_name,
      referenceId: payload.seller_request_id.slice(0, 8),
      referenceUrl,
      items: payload.items.map((item) => ({
        title: item.title,
        offerClass: item.offer_class,
        request: item.request,
        priceCents: item.price_cents,
        priceMode: item.price_mode,
        unit: item.unit,
        fulfillmentModes: item.fulfillment_modes,
      })),
    });
    cards.push({
      payload,
      href: waMeUrl(payload.destination_e164, message),
    });
  }

  return (
    <main className="detail-page request-detail-page workspace-page">
      <p className="eyebrow">Tu cuenta</p>
      <h1>Pedidos por vendedor</h1>
      <p className="back-link">
        <Link href="/cuenta/solicitudes">
          <IconArrowLeft aria-hidden="true" size={17} stroke={1.8} />
          Volver al historial
        </Link>
      </p>
      <p>
        La Pulpería armó un mensaje por vendedor. Abrí cada WhatsApp para
        revisarlo y enviarlo. Prepararlo no significa que el pedido fue enviado,
        aceptado o pagado.
      </p>
      {cards.map(({ payload, href }) => (
        <section className="handoff-card" key={payload.seller_request_id}>
          <h2>{payload.presence_name}</h2>
          <p>Referencia {payload.seller_request_id.slice(0, 8)}</p>
          <ul className="handoff-items">
            {payload.items.map((item, index) => (
              <li key={`${item.title}-${index}`}>
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
                  {formatDate(item.confirmed_at)}
                </p>
              </li>
            ))}
          </ul>
          <p className="request-status-line">
            <span
              className={`status-badge is-${
                payload.status === "handoff_opened" ? "published" : "draft"
              }`}
            >
              {payload.status === "handoff_opened"
                ? "WhatsApp abierto"
                : "Pedido preparado"}
            </span>
          </p>
          <p>
            {payload.seller_understood_at
              ? "El vendedor confirmó voluntariamente que entendió el pedido."
              : "El vendedor todavía no confirmó que entendió el pedido."}
          </p>
          <HandoffButton
            sellerRequestId={payload.seller_request_id}
            sellerName={payload.presence_name}
            href={href}
          />
        </section>
      ))}
      <p>
        Disponibilidad, precio final, pago y entrega se confirman directamente
        con el vendedor.
      </p>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Tegucigalpa",
  }).format(new Date(value));
}
