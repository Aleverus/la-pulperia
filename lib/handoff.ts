import { formatPublishedPrice, type PriceMode } from "./money";

export const HANDOFF_DISCLAIMER =
  "Disponibilidad, precio final, pago y entrega se confirman directamente con el vendedor";

export type HandoffItem = {
  title: string;
  quantity: number;
  priceCents: number;
  priceMode: PriceMode;
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
    ...input.items.map((item) => {
      const price = formatPublishedPrice(item.priceCents, item.priceMode);
      return `• ${item.quantity} × ${item.title} (${price} publicado)`;
    }),
    "",
    `Referencia: ${input.referenceId}`,
    input.referenceUrl,
    "",
    HANDOFF_DISCLAIMER,
  ];

  return lines.join("\n");
}
