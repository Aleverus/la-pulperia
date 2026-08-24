export type PriceMode = "fixed" | "from";

export function parseLempirasToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isInteger(cents) || cents <= 0) return null;
  return cents;
}

export function formatHnl(cents: number): string {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error("price_cents_invalid");
  }

  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `L ${grouped}.${fraction}`;
}

export function formatPublishedPrice(cents: number, mode: PriceMode): string {
  const amount = formatHnl(cents);
  return mode === "from" ? `desde ${amount}` : amount;
}
