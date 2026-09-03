/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExploreDirectory } from "@/app/_components/ExploreDirectory";

vi.mock("@/app/_components/PublicMap", () => ({
  PublicMap: () => <div>Mapa fijo</div>,
}));

afterEach(cleanup);

describe("ExploreDirectory", () => {
  it("separates confirmed fixed locations from online businesses", () => {
    render(
      <ExploreDirectory
        fixedPlaces={[]}
        onlinePlaces={[
          {
            id: "remote-1",
            name: "Diseño Norte",
            slug: "diseno-norte",
            description: "Diseño gráfico por encargo.",
            mode: "remote",
            coverage_label: null,
            service_territory: "Honduras",
            served_city: "Siguatepeque",
            lat: null,
            lng: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Mapa fijo")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Diseño Norte" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /En línea/ }));

    expect(
      screen
        .getByText("Mapa fijo")
        .closest("[role='tabpanel']")
        ?.hasAttribute("hidden"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Diseño Norte" }).getAttribute("href")).toBe(
      "/pulperia/diseno-norte",
    );
    expect(screen.getByText("Atención remota")).toBeTruthy();
  });
});
