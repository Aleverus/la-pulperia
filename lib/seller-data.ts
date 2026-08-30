import type { CatalogPresence, FulfillmentMode } from "@/lib/catalog";
import type { OwnedMedia, OwnedOffer, OwnedPresence } from "@/lib/seller";
import { requireSession } from "@/lib/session";
import { createPublicClient } from "@/lib/supabase/public";

export async function getOwnedPresence(): Promise<OwnedPresence | null> {
  const { supabase } = await requireSession("/vender");
  const { data, error } = await supabase.rpc("get_my_presences");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return row as OwnedPresence;
}

export async function getOwnedOffers(presenceId: string): Promise<OwnedOffer[]> {
  const { supabase } = await requireSession("/mi-pulperia");
  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, slug, offer_class, title, description, price_cents, price_mode, unit, availability_model, availability_state, availability_details, confirmed_at, status, fulfillment_modes:offer_fulfillment_modes(mode)",
    )
    .eq("presence_id", presenceId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeOwnedOffer);
}

export async function getOwnedOffer(
  presenceId: string,
  offerId: string,
): Promise<OwnedOffer | null> {
  const { supabase } = await requireSession("/mi-pulperia");
  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, slug, offer_class, title, description, price_cents, price_mode, unit, availability_model, availability_state, availability_details, confirmed_at, status, fulfillment_modes:offer_fulfillment_modes(mode)",
    )
    .eq("presence_id", presenceId)
    .eq("id", offerId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeOwnedOffer(data) : null;
}

export async function getOwnedMedia(offerId: string): Promise<OwnedMedia[]> {
  const { supabase } = await requireSession("/mi-pulperia");
  const { data, error } = await supabase
    .from("offer_media")
    .select("id, storage_path, alt_text, sort_order")
    .eq("offer_id", offerId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as OwnedMedia[];
}

export async function getPhysicalCatalogPlaces(): Promise<CatalogPresence[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_presences")
    .select(
      "id, name, slug, description, mode, coverage_label, service_territory, served_city, lat, lng",
    )
    .eq("mode", "fixed_location")
    .not("lat", "is", null)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CatalogPresence[];
}

export async function getOfferMedia(offerId: string): Promise<OwnedMedia[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_offer_media")
    .select("id, storage_path, alt_text, sort_order")
    .eq("offer_id", offerId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as OwnedMedia[];
}

function normalizeOwnedOffer(value: unknown): OwnedOffer {
  const row = value as Omit<OwnedOffer, "fulfillment_modes"> & {
    fulfillment_modes?: Array<{ mode: FulfillmentMode }>;
  };
  return {
    ...row,
    fulfillment_modes: (row.fulfillment_modes ?? []).map(({ mode }) => mode),
  };
}
