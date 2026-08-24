export const SIGUATEPEQUE = {
  west: -87.95,
  east: -87.7,
  south: 14.5,
  north: 14.72,
} as const;

export const IMPRECISE_ACCURACY_M = 150;

export type GeoIssue =
  | "permission_denied"
  | "imprecise"
  | "out_of_coverage"
  | "unavailable";

export const GEO_ISSUE_LABEL: Record<GeoIssue, string> = {
  permission_denied:
    "No hay permiso de ubicación. Podés marcar el punto a mano.",
  imprecise: "El GPS es impreciso. Corregí el pin en el mapa antes de publicarlo.",
  out_of_coverage: "Esa ubicación está fuera de Siguatepeque.",
  unavailable: "Mapa no disponible. Revisá el permiso o marcá el punto a mano.",
};

export function withinSiguatepeque(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lng >= SIGUATEPEQUE.west &&
    lng <= SIGUATEPEQUE.east &&
    lat >= SIGUATEPEQUE.south &&
    lat <= SIGUATEPEQUE.north
  );
}

export function projectToMap(
  lat: number,
  lng: number,
): { x: number; y: number } {
  const x =
    ((lng - SIGUATEPEQUE.west) / (SIGUATEPEQUE.east - SIGUATEPEQUE.west)) * 100;
  const y =
    ((SIGUATEPEQUE.north - lat) / (SIGUATEPEQUE.north - SIGUATEPEQUE.south)) *
    100;
  return {
    x: clampPercent(x),
    y: clampPercent(y),
  };
}

export function unprojectFromMap(
  x: number,
  y: number,
): { lat: number; lng: number } {
  const lng =
    SIGUATEPEQUE.west +
    (clampPercent(x) / 100) * (SIGUATEPEQUE.east - SIGUATEPEQUE.west);
  const lat =
    SIGUATEPEQUE.north -
    (clampPercent(y) / 100) * (SIGUATEPEQUE.north - SIGUATEPEQUE.south);
  return { lat, lng };
}

export function classifyGeolocation(input: {
  errorCode?: number;
  lat?: number;
  lng?: number;
  accuracyM?: number;
}): GeoIssue | null {
  if (input.errorCode === 1) return "permission_denied";
  if (input.errorCode === 2 || input.errorCode === 3) return "unavailable";
  if (
    typeof input.lat !== "number" ||
    typeof input.lng !== "number" ||
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng)
  ) {
    return "unavailable";
  }
  if (!withinSiguatepeque(input.lat, input.lng)) return "out_of_coverage";
  if (
    typeof input.accuracyM === "number" &&
    input.accuracyM > IMPRECISE_ACCURACY_M
  ) {
    return "imprecise";
  }
  return null;
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
