import type { PriceMode } from "@/lib/money";

export const CART_STORAGE_KEY = "pulperia.cart.v1";

export type CartLine = {
  offerId: string;
  quantity: number;
  listedPriceCents: number;
  listedPriceMode: PriceMode;
  listedAvailability: string;
  listedConfirmedAt: string;
};

export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine);
  } catch {
    return [];
  }
}

export function upsertLine(lines: CartLine[], incoming: CartLine): CartLine[] {
  const rest = lines.filter((line) => line.offerId !== incoming.offerId);
  if (incoming.quantity < 1) return rest;
  return [...rest, incoming];
}

export function cartToPrepareItems(lines: CartLine[]): {
  offer_id: string;
  quantity: number;
}[] {
  return lines.map((line) => ({
    offer_id: line.offerId,
    quantity: line.quantity,
  }));
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Partial<CartLine>;
  return (
    typeof line.offerId === "string" &&
    typeof line.quantity === "number" &&
    line.quantity > 0 &&
    typeof line.listedPriceCents === "number" &&
    (line.listedPriceMode === "fixed" || line.listedPriceMode === "from") &&
    typeof line.listedAvailability === "string" &&
    typeof line.listedConfirmedAt === "string"
  );
}
