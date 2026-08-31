import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security-headers";

describe("security headers", () => {
  it("allows only the configured runtime origins and map worker needs", () => {
    const headers = buildSecurityHeaders(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://catalog.example.supabase.co/path",
        NEXT_PUBLIC_PMTILES_URL: "https://maps.example/siguatepeque.pmtiles",
      },
      false,
    );
    const csp = headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;

    expect(csp).toContain("https://catalog.example.supabase.co");
    expect(csp).toContain("https://maps.example");
    expect(csp).toContain("https://protomaps.github.io");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("keeps development HMR without upgrading loopback requests", () => {
    const headers = buildSecurityHeaders(
      { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" },
      true,
    );
    const csp = headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(headers).toContainEqual({
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self)",
    });
  });

  it("does not upgrade a local Supabase origin in a production build", () => {
    const headers = buildSecurityHeaders(
      { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" },
      false,
    );
    const csp = headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;

    expect(csp).toContain("http://127.0.0.1:54321");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
