import type {
  AvailabilityState,
  CatalogOffer,
  OfferClass,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";

export const SELECTION_STORAGE_KEY = "pulperia.selection.v2";
export const SELECTION_CHANGE_EVENT = "pulperia:selection-change";
export const MIN_SELECTION_QUANTITY = 0.001;
export const MAX_SELECTION_QUANTITY = 10_000;

export type SelectionRequest =
  | { quantity: number; substitution_ok?: boolean }
  | {
      quantity: number;
      variant?: string;
      requested_window_start: string;
      requested_window_end: string;
    }
  | {
      scope: string;
      appointment_preference?: string;
      approximate_locality?: string;
    }
  | { scope: string; plan?: string; reference_url?: string };

export type SelectionLine = {
  offerId: string;
  offerClass: OfferClass;
  request: SelectionRequest;
  listedPriceCents: number | null;
  listedPriceMode: PriceMode;
  listedUnit?: string | null;
  listedAvailabilityState: AvailabilityState;
  listedConfirmedAt: string;
  requestContextToken?: string;
};

export function parseSelection(raw: string | null): SelectionLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSelectionLine);
  } catch {
    return [];
  }
}

export function upsertSelection(
  lines: SelectionLine[],
  incoming: SelectionLine,
): SelectionLine[] {
  return [...lines.filter((line) => line.offerId !== incoming.offerId), incoming];
}

export function removeSelection(
  lines: SelectionLine[],
  offerId: string,
): SelectionLine[] {
  return lines.filter((line) => line.offerId !== offerId);
}

export function acceptCurrentContext(
  lines: SelectionLine[],
  offer: CatalogOffer,
): SelectionLine[] {
  return lines.map((line) =>
    line.offerId === offer.id && line.offerClass === offer.offer_class
      ? {
          ...line,
          listedPriceCents: offer.price_cents,
          listedPriceMode: offer.price_mode,
          listedUnit: offer.unit,
          listedAvailabilityState: offer.availability_state,
          listedConfirmedAt: offer.confirmed_at,
          requestContextToken: offer.request_context_token,
        }
      : line,
  );
}

export function contextChanged(
  line: SelectionLine,
  offer: CatalogOffer,
): boolean {
  return (
    line.offerClass !== offer.offer_class ||
    line.listedPriceCents !== offer.price_cents ||
    line.listedPriceMode !== offer.price_mode ||
    line.listedUnit !== offer.unit ||
    line.listedAvailabilityState !== offer.availability_state ||
    line.listedConfirmedAt !== offer.confirmed_at ||
    line.requestContextToken !== offer.request_context_token
  );
}

export function selectionNeedsOfferReview(line: SelectionLine): boolean {
  return (
    !line.requestContextToken ||
    ((line.offerClass === "stocked_product" ||
      line.offerClass === "scheduled_food") &&
      line.listedUnit === undefined)
  );
}

export function contextChangeSummary(
  line: SelectionLine,
  offer: CatalogOffer,
): string {
  const changes: string[] = [];
  if (
    line.listedPriceCents !== offer.price_cents ||
    line.listedPriceMode !== offer.price_mode
  ) {
    changes.push("precio");
  }
  if (line.listedUnit !== offer.unit) changes.push("unidad");
  if (line.listedAvailabilityState !== offer.availability_state) {
    changes.push("disponibilidad");
  }
  if (line.listedConfirmedAt !== offer.confirmed_at) changes.push("vigencia");
  if (
    line.requestContextToken !== offer.request_context_token &&
    changes.length === 0
  ) {
    changes.push("cobertura, cumplimiento o destino");
  }
  return changes.join(", ");
}

export function selectionToPrepareItems(lines: SelectionLine[]): Array<{
  offer_id: string;
  request: SelectionRequest;
  context: { request_context_token: string };
}> {
  return lines.map((line) => ({
    offer_id: line.offerId,
    request: line.request,
    context: { request_context_token: line.requestContextToken ?? "" },
  }));
}

export function requestSummary(line: SelectionLine): string {
  return formatRequestDetails(line.offerClass, line.request, line.listedUnit);
}

