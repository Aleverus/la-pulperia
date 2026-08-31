/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectionClient } from "@/app/_components/SelectionClient";
import { SELECTION_STORAGE_KEY, type SelectionLine } from "@/lib/selection";

const mocks = vi.hoisted(() => ({
  refreshSelectionAction: vi.fn(),
  prepareBatchAction: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/app/actions", () => ({
  refreshSelectionAction: mocks.refreshSelectionAction,
  prepareBatchAction: mocks.prepareBatchAction,
}));

vi.mock("@/app/_components/OfferContext", () => ({
  OfferContext: () => null,
}));

const selection: SelectionLine = {
  offerId: "10000000-0000-0000-0000-000000000020",
  offerClass: "stocked_product",
  request: { quantity: 1 },
  listedPriceCents: 3500,
  listedPriceMode: "fixed",
  listedUnit: "bolsa",
  listedAvailabilityState: "available",
  listedConfirmedAt: "2026-08-30T12:00:00.000Z",
  requestContextToken: "a".repeat(64),
};

describe("SelectionClient refresh recovery", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      SELECTION_STORAGE_KEY,
      JSON.stringify([selection]),
    );
    mocks.refreshSelectionAction.mockReset();
    mocks.prepareBatchAction.mockReset();
    mocks.push.mockReset();
  });

  afterEach(cleanup);

  it("shows a recoverable error and retries a rejected refresh", async () => {
    mocks.refreshSelectionAction
      .mockRejectedValueOnce(new Error("network_down"))
      .mockResolvedValueOnce([]);

    render(<SelectionClient signedIn />);

    expect(
      await screen.findByText("No se pudo revisar el contexto publicado."),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(mocks.refreshSelectionAction).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText(/Hay ofertas del carrito que ya no están publicadas/),
    ).not.toBeNull();
  });
});
