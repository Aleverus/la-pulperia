import { describe, expect, it } from "vitest";
import {
  availabilitySchemaUrl,
  metadataDescription,
  normalizeSiteOrigin,
} from "./site";

describe("site metadata helpers", () => {
  it("accepts only an HTTP public origin and strips paths", () => {
    expect(normalizeSiteOrigin("https://pulperia.example/ruta")).toBe(
      "https://pulperia.example",
    );
    expect(normalizeSiteOrigin("javascript:alert(1)")).toBe(
      "http://127.0.0.1:3001",
    );
  });

  it("keeps descriptions within the search snippet budget", () => {
    expect(metadataDescription("  oferta   local ")).toBe("oferta local");
    expect(metadataDescription("x".repeat(180))).toHaveLength(158);
  });

  it("maps availability without claiming guaranteed inventory", () => {
    expect(availabilitySchemaUrl("available")).toBe(
      "https://schema.org/InStock",
    );
    expect(availabilitySchemaUrl("limited")).toBe(
      "https://schema.org/LimitedAvailability",
    );
    expect(availabilitySchemaUrl("unavailable")).toBe(
      "https://schema.org/OutOfStock",
    );
    expect(availabilitySchemaUrl("on_request")).toBeNull();
  });
});
