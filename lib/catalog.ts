import type { PriceMode } from "@/lib/money";

export type PresenceKind = "physical" | "virtual";
export type Availability = "available" | "limited" | "unavailable";

export type SearchOffer = {
  offer_id: string;
  offer_slug: string;
  title: string;
  description: string;
  price_cents: number;
  price_mode: PriceMode;
  unit: string | null;
  availability: Availability;
  confirmed_at: string;
  presence_id: string;
  presence_slug: string;
  presence_name: string;
  presence_kind: PresenceKind;
  dist_meters: number | null;
};

export type CatalogOffer = {
  id: string;
  slug: string;
  kind: "product" | "service";
  title: string;
  description: string;
  price_cents: number;
  price_mode: PriceMode;
  unit: string | null;
  availability: Availability;
  confirmed_at: string;
  presence_id: string;
  presence_slug: string;
  presence_name: string;
  presence_kind: PresenceKind;
};

export type CatalogPresence = {
  id: string;
  name: string;
  slug: string;
  description: string;
  kind: PresenceKind;
  served_city: string;
  lat: number | null;
  lng: number | null;
};
