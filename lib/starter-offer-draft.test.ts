import { describe, expect, it } from "vitest";
import {
  emptyStarterOfferDraft,
  parseStarterOfferDraft,
  starterOfferDraftFromForm,
} from "./starter-offer-draft";

describe("starter offer draft", () => {
  it("starts without an attributed fulfillment default", () => {
    expect(emptyStarterOfferDraft().fulfillments).toEqual([]);
  });

  it("keeps only the known private draft fields", () => {
    const form = new FormData();
    form.set("offer_class", "local_service");
    form.set("title", "Reparación de licuadoras");
    form.set("description", "Diagnóstico y reparación local");
    form.set("price_mode", "quote");
    form.set("availability_state", "on_request");
    form.set("requirements", "Modelo y falla observada");
    form.append("fulfillment_modes", "appointment");
    form.append("fulfillment_modes", "unknown");
    form.set("whatsapp", "99993333");

    expect(starterOfferDraftFromForm(form)).toMatchObject({
      offerClass: "local_service",
      title: "Reparación de licuadoras",
      priceMode: "quote",
      availabilityState: "on_request",
      requirements: "Modelo y falla observada",
      fulfillments: ["appointment"],
    });
    expect(starterOfferDraftFromForm(form)).not.toHaveProperty("whatsapp");
  });

  it("rejects unknown versions and invalid contract values", () => {
    expect(parseStarterOfferDraft({ version: 2 })).toBeNull();
    expect(
      parseStarterOfferDraft({
        ...emptyStarterOfferDraft(),
        offerClass: "invented",
      }),
    ).toBeNull();
  });
});
