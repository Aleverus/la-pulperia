import { describe, expect, it } from "vitest";
import type { OwnedPresence } from "@/lib/seller";
import { selectOwnedPresence, sellerUrl } from "@/lib/seller-routing";

const presence = (id: string, name: string): OwnedPresence => ({
  id,
  name,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  description: "",
  mode: "mobile",
  whatsapp_e164: "+50499991111",
  coverage_label: "Siguatepeque",
  service_territory: null,
  status: "published",
  location_public_confirmed: false,
  lat: null,
  lng: null,
  whatsapp_verification_status: "verified",
  whatsapp_verified_at: "2026-08-30T00:00:00.000Z",
});

describe("seller presence routing", () => {
  const mobile = presence("10000000-0000-0000-0000-000000000011", "Móvil");
  const remote = presence("10000000-0000-0000-0000-000000000012", "Remota");

  it("returns no active presence for an empty account", () => {
    expect(selectOwnedPresence([], null)).toBeNull();
  });

  it("honors an explicitly owned presence", () => {
    expect(selectOwnedPresence([mobile, remote], remote.id)).toEqual(remote);
  });

  it("uses a deterministic owned fallback independent of RPC order", () => {
    expect(selectOwnedPresence([remote, mobile], "not-owned")).toEqual(mobile);
    expect(selectOwnedPresence([mobile, remote], null)).toEqual(mobile);
  });

  it("keeps the active presence in canonical seller links", () => {
    expect(sellerUrl("/mi-pulperia/ofertas/nueva", remote.id, { error: "save" }))
      .toBe(`/mi-pulperia/ofertas/nueva?presence=${remote.id}&error=save`);
  });
});
