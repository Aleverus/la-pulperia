import { describe, expect, it } from "vitest";
import { isE164, normalizeWhatsapp, waMeUrl, whatsappProbeMessage } from "./phone";

describe("isE164", () => {
  it("accepts a Honduran mobile number", () => {
    expect(isE164("+50499991111")).toBe(true);
  });

  it("rejects local or public display formats", () => {
    expect(isE164("9999-1111")).toBe(false);
    expect(isE164("50499991111")).toBe(false);
    expect(isE164("+504 9999 1111")).toBe(false);
  });
});

describe("normalizeWhatsapp", () => {
  it("accepts local eight-digit and +504 forms", () => {
    expect(normalizeWhatsapp("9999-3333")).toBe("+50499993333");
    expect(normalizeWhatsapp("50499993333")).toBe("+50499993333");
    expect(normalizeWhatsapp("+50499993333")).toBe("+50499993333");
  });

  it("rejects a truncated number", () => {
    expect(normalizeWhatsapp("9999")).toBeNull();
  });
});

describe("whatsappProbeMessage", () => {
  it("does not claim the number is verified", () => {
    const text = whatsappProbeMessage("Pulpería La Esquina");
    expect(text).toMatch(/volvé a La Pulpería y confirmalo/);
    expect(text).toMatch(/no lee este chat/);
    expect(text.toLowerCase()).not.toMatch(/verificado/);
  });
});

describe("waMeUrl", () => {
  it("builds a wa.me link without exposing a public tel: page", () => {
    const url = waMeUrl("+50499991111", "Hola");
    expect(url).toBe("https://wa.me/50499991111?text=Hola");
  });
});
