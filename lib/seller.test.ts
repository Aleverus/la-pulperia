import { describe, expect, it } from "vitest";
import { formErrorMessage, parseLocation } from "./seller";

describe("parseLocation", () => {
  it("reads a GeoJSON point as lat/lng", () => {
    expect(
      parseLocation({ type: "Point", coordinates: [-87.831, 14.5969] }),
    ).toEqual({ lat: 14.5969, lng: -87.831 });
  });

  it("reads WKT", () => {
    expect(parseLocation("POINT(-87.831 14.5969)")).toEqual({
      lat: 14.5969,
      lng: -87.831,
    });
  });
});

describe("formErrorMessage", () => {
  it("asks to reconcile price mode and amount", () => {
    expect(formErrorMessage("price")).toMatch(/modalidad y el precio/);
  });
});
