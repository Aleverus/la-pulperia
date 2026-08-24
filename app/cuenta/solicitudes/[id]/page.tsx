import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HandoffButton } from "@/app/_components/HandoffButton";
import { composeHandoffMessage } from "@/lib/handoff";
import type { PriceMode } from "@/lib/money";
import { waMeUrl } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Solicitud por vendedor",
  robots: { index: false, follow: false },
};

type HandoffPayload = {
  seller_request_id: string;
  batch_id: string;
  status: "prepared" | "handoff_opened";
  destination_e164: string;
  presence_name: string;
  buyer_name: string;
  items: Array<{
    title: string;
    quantity: number;
    price_cents: number;
    price_mode: PriceMode;
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
        quantity: item.quantity,
        priceCents: item.price_cents,
        priceMode: item.price_mode,
      })),
    });
    cards.push({
      payload,
      href: waMeUrl(payload.destination_e164, message),
    });
  }

  return (
    <main>
      <h1>Solicitudes por vendedor</h1>
      <p>
        Abrí un WhatsApp por vendedor. Eso no es un mensaje enviado, un pedido
        aceptado ni una venta.
      </p>
      {cards.map(({ payload, href }) => (
        <section key={payload.seller_request_id}>
          <h2>{payload.presence_name}</h2>
          <ul>
            {payload.items.map((item) => (
              <li key={item.title}>
                {item.quantity} × {item.title}
              </li>
            ))}
          </ul>
          <p>
            Estado:{" "}
            {payload.status === "handoff_opened"
              ? "WhatsApp abierto"
              : "Solicitud preparada"}
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
