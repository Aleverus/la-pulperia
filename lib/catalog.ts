import type { PriceMode } from "@/lib/money";

export type OfferClass =
  | "stocked_product"
  | "scheduled_food"
  | "local_service"
  | "digital_offer";
export type AvailabilityModel = "stock" | "window" | "schedule" | "on_request";
export type AvailabilityState =
  | "available"
  | "limited"
  | "unavailable"
  | "on_request";
export type PresenceMode = "fixed_location" | "mobile" | "remote";
export type FulfillmentMode =
  | "pickup"
  | "local_coverage"
  | "seller_shipping"
  | "appointment"
  | "digital_delivery"
  | "direct_agreement";

export type AvailabilityDetails = Record<string, string>;

type OfferContract = {
  offer_class: OfferClass;
  title: string;
  description: string;
  price_cents: number | null;
  price_mode: PriceMode;
  unit: string | null;
  availability_model: AvailabilityModel;
  availability_state: AvailabilityState;
  availability_details: AvailabilityDetails;
  confirmed_at: string;
  presence_id: string;
  presence_slug: string;
  presence_name: string;
  presence_mode: PresenceMode;
  coverage_label: string | null;
  service_territory: string | null;
  fulfillment_modes: FulfillmentMode[];
};

export type SearchOffer = OfferContract & {
  offer_id: string;
  offer_slug: string;
  dist_meters: number | null;
};

export type CatalogOffer = OfferContract & {
  id: string;
  slug: string;
};

export type CatalogPresence = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mode: PresenceMode;
  coverage_label: string | null;
  service_territory: string | null;
  served_city: string;
  lat: number | null;
  lng: number | null;
};

export const OFFER_CLASS_LABEL: Record<OfferClass, string> = {
  stocked_product: "Producto con stock",
  scheduled_food: "Comida o encargo",
  local_service: "Servicio local",
  digital_offer: "Oferta digital",
};

export const PRESENCE_MODE_LABEL: Record<PresenceMode, string> = {
  fixed_location: "Ubicación fija",
  mobile: "Atención móvil",
  remote: "Atención remota",
};
