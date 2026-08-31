import type { OwnedPresence } from "@/lib/seller";

export function PresenceSelector({
  presences,
  activeId,
  action,
}: {
  presences: OwnedPresence[];
  activeId: string;
  action: string;
}) {
  if (presences.length < 2) return null;

  return (
    <form action={action} method="get">
      <label htmlFor="active-presence">Pulpería activa</label>{" "}
      <select id="active-presence" name="presence" defaultValue={activeId}>
        {presences.map((presence) => (
          <option key={presence.id} value={presence.id}>
            {presence.name}
          </option>
        ))}
      </select>{" "}
      <button type="submit">Cambiar</button>
    </form>
  );
}
