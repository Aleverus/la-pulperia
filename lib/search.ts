import type { PresenceMode } from "@/lib/catalog";

export const SEARCH_PAGE_SIZE = 20;

export type SearchPresenceFilter = "all" | PresenceMode;
export type SearchSort =
  | "organic"
  | "price_asc"
  | "price_desc"
  | "recent"
  | "nearby";

export function parseSearchPresenceFilter(
  value: string | string[] | undefined,
): SearchPresenceFilter {
  const candidate = first(value);
  return candidate === "fixed_location" ||
    candidate === "mobile" ||
    candidate === "remote"
    ? candidate
    : "all";
}

export function parseSearchSort(
  value: string | string[] | undefined,
): SearchSort {
  const candidate = first(value);
  return candidate === "price_asc" ||
    candidate === "price_desc" ||
    candidate === "recent" ||
    candidate === "nearby"
    ? candidate
    : "organic";
}

export function parseSearchPage(value: string | string[] | undefined): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function searchHref(input: {
  query: string;
  presence: SearchPresenceFilter;
  sort: SearchSort;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.presence !== "all") params.set("tipo", input.presence);
  if (input.sort !== "organic") params.set("orden", input.sort);
  if (input.page > 1) params.set("pagina", String(input.page));
  const query = params.toString();
  return query ? `/buscar?${query}` : "/buscar";
}
