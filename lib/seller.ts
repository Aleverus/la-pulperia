import type { Availability, PresenceKind } from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";

export type PresenceStatus = "draft" | "published" | "archived";
export type OfferStatus = "draft" | "published" | "paused" | "archived";
export type OfferKind = "product" | "service";

export type OwnedPresence = {
  id: string;
  name: string;
  slug: string;
  description: string;
  kind: PresenceKind;
  whatsapp_e164: string;
  status: PresenceStatus;
  location_public_confirmed: boolean;
  lat: number | null;
  lng: number | null;
};

export type OwnedOffer = {
  id: string;
  slug: string;
  kind: OfferKind;
  title: string;
  description: string;
  price_cents: number;
  price_mode: PriceMode;
  unit: string | null;
  availability: Availability;
  confirmed_at: string;
  status: OfferStatus;
};

export type OwnedMedia = {
  id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
};

export const PRESENCE_STATUS_LABEL: Record<PresenceStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  archived: "Archivada",
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  paused: "Pausada",
  archived: "Archivada",
};

export function parseLocation(
  location: unknown,
): { lat: number; lng: number } | null {
  if (!location) return null;
  if (typeof location === "string") {
    const match = location.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (!match) return null;
    const lng = Number(match[1]);
    const lat = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }
  if (typeof location !== "object") return null;
  const coords = (location as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const FORM_ERRORS: Record<string, string> = {
  name: "El nombre de la pulpería es obligatorio.",
  kind: "Elegí si la pulpería es física o virtual.",
  whatsapp: "El WhatsApp tiene que ser un número hondureño usable.",
  pin: "Para publicar un negocio físico hay que confirmar que el pin será público.",
  bounds: "El pin publicado tiene que quedar dentro de Siguatepeque.",
  status: "Ese estado no es válido.",
  save: "No se pudo guardar. Revisá los datos e intentá de nuevo.",
  title: "La oferta necesita un título.",
  price: "Toda oferta necesita un precio HNL, fijo o desde.",
  availability: "Elegí una disponibilidad.",
  image: "No se pudo guardar la imagen. Usá un archivo de foto de hasta 5 MB.",
  confirm: "No se pudo confirmar la vigencia.",
  signup: "No se pudo crear la cuenta de prueba.",
};

export function formErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return FORM_ERRORS[code] ?? "No se pudo completar esa acción.";
}
