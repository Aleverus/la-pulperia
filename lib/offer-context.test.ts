import { describe, expect, it } from "vitest";
import {
  offerAvailabilitySummary,
  offerFreshnessSummary,
  offerFulfillmentSummary,
  offerNextStep,
  offerPresenceSummary,
  isOfferEffectivelyAvailable,
  requestedWindowIssue,
} from "@/lib/offer-context";

describe("public offer context", () => {
  it("explains a scheduled-food window and cutoff", () => {
    const summary = offerAvailabilitySummary({
      offer_class: "scheduled_food",
      availability_model: "window",
      availability_state: "limited",
      availability_details: {
        starts_at: "2030-01-10T14:00:00-06:00",
        ends_at: "2030-01-10T17:00:00-06:00",
        cutoff_at: "2030-01-10T12:00:00-06:00",
        capacity_note: "Cupo de prueba",
      },
    });

    expect(summary).toContain("Ventana publicada con capacidad limitada");
    expect(summary).toContain("Ventana:");
    expect(summary).toContain("Pedido antes de");
    expect(summary).toContain("Cupo de prueba");
  });

  it("distinguishes fixed, mobile, and remote presence", () => {
    expect(
      offerPresenceSummary({
        presence_mode: "fixed_location",
        coverage_label: null,
        service_territory: null,
      }),
    ).toContain("ubicación fija");
    expect(
      offerPresenceSummary({
        presence_mode: "mobile",
        coverage_label: "Barrios del centro",
        service_territory: null,
      }),
    ).toBe("Barrios del centro");
    expect(
      offerPresenceSummary({
        presence_mode: "remote",
        coverage_label: null,
        service_territory: "Honduras",
      }),
    ).toBe("Honduras");
  });

  it("keeps a seller stock note visible without turning it into a guarantee", () => {
    expect(
      offerAvailabilitySummary({
        offer_class: "stocked_product",
        availability_model: "stock",
        availability_state: "limited",
        availability_details: { stock_note: "Quedan pocas bolsas" },
      }),
    ).toBe("Existencia publicada como limitada. Quedan pocas bolsas");
  });

  it("uses class-specific next steps and fulfillment labels", () => {
    expect(offerNextStep("stocked_product")).toContain("cantidad");
    expect(offerNextStep("scheduled_food")).toContain("ventana");
    expect(offerNextStep("local_service")).toContain("cita");
    expect(offerNextStep("digital_offer")).toContain("alcance o plan");
    expect(offerFulfillmentSummary(["appointment", "digital_delivery"])).toBe(
      "cita, entrega digital",
    );
  });

  it("states the uncertainty of old information", () => {
    const now = new Date("2026-08-30T12:00:00.000Z");
    expect(
      offerFreshnessSummary("2026-08-29T12:00:00.000Z", now),
    ).toContain("últimos 7 días");
    expect(
      offerFreshnessSummary("2026-08-15T12:00:00.000Z", now),
    ).toContain("entre 8 y 30 días");
    expect(
      offerFreshnessSummary("2026-07-01T12:00:00.000Z", now),
    ).toContain("más de 30 días");
  });

  it("closes scheduled food exactly at cutoff or window end", () => {
    const offer = {
      offer_class: "scheduled_food" as const,
      availability_model: "window" as const,
      availability_state: "available" as const,
      availability_details: {
        starts_at: "2030-01-10T14:00:00-06:00",
        ends_at: "2030-01-10T17:00:00-06:00",
        cutoff_at: "2030-01-10T12:00:00-06:00",
      },
    };
    expect(
      isOfferEffectivelyAvailable(
        offer,
        new Date("2030-01-10T11:59:59-06:00"),
      ),
    ).toBe(true);
    expect(
      isOfferEffectivelyAvailable(
        offer,
        new Date("2030-01-10T12:00:00-06:00"),
      ),
    ).toBe(false);
    expect(
      offerAvailabilitySummary(
        offer,
        new Date("2030-01-10T17:00:00-06:00"),
      ),
    ).toContain("ya cerró");
  });

  it("accepts only a real subwindow while the offer remains open", () => {
    const details = {
      starts_at: "2030-01-10T14:00:00-06:00",
      ends_at: "2030-01-10T17:00:00-06:00",
      cutoff_at: "2030-01-10T12:00:00-06:00",
    };
    const now = new Date("2030-01-10T11:00:00-06:00");
    expect(
      requestedWindowIssue(
        details,
        "2030-01-10T15:00:00-06:00",
        "2030-01-10T16:00:00-06:00",
        now,
      ),
    ).toBeNull();
    expect(
      requestedWindowIssue(
        details,
        "2030-01-10T13:00:00-06:00",
        "2030-01-10T16:00:00-06:00",
        now,
      ),
    ).toBe("outside");
    expect(
      requestedWindowIssue(
        details,
        "2030-01-10T16:00:00-06:00",
        "2030-01-10T15:00:00-06:00",
        now,
      ),
    ).toBe("outside");
    expect(
      requestedWindowIssue(
        details,
        "2030-01-10T15:00:00-06:00",
        "2030-01-10T16:00:00-06:00",
        new Date("2030-01-10T12:00:00-06:00"),
      ),
    ).toBe("closed");
  });

  it("shows complete schedule context for service and digital offers", () => {
    const summary = offerAvailabilitySummary({
      offer_class: "digital_offer",
      availability_model: "schedule",
      availability_state: "limited",
      availability_details: {
        next_available_at: "2030-01-12T09:00:00-06:00",
        schedule_note: "Entrega en dos días hábiles",
      },
    });
    expect(summary).toContain("Próxima disponibilidad");
    expect(summary).toContain("Entrega en dos días hábiles");
  });
});
