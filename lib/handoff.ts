import type { FulfillmentMode, OfferClass } from "./catalog";
import { formatPublishedPrice, type PriceMode } from "./money";
import type { SelectionRequest } from "./selection";

export const HANDOFF_DISCLAIMER =
  "Disponibilidad, precio final, pago y cumplimiento se confirman directamente con el vendedor";

export type HandoffItem = {
  title: string;
  offerClass: OfferClass;
  request: SelectionRequest;
  priceCents: number | null;
  priceMode: PriceMode;
  fulfillmentModes: FulfillmentMode[];
};

export function composeHandoffMessage(input: {
  sellerName: string;
  buyerName: string;
  referenceId: string;
  referenceUrl: string;
  items: HandoffItem[];
}): string {
  const lines = [
    `Hola, ${input.sellerName}.`,
    `Soy ${input.buyerName} y te escribo desde La Pulpería.`,
    "",
    "Quiero consultar:",
    ...input.items.map(formatItem),
    "",
    `Referencia: ${input.referenceId}`,
    input.referenceUrl,
    "",
    HANDOFF_DISCLAIMER,
  ];
  return lines.join("\n");
}

function formatItem(item: HandoffItem): string {
  const price = formatPublishedPrice(item.priceCents, item.priceMode);
  const request = item.request as Record<string, unknown>;
  if (item.offerClass === "stocked_product") {
    return `• ${request.quantity} × ${item.title} (${price} publicado)`;
  }
  if (item.offerClass === "scheduled_food") {
    return `• ${request.quantity} × ${item.title}, ventana deseada ${formatDate(String(request.requested_window_start))}–${formatDate(String(request.requested_window_end))} (${price} publicado)`;
  }
  const label = item.offerClass === "local_service" ? "Servicio" : "Oferta digital";
  return `• ${label}: ${item.title}. Alcance: ${String(request.scope)} (${price})`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("es-HN", { dateStyle: "short", timeStyle: "short" });
}
