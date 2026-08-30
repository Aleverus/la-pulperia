import { describe, expect, it } from "vitest";
import {
  parseSelection,
  selectionToPrepareItems,
  upsertSelection,
  type SelectionLine,
} from "./selection";

const line: SelectionLine = {
  offerId: "10000000-0000-0000-0000-000000000020",
  offerClass: "stocked_product",
  request: { quantity: 2 },
  listedPriceCents: 3500,
  listedPriceMode: "fixed",
  listedAvailabilityState: "available",
  listedConfirmedAt: "2026-08-22T00:00:00.000Z",
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

  it("maps only offer and class-specific request for the prepare RPC", () => {
    expect(selectionToPrepareItems([line])).toEqual([
      { offer_id: line.offerId, request: { quantity: 2 } },
    ]);
  });
});
