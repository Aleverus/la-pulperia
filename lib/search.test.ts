import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_PAGE,
  parseSearchAvailabilityFilter,
  parseSearchOfferClassFilter,
  parseSearchPage,
  parseSearchPresenceFilter,
  parseSearchSort,
  searchHref,
} from "@/lib/search";

describe("public search parameters", () => {
  it("accepts only the public filter and sort vocabulary", () => {
    expect(parseSearchPresenceFilter("fixed_location")).toBe("fixed_location");
    expect(parseSearchPresenceFilter("anything")).toBe("all");
    expect(parseSearchOfferClassFilter("scheduled_food")).toBe(
      "scheduled_food",
    );
    expect(parseSearchOfferClassFilter("anything")).toBe("all");
    expect(parseSearchAvailabilityFilter("on_request")).toBe("on_request");
    expect(parseSearchAvailabilityFilter("unavailable")).toBe("all");
    expect(parseSearchSort("price_desc")).toBe("organic");
    expect(parseSearchSort("nearby")).toBe("nearby");
    expect(parseSearchSort("paid-ranking")).toBe("organic");
  });

  it("clamps invalid pages to the first page", () => {
    expect(parseSearchPage("3")).toBe(3);
    expect(parseSearchPage("0")).toBe(1);
    expect(parseSearchPage("-1")).toBe(1);
    expect(parseSearchPage("1.5")).toBe(1);
    expect(parseSearchPage(String(MAX_SEARCH_PAGE))).toBe(MAX_SEARCH_PAGE);
    expect(parseSearchPage(String(MAX_SEARCH_PAGE + 1))).toBe(1);
    expect(parseSearchPage("2147483647")).toBe(1);
  });

  it("keeps only non-default controls in pagination links", () => {
    expect(
      searchHref({
        query: "zambos picantes",
        offerClass: "stocked_product",
        presence: "mobile",
        availability: "limited",
        sort: "recent",
        page: 2,
      }),
    ).toBe(
      "/buscar?q=zambos+picantes&clase=stocked_product&tipo=mobile&disponibilidad=limited&orden=recent&pagina=2",
    );
    expect(
      searchHref({
        query: "",
        offerClass: "all",
        presence: "all",
        availability: "all",
        sort: "organic",
        page: 1,
      }),
    ).toBe("/buscar");
  });
});
