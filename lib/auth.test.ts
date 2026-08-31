import { describe, expect, it } from "vitest";
import { safeAuthNext } from "@/lib/auth";

describe("safeAuthNext", () => {
  it("keeps local destinations", () => {
    expect(safeAuthNext("/cuenta/solicitudes?desde=carrito")).toBe(
      "/cuenta/solicitudes?desde=carrito",
    );
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeAuthNext("https://example.com")).toBe("/carrito");
    expect(safeAuthNext("//example.com")).toBe("/carrito");
  });

  it("supports a route-specific fallback", () => {
    expect(safeAuthNext("invalid", "/")).toBe("/");
  });
});
