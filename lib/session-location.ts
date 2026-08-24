import { withinSiguatepeque } from "@/lib/geo";

export const LOCATION_COOKIE = "pulperia_session_location";

export type SessionLocation = { lat: number; lng: number };

export function serializeSessionLocation(location: SessionLocation): string {
  if (!withinSiguatepeque(location.lat, location.lng)) {
    throw new Error("Location outside Siguatepeque");
  }
  return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}

export function parseSessionLocation(
  value: string | undefined,
): SessionLocation | null {
  if (!value) return null;
  const [rawLat, rawLng, extra] = value.split(",");
  if (extra !== undefined || rawLat === undefined || rawLng === undefined) {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  return withinSiguatepeque(lat, lng) ? { lat, lng } : null;
}
