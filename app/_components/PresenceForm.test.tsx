/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PresenceForm } from "@/app/_components/PresenceForm";
import type { OwnedPresence } from "@/lib/seller";

vi.mock("@/app/seller-actions", () => ({
  confirmWhatsappOwnershipAction: vi.fn(),
  savePresenceAction: vi.fn(),
}));

vi.mock("@/app/_components/CityMap", () => ({
  CityMap: () => <div>Mapa</div>,
}));

const presence: OwnedPresence = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Pulpería La Esquina",
  slug: "pulperia-la-esquina",
  description: "",
  mode: "mobile",
  whatsapp_e164: "+50499993333",
  coverage_label: "Siguatepeque",
  service_territory: null,
  status: "draft",
  location_public_confirmed: false,
  lat: null,
  lng: null,
  whatsapp_verification_status: "unverified",
  whatsapp_verified_at: null,
};

describe("PresenceForm WhatsApp confirmation", () => {
  afterEach(cleanup);

  it("makes the return confirmation explicit after the WhatsApp test", () => {
    render(<PresenceForm presence={presence} />);

    const probe = screen.getByRole("link", {
      name: "1. Enviar mensaje de prueba",
    });
    expect(probe.getAttribute("href")).toContain("wa.me/50499993333");
    expect(screen.getByText(/no puede leer tu WhatsApp/)).toBeTruthy();

    const confirm = screen.getByRole("button", {
      name: "2. Confirmar que llegó",
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("WhatsApp"), {
      target: { value: "9999-4444" },
    });
    expect(confirm.disabled).toBe(true);
    expect(
      screen.getByText(/Guardá el borrador con este número/),
    ).toBeTruthy();
  });
});
