import { describe, expect, it } from "vitest";
import {
  parseSessionLocation,
  serializeSessionLocation,
} from "@/lib/session-location";

describe("ephemeral search location", () => {
  it("round-trips only a point inside Siguatepeque", () => {
    expect(
      parseSessionLocation(
        serializeSessionLocation({ lat: 14.5969, lng: -87.831 }),
      ),
    ).toEqual({ lat: 14.5969, lng: -87.831 });
    expect(parseSessionLocation("14.09,-87.19")).toBeNull();
    expect(parseSessionLocation("NaN,-87.831")).toBeNull();
  });

  it("rejects extra or malformed values", () => {
    expect(parseSessionLocation("14.6,-87.8,extra")).toBeNull();
    expect(parseSessionLocation(undefined)).toBeNull();
  });
});
