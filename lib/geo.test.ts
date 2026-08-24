import { describe, expect, it } from "vitest";
import {
  classifyGeolocation,
  haversineMeters,
  projectToMap,
  unprojectFromMap,
  withinSiguatepeque,
} from "./geo";

describe("withinSiguatepeque", () => {
  it("accepts the seeded physical pin", () => {
    expect(withinSiguatepeque(14.5969, -87.831)).toBe(true);
  });

  it("rejects a point well outside the city box", () => {
    expect(withinSiguatepeque(14.09, -87.19)).toBe(false);
  });
});

describe("classifyGeolocation", () => {
  it("maps browser permission denial", () => {
    expect(classifyGeolocation({ errorCode: 1 })).toBe("permission_denied");
  });

  it("maps missing or failed GPS as unavailable", () => {
    expect(classifyGeolocation({ errorCode: 2 })).toBe("unavailable");
    expect(classifyGeolocation({})).toBe("unavailable");
  });

  it("flags coordinates outside the operating box", () => {
    expect(classifyGeolocation({ lat: 14.09, lng: -87.19, accuracyM: 12 })).toBe(
      "out_of_coverage",
    );
  });

  it("flags a coarse reading inside the city", () => {
    expect(
      classifyGeolocation({ lat: 14.5969, lng: -87.831, accuracyM: 800 }),
    ).toBe("imprecise");
  });

  it("accepts a precise reading inside the city", () => {
    expect(
      classifyGeolocation({ lat: 14.5969, lng: -87.831, accuracyM: 20 }),
    ).toBeNull();
  });
});

describe("map projection", () => {
  it("round-trips a city pin", () => {
    const projected = projectToMap(14.5969, -87.831);
    const back = unprojectFromMap(projected.x, projected.y);
    expect(back.lat).toBeCloseTo(14.5969, 3);
    expect(back.lng).toBeCloseTo(-87.831, 3);
  });
});

describe("haversineMeters", () => {
  it("is ~0 for the same point", () => {
    const p = { lat: 14.5969, lng: -87.831 };
    expect(haversineMeters(p, p)).toBeLessThan(1);
  });
});
