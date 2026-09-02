import type {
  AvailabilityState,
  FulfillmentMode,
  OfferClass,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";

export const STARTER_OFFER_DRAFT_KEY = "la-pulperia:starter-offer:v1";

export type StarterOfferDraft = {
  version: 1;
  offerClass: OfferClass;
  title: string;
  description: string;
  priceMode: PriceMode;
  price: string;
  unit: string;
  availabilityState: AvailabilityState;
  stockNote: string;
  windowStart: string;
  windowEnd: string;
  windowCutoff: string;
  capacityNote: string;
  requirements: string;
  nextAvailableAt: string;
  scheduleNote: string;
  fulfillments: FulfillmentMode[];
};

export function emptyStarterOfferDraft(): StarterOfferDraft {
  return {
    version: 1,
    offerClass: "stocked_product",
    title: "",
    description: "",
    priceMode: "fixed",
    price: "",
    unit: "",
    availabilityState: "available",
    stockNote: "",
    windowStart: "",
    windowEnd: "",
    windowCutoff: "",
    capacityNote: "",
    requirements: "",
    nextAvailableAt: "",
    scheduleNote: "",
    fulfillments: [],
  };
}

export function parseStarterOfferDraft(value: unknown): StarterOfferDraft | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<StarterOfferDraft>;
  if (
    item.version !== 1 ||
    !isOfferClass(item.offerClass) ||
    !isPriceMode(item.priceMode) ||
    !isAvailabilityState(item.availabilityState)
  ) {
    return null;
  }

  const fulfillments = Array.isArray(item.fulfillments)
    ? item.fulfillments.filter(isFulfillmentMode)
    : [];
  return {
    version: 1,
    offerClass: item.offerClass,
    title: safeText(item.title, 120),
    description: safeText(item.description, 4000),
    priceMode: item.priceMode,
    price: safeText(item.price, 40),
    unit: safeText(item.unit, 40),
    availabilityState: item.availabilityState,
    stockNote: safeText(item.stockNote, 500),
    windowStart: safeText(item.windowStart, 40),
    windowEnd: safeText(item.windowEnd, 40),
    windowCutoff: safeText(item.windowCutoff, 40),
    capacityNote: safeText(item.capacityNote, 500),
    requirements: safeText(item.requirements, 500),
    nextAvailableAt: safeText(item.nextAvailableAt, 40),
    scheduleNote: safeText(item.scheduleNote, 500),
    fulfillments: Array.from(new Set(fulfillments)),
  };
}

export function starterOfferDraftFromForm(form: FormData): StarterOfferDraft {
  const fallback = emptyStarterOfferDraft();
  const offerClass = form.get("offer_class");
  const priceMode = form.get("price_mode");
  const availabilityState = form.get("availability_state");
  return {
    version: 1,
    offerClass: isOfferClass(offerClass) ? offerClass : fallback.offerClass,
    title: safeText(form.get("title"), 120),
    description: safeText(form.get("description"), 4000),
    priceMode: isPriceMode(priceMode) ? priceMode : fallback.priceMode,
    price: safeText(form.get("price"), 40),
    unit: safeText(form.get("unit"), 40),
    availabilityState: isAvailabilityState(availabilityState)
      ? availabilityState
      : fallback.availabilityState,
    stockNote: safeText(form.get("stock_note"), 500),
    windowStart: safeText(form.get("window_start"), 40),
    windowEnd: safeText(form.get("window_end"), 40),
    windowCutoff: safeText(form.get("window_cutoff"), 40),
    capacityNote: safeText(form.get("capacity_note"), 500),
    requirements: safeText(form.get("requirements"), 500),
    nextAvailableAt: safeText(form.get("next_available_at"), 40),
    scheduleNote: safeText(form.get("schedule_note"), 500),
    fulfillments: form
      .getAll("fulfillment_modes")
      .filter(isFulfillmentMode),
  };
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function isOfferClass(value: unknown): value is OfferClass {
  return (
    value === "stocked_product" ||
    value === "scheduled_food" ||
    value === "local_service" ||
    value === "digital_offer"
  );
}

function isPriceMode(value: unknown): value is PriceMode {
  return value === "fixed" || value === "from" || value === "quote";
}

function isAvailabilityState(value: unknown): value is AvailabilityState {
  return (
    value === "available" ||
    value === "limited" ||
    value === "unavailable" ||
    value === "on_request"
  );
}

function isFulfillmentMode(value: unknown): value is FulfillmentMode {
  return (
    value === "pickup" ||
    value === "local_coverage" ||
    value === "seller_shipping" ||
    value === "appointment" ||
    value === "digital_delivery" ||
    value === "direct_agreement"
  );
}
