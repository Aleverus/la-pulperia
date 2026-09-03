/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountProfileSettings } from "@/app/_components/AccountProfileSettings";

vi.mock("@/app/account-actions", () => ({
  updateAccountProfileAction: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

afterEach(cleanup);

describe("AccountProfileSettings", () => {
  it("uses the branded initial when the seller has no gallery image", () => {
    render(
      <AccountProfileSettings
        email="persona@local.test"
        displayName="Persona"
        initial="P"
        avatarSrc={null}
        selectedAvatarPath={null}
        media={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tu información" })).toBeTruthy();
    expect(screen.getByLabelText(/Nombre visible/)).toHaveProperty("value", "Persona");
    expect(screen.getByRole("radio", { name: /Usar mi inicial/ })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByText(/Cuando agregués fotos/)).toBeTruthy();
  });

  it("lets the owner keep a selected image from their publication gallery", () => {
    render(
      <AccountProfileSettings
        email="persona@local.test"
        displayName="Persona"
        initial="P"
        avatarSrc="https://example.com/selected.webp"
        selectedAvatarPath="owner/offer/selected.webp"
        media={[
          {
            id: "media-1",
            storagePath: "owner/offer/selected.webp",
            src: "https://example.com/selected.webp",
            alt: "Canasta de verduras",
          },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "Canasta de verduras" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Foto 1/ })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByRole("button", { name: "Guardar perfil" })).toBeTruthy();
  });
});
