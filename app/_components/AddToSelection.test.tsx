/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToSelection } from "@/app/_components/AddToSelection";
import {
  parseSelection,
  SELECTION_STORAGE_KEY,
} from "@/lib/selection";

const mocks = vi.hoisted(() => ({
  recordPublicEventAction: vi.fn(),
}));

vi.mock("@/app/operation-actions", () => ({
  recordPublicEventAction: mocks.recordPublicEventAction,
}));

const baseProps = {
  offerId: "10000000-0000-0000-0000-000000000020",
  listedPriceCents: 3500,
  listedPriceMode: "fixed" as const,
  listedUnit: "unidad",
  listedAvailabilityState: "available" as const,
  listedConfirmedAt: "2026-08-30T12:00:00.000Z",
  requestContextToken: "a".repeat(64),
};

describe("AddToSelection validation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.recordPublicEventAction.mockReset();
  });

  afterEach(cleanup);

  it("explains an invalid product quantity instead of silently disabling", async () => {
    render(
      <AddToSelection
        {...baseProps}
        offerClass="stocked_product"
        availabilityDetails={{}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Cantidad"), {
      target: { value: "0" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar al carrito" }),
    );

    expect(screen.getByText(/Usá una cantidad entre/)).not.toBeNull();
    expect(parseSelection(window.localStorage.getItem(SELECTION_STORAGE_KEY))).toEqual(
      [],
    );
  });

  it("hydrates and preserves an existing cart request before updating it", async () => {
    window.localStorage.setItem(
      SELECTION_STORAGE_KEY,
      JSON.stringify([
        {
          offerId: baseProps.offerId,
          offerClass: "stocked_product",
          request: { quantity: 5, substitution_ok: true },
          listedPriceCents: baseProps.listedPriceCents,
          listedPriceMode: baseProps.listedPriceMode,
          listedUnit: baseProps.listedUnit,
          listedAvailabilityState: baseProps.listedAvailabilityState,
          listedConfirmedAt: baseProps.listedConfirmedAt,
          requestContextToken: baseProps.requestContextToken,
        },
      ]),
    );

    render(
      <AddToSelection
        {...baseProps}
        offerClass="stocked_product"
        availabilityDetails={{}}
      />,
    );

    const quantity = await screen.findByLabelText("Cantidad");
    await waitFor(() => {
      expect((quantity as HTMLInputElement).value).toBe("5");
    });
    expect(
      (screen.getByLabelText(
        "Acepto que me propongan un sustituto",
      ) as HTMLInputElement).checked,
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: "Actualizar carrito" }),
    );

    expect(
      parseSelection(window.localStorage.getItem(SELECTION_STORAGE_KEY))[0]
        ?.request,
    ).toEqual({ quantity: 5, substitution_ok: true });
  });

  it("accepts a valid requested subwindow after explaining missing dates", async () => {
    render(
      <AddToSelection
        {...baseProps}
        offerClass="scheduled_food"
        availabilityDetails={{
          starts_at: "2030-01-10T14:00:00-06:00",
          ends_at: "2030-01-10T17:00:00-06:00",
          cutoff_at: "2030-01-10T12:00:00-06:00",
        }}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar al carrito" }),
    );
    expect(
      screen.getByText("Elegí el inicio y el fin que necesitás."),
    ).not.toBeNull();

    fireEvent.input(screen.getByLabelText("Inicio que necesitás"), {
      target: { value: "2030-01-10T15:00" },
    });
    fireEvent.input(screen.getByLabelText("Fin que necesitás"), {
      target: { value: "2030-01-10T16:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "En el carrito" })).not.toBeNull();
    });
    expect(
      parseSelection(window.localStorage.getItem(SELECTION_STORAGE_KEY))[0]?.request,
    ).toMatchObject({
      quantity: 1,
      requested_window_start: "2030-01-10T15:00:00-06:00",
      requested_window_end: "2030-01-10T16:00:00-06:00",
    });
  });

  it("rejects a non-http reference before storing a digital request", async () => {
    render(
      <AddToSelection
        {...baseProps}
        offerClass="digital_offer"
        availabilityDetails={{}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Qué necesitás"), {
      target: { value: "Una tarjeta para un evento" },
    });
    fireEvent.change(screen.getByLabelText("Enlace de referencia (opcional)"), {
      target: { value: "archivo-local" },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Agregar al carrito" }),
    );

    expect(
      screen.getByText("El enlace debe comenzar con http:// o https://."),
    ).not.toBeNull();
    expect(parseSelection(window.localStorage.getItem(SELECTION_STORAGE_KEY))).toEqual(
      [],
    );
  });
});
