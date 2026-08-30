import type { AvailabilityState, OfferClass } from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";

export const SELECTION_STORAGE_KEY = "pulperia.selection.v2";

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
  listedAvailabilityState: AvailabilityState;
  listedConfirmedAt: string;
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

export function selectionToPrepareItems(lines: SelectionLine[]): Array<{
  offer_id: string;
  request: SelectionRequest;
}> {
  return lines.map((line) => ({
    offer_id: line.offerId,
    request: line.request,
  }));
}

export function requestSummary(line: SelectionLine): string {
  if (line.offerClass === "stocked_product") {
    const request = line.request as { quantity: number };
    return `${request.quantity} unidad${request.quantity === 1 ? "" : "es"}`;
  }
  if (line.offerClass === "scheduled_food") {
    const request = line.request as {
      quantity: number;
      requested_window_start: string;
    };
    return `${request.quantity} para ${new Date(request.requested_window_start).toLocaleString("es-HN")}`;
  }
  return (line.request as { scope: string }).scope;
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
    (line.listedAvailabilityState === "available" ||
      line.listedAvailabilityState === "limited" ||
      line.listedAvailabilityState === "unavailable" ||
      line.listedAvailabilityState === "on_request") &&
    typeof line.listedConfirmedAt === "string"
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
    return Number.isInteger(request.quantity) && Number(request.quantity) > 0;
  }
  if (offerClass === "scheduled_food") {
    return (
      Number.isInteger(request.quantity) &&
      Number(request.quantity) > 0 &&
      typeof request.requested_window_start === "string" &&
      typeof request.requested_window_end === "string"
    );
  }
  return typeof request.scope === "string" && request.scope.trim().length > 0;
}
