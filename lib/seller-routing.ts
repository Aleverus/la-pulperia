import type { OwnedPresence } from "@/lib/seller";

export function selectOwnedPresence(
  presences: OwnedPresence[],
  requestedId: string | null,
): OwnedPresence | null {
  const requested = requestedId
    ? presences.find((presence) => presence.id === requestedId)
    : null;
  if (requested) return requested;

  return presences.reduce<OwnedPresence | null>((selected, presence) => {
    if (!selected || presence.id.localeCompare(selected.id) < 0) {
      return presence;
    }
    return selected;
  }, null);
}

export function sellerUrl(
  path: string,
  presenceId: string,
  extra: Record<string, string | undefined> = {},
): string {
  const query = new URLSearchParams({ presence: presenceId });
  for (const [key, value] of Object.entries(extra)) {
    if (value) query.set(key, value);
  }
  return `${path}?${query.toString()}`;
}
