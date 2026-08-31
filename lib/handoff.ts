import {
  FULFILLMENT_MODE_LABEL,
  type FulfillmentMode,
  type OfferClass,
} from "./catalog";
import { formatPublishedPrice, type PriceMode } from "./money";
import { formatRequestedQuantity, type SelectionRequest } from "./selection";

export const HANDOFF_DISCLAIMER =
  "Disponibilidad, precio final, pago y cumplimiento se confirman directamente con el vendedor";

export type HandoffItem = {
  title: string;
  offerClass: OfferClass;
  request: SelectionRequest;
  priceCents: number | null;
  priceMode: PriceMode;
  unit: string | null;
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
    "Quiero pedir lo siguiente:",
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
  const price = formatPublishedPrice(item.priceCents, item.priceMode, item.unit);
  const request = item.request as Record<string, unknown>;
  const priceContext = item.priceMode === "quote" ? price : `${price} publicado`;
  const fulfillment = item.fulfillmentModes
    .map((mode) => FULFILLMENT_MODE_LABEL[mode])
    .join(", ");
  if (item.offerClass === "stocked_product") {
    const substitution =
      request.substitution_ok === true
        ? "; acepta propuesta de sustituto"
        : "; sin sustituto solicitado";
    return `• Producto: ${formatRequestedQuantity(Number(request.quantity), item.unit)} de ${clean(item.title)}${substitution} (${priceContext}; ${fulfillment})`;
  }
  if (item.offerClass === "scheduled_food") {
    const variant = request.variant ? `; detalle: ${clean(request.variant)}` : "";
    return `• Encargo: ${formatRequestedQuantity(Number(request.quantity), item.unit)} de ${clean(item.title)}${variant}; ventana deseada ${formatDate(String(request.requested_window_start))}–${formatDate(String(request.requested_window_end))} (${priceContext}; ${fulfillment})`;
  }
  if (item.offerClass === "local_service") {
    const appointment = request.appointment_preference
      ? `; cita: ${clean(request.appointment_preference)}`
      : "";
    const locality = request.approximate_locality
      ? `; zona aproximada: ${clean(request.approximate_locality)}`
      : "";
    return `• Servicio: ${clean(item.title)}; necesidad: ${clean(request.scope)}${appointment}${locality} (${priceContext}; ${fulfillment})`;
  }
  const plan = request.plan ? `; plan o formato: ${clean(request.plan)}` : "";
  const reference = request.reference_url
    ? `; referencia: ${clean(request.reference_url)}`
    : "";
  return `• Oferta digital: ${clean(item.title)}; alcance: ${clean(request.scope)}${plan}${reference} (${priceContext}; ${fulfillment})`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("es-HN", { dateStyle: "short", timeStyle: "short" });
}

function clean(value: unknown): string {
  return String(value).replace(/\s+/g, " ").trim();
}
