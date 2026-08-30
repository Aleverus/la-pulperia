import type { CatalogOffer, CatalogPresence, SearchOffer } from "@/lib/catalog";
import {
  SEARCH_PAGE_SIZE,
  type SearchPresenceFilter,
  type SearchSort,
} from "@/lib/search";
import { createPublicClient } from "@/lib/supabase/public";

export async function searchOffers(input: {
  query: string;
  presence: SearchPresenceFilter;
  sort: SearchSort;
  page: number;
  location?: { lat: number; lng: number } | null;
}): Promise<{ offers: SearchOffer[]; hasNext: boolean }> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_offers", {
    p_query: input.query,
    p_limit: SEARCH_PAGE_SIZE + 1,
    p_offset: (input.page - 1) * SEARCH_PAGE_SIZE,
    p_lat: input.location?.lat ?? null,
    p_lng: input.location?.lng ?? null,
    p_presence_mode: input.presence === "all" ? null : input.presence,
    p_sort: input.sort,
  });
  if (error) throw error;
  const rows = (data ?? []) as SearchOffer[];
  return {
    offers: rows.slice(0, SEARCH_PAGE_SIZE),
    hasNext: rows.length > SEARCH_PAGE_SIZE,
  };
}

export const getCatalogOffer = cache(async function getCatalogOffer(
  slug: string,
): Promise<CatalogOffer | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_offers")
    .select(
      "id, slug, offer_class, title, description, price_cents, price_mode, unit, availability_model, availability_state, availability_details, confirmed_at, presence_id, presence_slug, presence_name, presence_mode, coverage_label, service_territory, fulfillment_modes",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as CatalogOffer | null;
});

export async function getCatalogOffersByIds(
  ids: string[],
): Promise<CatalogOffer[]> {
  if (ids.length === 0) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_offers")
    .select(
      "id, slug, offer_class, title, description, price_cents, price_mode, unit, availability_model, availability_state, availability_details, confirmed_at, presence_id, presence_slug, presence_name, presence_mode, coverage_label, service_territory, fulfillment_modes",
    )
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as CatalogOffer[];
}

export const getPresence = cache(async function getPresence(
  slug: string,
): Promise<CatalogPresence | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_presences")
    .select(
      "id, name, slug, description, mode, coverage_label, service_territory, served_city, lat, lng",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as CatalogPresence | null;
});

export async function getPresenceOffers(
  presenceId: string,
): Promise<CatalogOffer[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_offers")
    .select(
      "id, slug, offer_class, title, description, price_cents, price_mode, unit, availability_model, availability_state, availability_details, confirmed_at, presence_id, presence_slug, presence_name, presence_mode, coverage_label, service_territory, fulfillment_modes",
    )
    .eq("presence_id", presenceId)
    .order("title");
  if (error) throw error;
  return (data ?? []) as CatalogOffer[];
}

export async function getPublicSitemapEntries(): Promise<{
  offerSlugs: string[];
  presenceSlugs: string[];
}> {
  const supabase = createPublicClient();
  const [offerResult, presenceResult] = await Promise.all([
    supabase.from("catalog_offers").select("slug").order("slug").limit(50_000),
    supabase
      .from("catalog_presences")
      .select("slug")
      .order("slug")
      .limit(50_000),
  ]);
  if (offerResult.error) throw offerResult.error;
  if (presenceResult.error) throw presenceResult.error;
  return {
    offerSlugs: (offerResult.data ?? []).map(({ slug }) => slug),
    presenceSlugs: (presenceResult.data ?? []).map(({ slug }) => slug),
  };
}
import { cache } from "react";
