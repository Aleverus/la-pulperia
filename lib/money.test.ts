import { describe, expect, it } from "vitest";
import { formatHnl, formatPublishedPrice, parseLempirasToCents } from "./money";

describe("formatHnl", () => {
  it("formats positive integer cents as lempiras", () => {
    expect(formatHnl(3500)).toBe("L 35.00");
    expect(formatHnl(1)).toBe("L 0.01");
  });

  it("rejects missing or non-positive prices", () => {
    expect(() => formatHnl(0)).toThrow("price_cents_invalid");
    expect(() => formatHnl(-100)).toThrow("price_cents_invalid");
    expect(() => formatHnl(12.5)).toThrow("price_cents_invalid");
  });
});

describe("parseLempirasToCents", () => {
  it("reads a positive HNL figure into cents", () => {
    expect(parseLempirasToCents("35")).toBe(3500);
    expect(parseLempirasToCents("35.50")).toBe(3550);
  });

  it("rejects missing or zero prices", () => {
    expect(parseLempirasToCents("")).toBeNull();
    expect(parseLempirasToCents("0")).toBeNull();
    expect(parseLempirasToCents("consultar")).toBeNull();
  });
});

describe("formatPublishedPrice", () => {
  it("keeps the listed figure and the from prefix", () => {
    expect(formatPublishedPrice(8000, "fixed")).toBe("L 80.00");
    expect(formatPublishedPrice(8000, "from")).toBe("desde L 80.00");
    expect(formatPublishedPrice(null, "quote")).toBe("Cotización");
  });
});
