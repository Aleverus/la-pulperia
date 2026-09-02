/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfferForm } from "@/app/_components/OfferForm";

vi.mock("@/app/seller-actions", () => ({
  confirmOfferAction: vi.fn(),
  removeOfferImageAction: vi.fn(),
  saveOfferAction: vi.fn(),
  setOfferStatusAction: vi.fn(),
}));

describe("OfferForm progressive flow", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows one short task at a time and allows a first photo before creation", () => {
    render(
      <OfferForm
        presenceId="10000000-0000-0000-0000-000000000001"
        offer={null}
        media={[]}
      />,
    );

    expect(screen.getByRole("group", { name: "¿Qué ofrecés?" })).toBeTruthy();
    expect(screen.getByLabelText("Título").closest("[hidden]")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Café molido" },
    });
    fireEvent.change(screen.getByLabelText("Precio publicado (lempiras)"), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByLabelText("Unidad o periodo"), {
      target: { value: "bolsa" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByRole("group", { name: "¿Cuándo está disponible?" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const continueToReview = screen.getByRole("button", { name: "Continuar" });
    expect((continueToReview as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Retiro" }));
    expect((continueToReview as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(continueToReview);

    expect(
      screen.getByRole("heading", { name: "Revisá antes de guardar" }),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Primera foto (opcional, hasta 3 MB)"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeTruthy();
    expect(screen.getByText("Café molido")).toBeTruthy();
  });
});
