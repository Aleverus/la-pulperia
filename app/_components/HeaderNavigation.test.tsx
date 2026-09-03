/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderNavigation } from "@/app/_components/HeaderNavigation";

const mocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/actions", () => ({
  signOutAction: vi.fn(),
}));

vi.mock("@/app/_components/CartLink", () => ({
  CartLink: () => <a href="/carrito">Carrito</a>,
}));

afterEach(cleanup);

describe("HeaderNavigation", () => {
  it("keeps buying, selling and account available without a session", () => {
    mocks.pathname = "/buscar";
    render(
      <HeaderNavigation
        email={null}
        hasSellerPresence={false}
        isOperator={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Comprar/ }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: /Abrir/ }).getAttribute("href"),
    ).toBe("/vender");
    expect(
      screen.getByRole("link", { name: /Ingresar/ }).getAttribute("href"),
    ).toBe("/ingresar?next=%2Fcuenta");
  });

  it("adds seller requests and marks the current work area", () => {
    mocks.pathname = "/mi-pulperia/solicitudes";
    render(
      <HeaderNavigation
        email="duena@local.test"
        hasSellerPresence
        isOperator={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Mi pulpería/ }).getAttribute("href"),
    ).toBe("/mi-pulperia");
    expect(
      screen
        .getByRole("link", { name: /Solicitudes/ })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
});
