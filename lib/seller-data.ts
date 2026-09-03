import type {
  AvailabilityDetails,
  AvailabilityModel,
  AvailabilityState,
  CatalogPresence,
  FulfillmentMode,
  OfferClass,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";
import type { SelectionRequest } from "@/lib/selection";
import type { OwnedMedia, OwnedOffer, OwnedPresence } from "@/lib/seller";
import { requireSession } from "@/lib/session";
import { createPublicClient } from "@/lib/supabase/public";

export type SellerRequestItem = {
  title: string;
  offer_class: OfferClass;
  price_cents: number | null;
  price_mode: PriceMode;
  unit: string | null;
  availability_model: AvailabilityModel;
  availability_state: AvailabilityState;
  availability_details: AvailabilityDetails;
  confirmed_at: string;
  fulfillment_modes: FulfillmentMode[];
  request: SelectionRequest;
};

export type SellerRequest = {
  seller_request_id: string;
  batch_id: string;
  presence_id: string;
  presence_name: string;
  status: "prepared" | "handoff_opened";
  prepared_at: string;
  handoff_opened_at: string | null;
  seller_understood_at: string | null;
  items: SellerRequestItem[];
};

export async function getOwnedPresences(
  nextPath = "/vender",
): Promise<OwnedPresence[]> {
  const { supabase } = await requireSession(nextPath);
  const { data, error } = await supabase.rpc("get_my_presences");
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as OwnedPresence[];
}

export async function getOwnedPresenceById(
  presenceId: string,
  nextPath = "/mi-pulperia",
): Promise<OwnedPresence | null> {
  const presences = await getOwnedPresences(nextPath);
  return presences.find((presence) => presence.id === presenceId) ?? null;
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
    .select("id, storage_path, alt_text, sort_order, deletion_pending")
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
  return (data ?? []).map((item) => ({
    ...item,
    deletion_pending: false,
  })) as OwnedMedia[];
}

export async function getOnlineCatalogPlaces(): Promise<CatalogPresence[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_presences")
    .select(
      "id, name, slug, description, mode, coverage_label, service_territory, served_city, lat, lng",
    )
    .in("mode", ["mobile", "remote"])
    .order("name");
  if (error) throw error;
  return (data ?? []) as CatalogPresence[];
}

export type OfferPreviewMedia = Pick<
  OwnedMedia,
  "id" | "storage_path" | "alt_text" | "sort_order"
> & { offer_id: string };

export async function getOfferPreviewMedia(
  offerIds: string[],
): Promise<Map<string, OfferPreviewMedia>> {
  const uniqueIds = Array.from(new Set(offerIds));
  if (uniqueIds.length === 0) return new Map();
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("catalog_offer_media")
    .select("id, offer_id, storage_path, alt_text, sort_order")
    .in("offer_id", uniqueIds)
    .order("sort_order");
  if (error) throw error;

  const previews = new Map<string, OfferPreviewMedia>();
  for (const item of (data ?? []) as OfferPreviewMedia[]) {
    if (!previews.has(item.offer_id)) previews.set(item.offer_id, item);
  }
  return previews;
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

export async function getSellerRequests(
  presenceId: string,
): Promise<SellerRequest[]> {
  const { supabase } = await requireSession("/mi-pulperia/solicitudes");
  const { data, error } = await supabase.rpc("get_my_seller_requests", {
    p_presence_id: presenceId,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as SellerRequest[];
}
