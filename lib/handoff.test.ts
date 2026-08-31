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
      request: { quantity: 2, substitution_ok: true },
      priceCents: 3500,
      priceMode: "fixed",
      unit: "bolsa",
      fulfillmentModes: ["direct_agreement"],
    },
    {
      title: "Queso seco",
      offerClass: "stocked_product",
      request: { quantity: 1 },
      priceCents: 8000,
      priceMode: "from",
      unit: "libra",
      fulfillmentModes: ["direct_agreement"],
    },
    {
      title: "Pan de tarde",
      offerClass: "scheduled_food",
      request: {
        quantity: 3,
        variant: "sin azúcar",
        requested_window_start: "2030-01-10T14:00:00-06:00",
        requested_window_end: "2030-01-10T17:00:00-06:00",
      },
      priceCents: 1800,
      priceMode: "fixed",
      unit: "unidad",
      fulfillmentModes: ["local_coverage"],
    },
    {
      title: "Armado de canastas",
      offerClass: "local_service",
      request: {
        scope: "Canasta para 20 personas",
        appointment_preference: "viernes por la tarde",
        approximate_locality: "barrio El Carmen",
      },
      priceCents: null,
      priceMode: "quote",
      unit: null,
      fulfillmentModes: ["appointment"],
    },
    {
      title: "Tarjeta digital",
      offerClass: "digital_offer",
      request: {
        scope: "Invitación de cumpleaños",
        plan: "formato cuadrado",
        reference_url: "https://example.com/referencia",
      },
      priceCents: null,
      priceMode: "quote",
      unit: null,
      fulfillmentModes: ["digital_delivery"],
    },
  ],
});

describe("composeHandoffMessage", () => {
  it("names the seller, buyer, listed prices, and reference", () => {
    expect(message).toContain("Pulpería El Pino");
    expect(message).toContain("Ana López");
    expect(message).toContain("Quiero pedir lo siguiente:");
    expect(message).toContain("2 bolsa de Zambos picantes; acepta propuesta de sustituto");
    expect(message).toContain("1 libra de Queso seco; sin sustituto solicitado");
    expect(message).toContain("detalle: sin azúcar");
    expect(message).toContain("cita: viernes por la tarde");
    expect(message).toContain("zona aproximada: barrio El Carmen");
    expect(message).toContain("plan o formato: formato cuadrado");
    expect(message).toContain("referencia: https://example.com/referencia");
    expect(message).toContain("Cotización; cita");
    expect(message).toContain("Cotización; entrega digital");
    expect(message).toContain("sol-1a2b");
  });

  it("states that closing happens with the seller", () => {
    expect(message).toContain(HANDOFF_DISCLAIMER);
  });

  it("never claims a sale, an accepted order, or a sent message", () => {
    expect(message.toLowerCase()).not.toMatch(/\bventa\b|pedido aceptado|mensaje enviado/);
  });
});
