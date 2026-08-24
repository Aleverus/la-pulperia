export type FreshnessBand = "recent" | "confirm" | "stale";

const MS_PER_DAY = 86_400_000;

export function freshnessBand(
  confirmedAt: Date,
  now: Date = new Date(),
): FreshnessBand {
  const days = Math.floor((now.getTime() - confirmedAt.getTime()) / MS_PER_DAY);
  if (days <= 7) return "recent";
  if (days <= 30) return "confirm";
  return "stale";
}

export const FRESHNESS_LABEL: Record<FreshnessBand, string> = {
  recent: "Confirmada recientemente",
  confirm: "Conviene confirmar",
  stale: "Información antigua",
};
