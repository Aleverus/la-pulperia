import { describe, expect, it } from "vitest";
import {
  parseSearchPage,
  parseSearchPresenceFilter,
  parseSearchSort,
  searchHref,
} from "@/lib/search";

describe("public search parameters", () => {
  it("accepts only the public filter and sort vocabulary", () => {
    expect(parseSearchPresenceFilter("fixed_location")).toBe("fixed_location");
    expect(parseSearchPresenceFilter("anything")).toBe("all");
    expect(parseSearchSort("price_desc")).toBe("price_desc");
    expect(parseSearchSort("nearby")).toBe("nearby");
    expect(parseSearchSort("paid-ranking")).toBe("organic");
  });

  it("clamps invalid pages to the first page", () => {
    expect(parseSearchPage("3")).toBe(3);
    expect(parseSearchPage("0")).toBe(1);
    expect(parseSearchPage("1.5")).toBe(1);
  });

  it("keeps only non-default controls in pagination links", () => {
    expect(
      searchHref({
        query: "zambos picantes",
        presence: "mobile",
        sort: "price_asc",
        page: 2,
      }),
    ).toBe(
      "/buscar?q=zambos+picantes&tipo=mobile&orden=price_asc&pagina=2",
    );
    expect(
      searchHref({ query: "", presence: "all", sort: "organic", page: 1 }),
    ).toBe("/buscar");
  });
});
