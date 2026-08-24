import { describe, expect, it } from "vitest";
import { cartToPrepareItems, parseCart, upsertLine, type CartLine } from "./cart";

const line: CartLine = {
  offerId: "10000000-0000-0000-0000-000000000020",
  quantity: 2,
  listedPriceCents: 3500,
  listedPriceMode: "fixed",
  listedAvailability: "available",
  listedConfirmedAt: "2026-08-22T00:00:00.000Z",
};

describe("cart", () => {
  it("ignores corrupt storage", () => {
    expect(parseCart("nope")).toEqual([]);
    expect(parseCart("[]")).toEqual([]);
  });

  it("replaces quantity for the same offer", () => {
    const next = upsertLine([line], { ...line, quantity: 3 });
    expect(next).toHaveLength(1);
    expect(next[0]?.quantity).toBe(3);
  });

  it("maps lines for the prepare RPC without extra fields", () => {
    expect(cartToPrepareItems([line])).toEqual([
      { offer_id: line.offerId, quantity: 2 },
    ]);
  });
});
