import type {
  AvailabilityDetails,
  AvailabilityModel,
  AvailabilityState,
  FulfillmentMode,
  OfferClass,
  PresenceMode,
} from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";

export type PresenceStatus = "draft" | "published" | "archived";
export type OfferStatus = "draft" | "published" | "paused" | "archived";
export type WhatsappVerificationStatus = "unverified" | "verified";

export type OwnedPresence = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mode: PresenceMode;
  whatsapp_e164: string;
  coverage_label: string | null;
  service_territory: string | null;
  status: PresenceStatus;
  location_public_confirmed: boolean;
  lat: number | null;
  lng: number | null;
  whatsapp_verification_status: WhatsappVerificationStatus;
  whatsapp_verified_at: string | null;
};

export type OwnedOffer = {
  id: string;
  slug: string;
  offer_class: OfferClass;
  title: string;
  description: string;
  price_cents: number | null;
  price_mode: PriceMode;
  unit: string | null;
  availability_model: AvailabilityModel;
  availability_state: AvailabilityState;
  availability_details: AvailabilityDetails;
  fulfillment_modes: FulfillmentMode[];
  confirmed_at: string;
  status: OfferStatus;
};

export type OwnedMedia = {
  id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  deletion_pending: boolean;
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
  name: "El nombre del negocio es obligatorio.",
  mode: "Elegí cómo atiende el negocio.",
  coverage: "La atención móvil necesita una cobertura declarada.",
  territory: "La atención remota necesita un territorio o alcance.",
  whatsapp: "El WhatsApp tiene que ser un número hondureño usable.",
  verification:
    "Guardá el borrador. Ese número debe verificarse antes de publicar el negocio.",
  pin: "Para publicar una ubicación fija hay que confirmar que el pin será público.",
  bounds: "El pin publicado tiene que quedar dentro de Siguatepeque.",
  status: "Ese estado no es válido.",
  save: "No se pudo guardar. Revisá los datos e intentá de nuevo.",
  title: "La oferta necesita un título.",
  price: "Revisá la modalidad y el precio publicado.",
  unit: "Los productos y encargos necesitan una unidad comercial.",
  availability: "La disponibilidad no corresponde a esta clase de oferta.",
  fulfillment: "Elegí una forma de cumplimiento compatible.",
  image:
    "No se pudo guardar la imagen. Usá JPEG, PNG o WebP de hasta 3 MB y dimensiones moderadas.",
  image_cleanup:
    "La imagen quedó en limpieza pendiente. Reintentá quitarla; no se publicará mientras tanto.",
  confirm: "No se pudo confirmar la vigencia.",
  signup: "No se pudo crear la cuenta de prueba.",
};

export function formErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return FORM_ERRORS[code] ?? "No se pudo completar esa acción.";
}
