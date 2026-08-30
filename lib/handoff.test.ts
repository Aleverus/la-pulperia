import { describe, expect, it } from "vitest";
import { HANDOFF_DISCLAIMER, composeHandoffMessage } from "./handoff";

const message = composeHandoffMessage({
  sellerName: "Pulpería El Pino",
  buyerName: "Ana López",
  referenceId: "sol-1a2b",
  referenceUrl: "https://lapulperia.hn/cuenta/solicitudes/sol-1a2b",
  items: [
    {
      title: "Zambos picantes",
      offerClass: "stocked_product",
      request: { quantity: 2 },
      priceCents: 3500,
      priceMode: "fixed",
      fulfillmentModes: ["direct_agreement"],
    },
    {
      title: "Queso seco",
      offerClass: "stocked_product",
      request: { quantity: 1 },
      priceCents: 8000,
      priceMode: "from",
      fulfillmentModes: ["direct_agreement"],
    },
  ],
});

describe("composeHandoffMessage", () => {
  it("names the seller, buyer, listed prices, and reference", () => {
    expect(message).toContain("Pulpería El Pino");
    expect(message).toContain("Ana López");
    expect(message).toContain("2 × Zambos picantes (L 35.00 publicado)");
    expect(message).toContain("1 × Queso seco (desde L 80.00 publicado)");
    expect(message).toContain("sol-1a2b");
  });

  it("states that closing happens with the seller", () => {
    expect(message).toContain(HANDOFF_DISCLAIMER);
  });

  it("never claims a sale, an accepted order, or a sent message", () => {
    expect(message.toLowerCase()).not.toMatch(/venta|pedido aceptado|mensaje enviado/);
  });
});
