import { describe, expect, it } from "vitest";
import {
  countInactiveOffers,
  countOffersNeedingFreshness,
  getSellerOfferTasks,
} from "./seller-dashboard";
import type { OwnedOffer } from "./seller";

function offer(
  overrides: Partial<OwnedOffer> = {},
): OwnedOffer {
  return {
    id: "offer-id",
    slug: "oferta",
    offer_class: "stocked_product",
    title: "Oferta",
    description: "",
    price_cents: 1200,
    price_mode: "fixed",
    unit: "unidad",
    availability_model: "stock",
    availability_state: "available",
    availability_details: {},
    fulfillment_modes: ["pickup"],
    confirmed_at: "2026-08-29T12:00:00.000Z",
    status: "published",
    ...overrides,
  };
}

describe("getSellerOfferTasks", () => {
  it("puts stale published offers before catalog entries that need less attention", () => {
    const tasks = getSellerOfferTasks(
      [
        offer({ id: "recent", title: "Reciente" }),
        offer({
          id: "draft",
          title: "Borrador",
          status: "draft",
          confirmed_at: "2026-07-01T12:00:00.000Z",
        }),
        offer({
          id: "stale",
          title: "Antigua",
          confirmed_at: "2026-06-01T12:00:00.000Z",
        }),
      ],
      new Date("2026-08-30T12:00:00.000Z"),
    );

    expect(tasks.map(({ offer }) => offer.id)).toEqual([
      "stale",
      "draft",
      "recent",
    ]);
    expect(countOffersNeedingFreshness(tasks)).toBe(1);
    expect(countInactiveOffers(tasks)).toBe(1);
  });
});