export function formatRequestDetails(
  offerClass: OfferClass,
  selectionRequest: SelectionRequest,
  unit?: string | null,
): string {
  if (offerClass === "stocked_product") {
    const request = selectionRequest as {
      quantity: number;
      substitution_ok?: boolean;
    };
    return `${formatRequestedQuantity(request.quantity, unit)}${request.substitution_ok ? " · acepta propuesta de sustituto" : " · sin sustituto solicitado"}`;
  }
  if (offerClass === "scheduled_food") {
    const request = selectionRequest as {
      quantity: number;
      variant?: string;
      requested_window_start: string;
      requested_window_end: string;
    };
    return `${formatRequestedQuantity(request.quantity, unit)}${request.variant ? ` · ${request.variant}` : ""} · ${formatRequestDate(request.requested_window_start)}–${formatRequestDate(request.requested_window_end)}`;
  }
  if (offerClass === "local_service") {
    const request = selectionRequest as {
      scope: string;
      appointment_preference?: string;
      approximate_locality?: string;
    };
    return `${request.scope}${request.appointment_preference ? ` · cita: ${request.appointment_preference}` : ""}${request.approximate_locality ? ` · zona: ${request.approximate_locality}` : ""}`;
  }
  const request = selectionRequest as {
    scope: string;
    plan?: string;
    reference_url?: string;
  };
  return `${request.scope}${request.plan ? ` · ${request.plan}` : ""}${request.reference_url ? ` · ${request.reference_url}` : ""}`;
}

function formatRequestDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-HN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Tegucigalpa",
      }).format(date);
}

export function isValidSelectionQuantity(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < MIN_SELECTION_QUANTITY || value > MAX_SELECTION_QUANTITY) {
    return false;
  }
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9;
}

export function formatRequestedQuantity(
  quantity: number,
  unit?: string | null,
): string {
  if (!isValidSelectionQuantity(quantity)) throw new Error("quantity_invalid");
  const amount = new Intl.NumberFormat("es-HN", {
    maximumFractionDigits: 3,
    useGrouping: false,
  }).format(quantity);
  const normalizedUnit = unit?.replace(/\s+/g, " ").trim();
  return normalizedUnit ? `${amount} ${normalizedUnit}` : amount;
}

function isSelectionLine(value: unknown): value is SelectionLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Partial<SelectionLine>;
  return (
    typeof line.offerId === "string" &&
    isOfferClass(line.offerClass) &&
    isRequest(line.offerClass, line.request) &&
    (line.listedPriceCents === null ||
      (typeof line.listedPriceCents === "number" && line.listedPriceCents > 0)) &&
    (line.listedPriceMode === "fixed" ||
      line.listedPriceMode === "from" ||
      line.listedPriceMode === "quote") &&
    (line.listedUnit === undefined ||
      line.listedUnit === null ||
      (typeof line.listedUnit === "string" && line.listedUnit.trim().length > 0)) &&
    (line.listedAvailabilityState === "available" ||
      line.listedAvailabilityState === "limited" ||
      line.listedAvailabilityState === "unavailable" ||
      line.listedAvailabilityState === "on_request") &&
    typeof line.listedConfirmedAt === "string" &&
    (line.requestContextToken === undefined ||
      (typeof line.requestContextToken === "string" &&
        /^[0-9a-f]{64}$/.test(line.requestContextToken)))
  );
}

function isOfferClass(value: unknown): value is OfferClass {
  return (
    value === "stocked_product" ||
    value === "scheduled_food" ||
    value === "local_service" ||
    value === "digital_offer"
  );
}

function isRequest(offerClass: OfferClass, value: unknown): value is SelectionRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  if (offerClass === "stocked_product") {
    return isValidSelectionQuantity(request.quantity);
  }
  if (offerClass === "scheduled_food") {
    return (
      isValidSelectionQuantity(request.quantity) &&
      typeof request.requested_window_start === "string" &&
      typeof request.requested_window_end === "string"
    );
  }
  return typeof request.scope === "string" && request.scope.trim().length > 0;
}
