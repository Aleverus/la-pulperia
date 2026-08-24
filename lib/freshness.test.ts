import { describe, expect, it } from "vitest";
import { FRESHNESS_LABEL, freshnessBand } from "./freshness";

const now = new Date("2026-08-22T12:00:00.000Z");

describe("freshnessBand", () => {
  it("treats up to 7 days as recent", () => {
    expect(freshnessBand(new Date("2026-08-22T12:00:00.000Z"), now)).toBe(
      "recent",
    );
    expect(freshnessBand(new Date("2026-08-15T12:00:00.000Z"), now)).toBe(
      "recent",
    );
  });

  it("treats 8 to 30 days as needing confirmation", () => {
    expect(freshnessBand(new Date("2026-08-14T12:00:00.000Z"), now)).toBe(
      "confirm",
    );
    expect(freshnessBand(new Date("2026-07-23T12:00:00.000Z"), now)).toBe(
      "confirm",
    );
  });

  it("treats more than 30 days as stale", () => {
    expect(freshnessBand(new Date("2026-07-22T11:59:59.000Z"), now)).toBe(
      "stale",
    );
  });
});

describe("FRESHNESS_LABEL", () => {
  it("uses public copy, not a stock claim", () => {
    expect(FRESHNESS_LABEL.recent).toBe("Confirmada recientemente");
    expect(FRESHNESS_LABEL.confirm).toBe("Conviene confirmar");
    expect(FRESHNESS_LABEL.stale).toBe("Información antigua");
  });
});
