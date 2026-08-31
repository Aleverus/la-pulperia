import type { OfferClass, PresenceMode } from "@/lib/catalog";

export const SEARCH_PAGE_SIZE = 20;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
export const MAX_SEARCH_PAGE =
  Math.floor(POSTGRES_INTEGER_MAX / SEARCH_PAGE_SIZE) + 1;

export type SearchOfferClassFilter = "all" | OfferClass;
export type SearchPresenceFilter = "all" | PresenceMode;
export type SearchAvailabilityFilter =
  | "all"
  | "available"
  | "limited"
  | "on_request";
export type SearchSort =
  | "organic"
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

export function parseSearchOfferClassFilter(
  value: string | string[] | undefined,
): SearchOfferClassFilter {
  const candidate = first(value);
  return candidate === "stocked_product" ||
    candidate === "scheduled_food" ||
    candidate === "local_service" ||
    candidate === "digital_offer"
    ? candidate
    : "all";
}

export function parseSearchAvailabilityFilter(
  value: string | string[] | undefined,
): SearchAvailabilityFilter {
  const candidate = first(value);
  return candidate === "available" ||
    candidate === "limited" ||
    candidate === "on_request"
    ? candidate
    : "all";
}

export function parseSearchSort(
  value: string | string[] | undefined,
): SearchSort {
  const candidate = first(value);
  return candidate === "recent" ||
    candidate === "nearby"
    ? candidate
    : "organic";
}

export function parseSearchPage(value: string | string[] | undefined): number {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) &&
    parsed > 0 &&
    parsed <= MAX_SEARCH_PAGE
    ? parsed
    : 1;
}

export function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function searchHref(input: {
  query: string;
  offerClass: SearchOfferClassFilter;
  presence: SearchPresenceFilter;
  availability: SearchAvailabilityFilter;
  sort: SearchSort;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.offerClass !== "all") params.set("clase", input.offerClass);
  if (input.presence !== "all") params.set("tipo", input.presence);
  if (input.availability !== "all") {
    params.set("disponibilidad", input.availability);
  }
  if (input.sort !== "organic") params.set("orden", input.sort);
  if (input.page > 1) params.set("pagina", String(input.page));
  const query = params.toString();
  return query ? `/buscar?${query}` : "/buscar";
}
