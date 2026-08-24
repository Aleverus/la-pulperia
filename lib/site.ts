import type { Availability } from "@/lib/catalog";

export const SITE_NAME = "La Pulpería";
export const SITE_DESCRIPTION =
  "Ofertas locales de Siguatepeque con precio publicado, frescura y contacto directo con cada vendedor.";

export function normalizeSiteOrigin(value?: string): string {
  if (!value) return "http://127.0.0.1:3001";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "http://127.0.0.1:3001";
    }
    return url.origin;
  } catch {
    return "http://127.0.0.1:3001";
  }
}

export const SITE_ORIGIN = normalizeSiteOrigin(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined),
);

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_ORIGIN}/`).toString();
}

export function metadataDescription(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 160
    ? normalized
    : `${normalized.slice(0, 157).trimEnd()}…`;
}

export function availabilitySchemaUrl(availability: Availability): string {
  const type = {
    available: "InStock",
    limited: "LimitedAvailability",
    unavailable: "OutOfStock",
  }[availability];
  return `https://schema.org/${type}`;
}
