import { describe, expect, it } from "vitest";
import {
  acceptCurrentContext,
  contextChanged,
  formatRequestedQuantity,
  isValidSelectionQuantity,
  parseSelection,
  removeSelection,
  selectionNeedsOfferReview,
  selectionToPrepareItems,
  upsertSelection,
  type SelectionLine,
} from "./selection";
import type { CatalogOffer } from "./catalog";

const line: SelectionLine = {
  offerId: "10000000-0000-0000-0000-000000000020",
  offerClass: "stocked_product",
  request: { quantity: 2 },
  listedPriceCents: 3500,
  listedPriceMode: "fixed",
  listedUnit: "bolsa",
  listedAvailabilityState: "available",
  listedConfirmedAt: "2026-08-22T00:00:00.000Z",
  requestContextToken: "a".repeat(64),
};

const live: CatalogOffer = {
  id: line.offerId,
  slug: "zambos-picantes-el-pino",
  offer_class: "stocked_product",
  title: "Zambos picantes",
  description: "Bolsa local",
  price_cents: 4000,
  price_mode: "fixed",
  unit: "bolsa",
  availability_model: "stock",
  availability_state: "limited",
  availability_details: {},
  confirmed_at: "2026-08-30T12:00:00.000Z",
  presence_id: "10000000-0000-0000-0000-000000000010",
  presence_slug: "el-pino",
  presence_name: "Pulpería El Pino",
  presence_mode: "fixed_location",
  coverage_label: null,
  service_territory: null,
  fulfillment_modes: ["direct_agreement"],
  request_context_token: "b".repeat(64),
};

describe("selection", () => {
  it("ignores corrupt or v1 storage", () => {
    expect(parseSelection("nope")).toEqual([]);
    expect(parseSelection('[{"offerId":"old","quantity":2}]')).toEqual([]);
  });

  it("replaces the request for the same offer", () => {
    const next = upsertSelection([line], {
      ...line,
      request: { quantity: 3 },
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.request).toEqual({ quantity: 3 });
  });

  it("accepts bounded quantities with up to three decimals", () => {
    expect(isValidSelectionQuantity(0.5)).toBe(true);
    expect(isValidSelectionQuantity(1.25)).toBe(true);
    expect(isValidSelectionQuantity(0)).toBe(false);
    expect(isValidSelectionQuantity(-1)).toBe(false);
    expect(isValidSelectionQuantity(Number.NaN)).toBe(false);
    expect(isValidSelectionQuantity(1.0001)).toBe(false);
    expect(isValidSelectionQuantity(10_000)).toBe(true);
    expect(isValidSelectionQuantity(10_000.001)).toBe(false);
    expect(formatRequestedQuantity(0.5, "libra")).toBe("0.5 libra");
    expect(formatRequestedQuantity(1.25, "kg")).toBe("1.25 kg");
    expect(formatRequestedQuantity(1, null)).toBe("1");
  });

  it("maps only offer and class-specific request for the prepare RPC", () => {
    expect(selectionToPrepareItems([line])).toEqual([
      {
        offer_id: line.offerId,
        request: { quantity: 2 },
        context: { request_context_token: line.requestContextToken },
      },
    ]);
  });

  it("requires the buyer to accept refreshed context before preparation", () => {
    expect(contextChanged(line, live)).toBe(true);
    const accepted = acceptCurrentContext([line], live);
    expect(contextChanged(accepted[0]!, live)).toBe(false);
    expect(accepted[0]).toMatchObject({
      listedPriceCents: 4000,
      listedUnit: "bolsa",
      listedAvailabilityState: "limited",
      listedConfirmedAt: live.confirmed_at,
      requestContextToken: live.request_context_token,
    });
  });

  it("keeps legacy storage visible but requires returning to the offer", () => {
    const legacy = { ...line };
    delete legacy.listedUnit;
    delete legacy.requestContextToken;
    const parsed = parseSelection(JSON.stringify([legacy]));
    expect(parsed).toHaveLength(1);
    expect(selectionNeedsOfferReview(parsed[0]!)).toBe(true);
  });

  it("removes one offer without changing the remaining selection", () => {
    const other = { ...line, offerId: "10000000-0000-0000-0000-000000000021" };
    expect(removeSelection([line, other], line.offerId)).toEqual([other]);
  });
});
