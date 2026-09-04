/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExploreDirectory } from "@/app/_components/ExploreDirectory";
import type { CatalogOffer, CatalogPresenceWithOffers } from "@/lib/catalog";

const { navigation, router } = vi.hoisted(() => ({
  navigation: { search: "" },
  router: { replace: vi.fn(), refresh: vi.fn() },
}));

vi.mock("@/app/_components/PublicMap", () => ({
  PublicMap: ({
    places,
    selectedId,
    onSelect,
    showDirectory = true,
  }: {
    places: CatalogPresenceWithOffers[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    showDirectory?: boolean;
  }) => (
    <div>
      <span>Mapa fijo</span>
      {showDirectory ? <span>{places.length} negocios</span> : null}
      {places.map((place) => (
        <button
          key={place.id}
          type="button"
          aria-pressed={selectedId === place.id}
          onClick={() => onSelect?.(place.id)}
        >
          {place.name}
        </button>
      ))}
      {places.flatMap((place) =>
        place.offers.map((offer) => (
          <span key={offer.id}>{offer.title}</span>
        )),
      )}
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/mapa",
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

afterEach(() => {
  cleanup();
  navigation.search = "";
  router.replace.mockReset();
  router.refresh.mockReset();
});

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
            offers: [],
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

  it("keeps the selected fixed presence synchronized with the URL", () => {
    const fixedPlaces: CatalogPresenceWithOffers[] = [
      {
        id: "fixed-1",
        name: "Taller Norte",
        slug: "taller-norte",
        description: "Reparaciones en el barrio.",
        mode: "fixed_location",
        coverage_label: null,
        service_territory: "Barrio El Centro",
        served_city: "Siguatepeque",
        lat: 14.6,
        lng: -87.8,
        offers: [],
      },
      {
        id: "fixed-2",
        name: "Pulpería La Esquina",
        slug: "pulperia-la-esquina",
        description: "Abarrotes del día.",
        mode: "fixed_location",
        coverage_label: null,
        service_territory: "Barrio San Juan",
        served_city: "Siguatepeque",
        lat: 14.61,
        lng: -87.81,
        offers: [],
      },
    ];

    render(
      <ExploreDirectory fixedPlaces={fixedPlaces} onlinePlaces={[]} />,
    );

    const secondPresence = screen.getByRole("button", {
      name: "Pulpería La Esquina",
    });
    expect(secondPresence.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(secondPresence);

    expect(secondPresence.getAttribute("aria-pressed")).toBe("true");
    expect(router.replace).toHaveBeenLastCalledWith(
      "/mapa?presencia=fixed-2",
      { scroll: false },
    );
  });

  it("synchronizes mode, query, class, and selection after URL navigation", () => {
    const fixedPlaces: CatalogPresenceWithOffers[] = [
      fixedPlace({
        id: "fixed-1",
        name: "Café del Centro",
        slug: "cafe-del-centro",
        description: "Bebidas calientes.",
      }),
      fixedPlace({
        id: "fixed-2",
        name: "Taller Eléctrico",
        slug: "taller-electrico",
        description: "Reparación local.",
        offers: [
          catalogOffer(
            "service-1",
            "Reparación de licuadoras",
            "local_service",
          ),
        ],
      }),
    ];
    navigation.search = "modo=en-linea&q=diseno&clase=digital_offer";
    const { rerender } = render(
      <ExploreDirectory fixedPlaces={fixedPlaces} onlinePlaces={[]} />,
    );

    expect(
      screen
        .getByRole("tab", { name: /En línea/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      (screen.getByRole("textbox", {
        name: "¿Qué necesitás cerca?",
      }) as HTMLInputElement).value,
    ).toBe("diseno");
    expect(
      screen
        .getByRole("button", { name: "Digital" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    router.replace.mockClear();

    navigation.search =
      "q=reparacion&clase=local_service&presencia=fixed-2";
    rerender(<ExploreDirectory fixedPlaces={fixedPlaces} onlinePlaces={[]} />);

    expect(
      screen
        .getByRole("tab", { name: /Cerca/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      (screen.getByRole("textbox", {
        name: "¿Qué necesitás cerca?",
      }) as HTMLInputElement).value,
    ).toBe("reparacion");
    expect(
      screen
        .getByRole("button", { name: "Servicios" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Taller Eléctrico" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("matches text without requiring the same diacritics", () => {
    const place = fixedPlace({
      id: "fixed-accented",
      name: "Café El Rincón",
      slug: "cafe-el-rincon",
      description: "Reparación y venta local.",
    });
    render(<ExploreDirectory fixedPlaces={[place]} onlinePlaces={[]} />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "¿Qué necesitás cerca?" }),
      { target: { value: "reparacion" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(screen.getByRole("button", { name: "Café El Rincón" })).toBeTruthy();
  });

  it("does not expose publications from another class in the map or online list", () => {
    navigation.search = "clase=local_service";
    render(
      <ExploreDirectory
        fixedPlaces={[
          fixedPlace({
            id: "fixed-mixed",
            name: "Taller Mixto",
            offers: [
              catalogOffer(
                "fixed-service",
                "Reparación eléctrica",
                "local_service",
              ),
              catalogOffer(
                "fixed-product",
                "Repuesto disponible",
                "stocked_product",
              ),
            ],
          }),
        ]}
        onlinePlaces={[
          fixedPlace({
            id: "remote-mixed",
            name: "Estudio Remoto",
            slug: "estudio-remoto",
            mode: "remote",
            lat: null,
            lng: null,
            offers: [
              catalogOffer(
                "remote-service",
                "Asesoría de marca",
                "local_service",
              ),
              catalogOffer(
                "remote-product",
                "Manual impreso",
                "stocked_product",
              ),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("Reparación eléctrica")).toBeTruthy();
    expect(screen.queryByText("Repuesto disponible")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /En línea/ }));

    expect(screen.getByRole("link", { name: "Asesoría de marca" })).toBeTruthy();
    expect(screen.queryByText("Manual impreso")).toBeNull();
  });

  it("keeps every class-compatible publication when the presence matches q", () => {
    navigation.search = "q=taller&clase=local_service";
    render(
      <ExploreDirectory
        fixedPlaces={[
          fixedPlace({
            name: "Taller Ágil",
            offers: [
              catalogOffer(
                "service-1",
                "Reparación de licuadoras",
                "local_service",
              ),
              catalogOffer(
                "service-2",
                "Instalación eléctrica",
                "local_service",
              ),
              catalogOffer("product-1", "Cable por metro", "stocked_product"),
            ],
          }),
        ]}
        onlinePlaces={[]}
      />,
    );

    expect(screen.getByText("Reparación de licuadoras")).toBeTruthy();
    expect(screen.getByText("Instalación eléctrica")).toBeTruthy();
    expect(screen.queryByText("Cable por metro")).toBeNull();
  });

  it("keeps only matching publications when q matches no presence field", () => {
    navigation.search = "q=licuadora&clase=local_service";
    render(
      <ExploreDirectory
        fixedPlaces={[
          fixedPlace({
            name: "Negocio Central",
            description: "Atención por cita.",
            offers: [
              catalogOffer(
                "service-1",
                "Reparación de licuadoras",
                "local_service",
              ),
              catalogOffer(
                "service-2",
                "Instalación eléctrica",
                "local_service",
              ),
              catalogOffer(
                "product-1",
                "Repuesto de licuadora",
                "stocked_product",
              ),
            ],
          }),
        ]}
        onlinePlaces={[]}
      />,
    );

    expect(screen.getByText("Reparación de licuadoras")).toBeTruthy();
    expect(screen.queryByText("Instalación eléctrica")).toBeNull();
    expect(screen.queryByText("Repuesto de licuadora")).toBeNull();
  });

  it("keeps presences visible when only publication enrichment fails", () => {
    navigation.search = "clase=local_service";
    render(
      <ExploreDirectory
        fixedPlaces={[fixedPlace({ id: "fixed-visible" })]}
        onlinePlaces={[]}
        offerLoadFailed
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "no pudimos actualizar sus publicaciones",
    );
    expect(
      screen.getByRole("button", { name: "Reintentar publicaciones" }),
    ).toBeTruthy();
    expect(screen.getByText("1 negocios")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Negocio local" })).toBeTruthy();
  });

  it("shows only the recoverable technical state when loading fails", () => {
    render(
      <ExploreDirectory fixedPlaces={[]} onlinePlaces={[]} loadFailed />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "No pudimos actualizar las presencias",
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.getByText("Mapa fijo")).toBeTruthy();
    expect(screen.queryByText("0 negocios")).toBeNull();
    expect(screen.queryByText(/No hay coincidencias/)).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /En línea/ }));

    expect(screen.getByText("Mapa fijo")).toBeTruthy();
    expect(screen.queryByText(/No hay coincidencias/)).toBeNull();
  });
});

function fixedPlace(
  overrides: Partial<CatalogPresenceWithOffers>,
): CatalogPresenceWithOffers {
  return {
    id: "fixed-default",
    name: "Negocio local",
    slug: "negocio-local",
    description: "Oferta local.",
    mode: "fixed_location",
    coverage_label: null,
    service_territory: "Siguatepeque",
    served_city: "Siguatepeque",
    lat: 14.6,
    lng: -87.8,
    offers: [],
    ...overrides,
  };
}

function catalogOffer(
  id: string,
  title: string,
  offerClass: CatalogOffer["offer_class"],
): CatalogOffer {
  return {
    id,
    slug: id,
    offer_class: offerClass,
    title,
    description: title,
    price_cents: null,
    price_mode: "quote",
    unit: null,
    availability_model: "on_request",
    availability_state: "on_request",
    availability_details: {},
    confirmed_at: "2026-09-03T12:00:00.000Z",
    presence_id: "fixed-2",
    presence_slug: "taller-electrico",
    presence_name: "Taller Eléctrico",
    presence_mode: "fixed_location",
    coverage_label: null,
    service_territory: "Siguatepeque",
    fulfillment_modes: ["appointment"],
    request_context_token: "service-context",
  };
}
