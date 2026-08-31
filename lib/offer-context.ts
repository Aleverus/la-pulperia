import {
  FULFILLMENT_MODE_LABEL,
  type AvailabilityDetails,
  type AvailabilityModel,
  type AvailabilityState,
  type FulfillmentMode,
  type OfferClass,
  type PresenceMode,
} from "@/lib/catalog";
import { freshnessBand } from "@/lib/freshness";

type AvailabilityContext = {
  offer_class: OfferClass;
  availability_model: AvailabilityModel;
  availability_state: AvailabilityState;
  availability_details: AvailabilityDetails;
};

type PresenceContext = {
  presence_mode: PresenceMode;
  coverage_label: string | null;
  service_territory: string | null;
};

const DATE_TIME = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Tegucigalpa",
});

export function offerAvailabilitySummary(
  offer: AvailabilityContext,
  now: Date = new Date(),
): string {
  if (
    offer.offer_class === "scheduled_food" &&
    offer.availability_state !== "unavailable" &&
    !isOfferEffectivelyAvailable(offer, now)
  ) {
    const detail = availabilityDetail(offer);
    return `La ventana publicada ya cerró y no admite pedidos.${detail ? ` ${detail}` : ""}`;
  }
  const state = availabilityLead(offer.offer_class, offer.availability_state);
  const detail = availabilityDetail(offer);
  return detail ? `${state} ${detail}` : state;
}

export function offerPresenceSummary(presence: PresenceContext): string {
  if (presence.presence_mode === "fixed_location") {
    return "Atiende desde una ubicación fija; si el punto fue confirmado, aparece en el mapa.";
  }
  if (presence.presence_mode === "mobile") {
    return (
      cleanDetail(presence.coverage_label) ??
      cleanDetail(presence.service_territory) ??
      "Atiende por cobertura móvil; confirmá si llega a tu zona."
    );
  }
  return (
    cleanDetail(presence.service_territory) ??
    cleanDetail(presence.coverage_label) ??
    "Atiende de forma remota; confirmá territorio y forma de entrega."
  );
}

export function offerFulfillmentSummary(modes: FulfillmentMode[]): string {
  if (modes.length === 0) return "La forma de cumplimiento se acuerda con el vendedor.";
  return modes.map((mode) => FULFILLMENT_MODE_LABEL[mode]).join(", ");
}

export function offerNextStep(offerClass: OfferClass): string {
  if (offerClass === "stocked_product") {
    return "Indicá cantidad; el vendedor confirma existencias, precio final y entrega.";
  }
  if (offerClass === "scheduled_food") {
    return "Indicá cantidad y ventana; el vendedor confirma cupo, horario y precio final.";
  }
  if (offerClass === "local_service") {
    return "Describí el trabajo y, si aplica, tu preferencia de cita; el vendedor confirma alcance, agenda y precio.";
  }
  return "Describí el alcance o plan; el vendedor confirma condiciones, entrega y precio.";
}

export function offerFreshnessSummary(
  confirmedAt: string,
  now: Date = new Date(),
): string {
  const band = freshnessBand(new Date(confirmedAt), now);
  if (band === "recent") {
    return "El vendedor confirmó esta información en los últimos 7 días.";
  }
  if (band === "confirm") {
    return "La última confirmación fue hace entre 8 y 30 días; conviene revisar si cambió.";
  }
  return "El vendedor no confirma esta información desde hace más de 30 días; puede haber cambiado.";
}

export function isOfferEffectivelyAvailable(
  offer: AvailabilityContext,
  now: Date = new Date(),
): boolean {
  if (offer.availability_state === "unavailable") return false;
  if (
    offer.offer_class !== "scheduled_food" ||
    offer.availability_model !== "window"
  ) {
    return true;
  }
  const endsAt = parseDate(offer.availability_details.ends_at);
  if (!endsAt || now.getTime() >= endsAt.getTime()) return false;
  const cutoffAt = parseDate(offer.availability_details.cutoff_at);
  return !cutoffAt || now.getTime() < cutoffAt.getTime();
}

export type RequestedWindowIssue =
  | "missing"
  | "invalid"
  | "closed"
  | "outside";

export function requestedWindowIssue(
  details: AvailabilityDetails,
  requestedStart: string,
  requestedEnd: string,
  now: Date = new Date(),
): RequestedWindowIssue | null {
  if (!requestedStart || !requestedEnd) return "missing";
  const publishedStart = parseDate(details.starts_at);
  const publishedEnd = parseDate(details.ends_at);
  const cutoffAt = parseDate(details.cutoff_at);
  const start = parseDate(requestedStart);
  const end = parseDate(requestedEnd);
  if (!publishedStart || !publishedEnd || !start || !end) return "invalid";
  if (
    now.getTime() >= publishedEnd.getTime() ||
    (cutoffAt && now.getTime() >= cutoffAt.getTime())
  ) {
    return "closed";
  }
  if (
    start.getTime() >= end.getTime() ||
    start.getTime() < publishedStart.getTime() ||
    end.getTime() > publishedEnd.getTime()
  ) {
    return "outside";
  }
  return null;
}

function availabilityLead(
  offerClass: OfferClass,
  state: AvailabilityState,
): string {
  if (state === "unavailable") return "Publicada como no disponible.";
  if (offerClass === "stocked_product") {
    return state === "limited"
      ? "Existencia publicada como limitada."
      : state === "on_request"
        ? "Existencia bajo solicitud."
        : "Existencia publicada como disponible.";
  }
  if (offerClass === "scheduled_food") {
    return state === "limited"
      ? "Ventana publicada con capacidad limitada."
      : state === "on_request"
        ? "Ventana bajo solicitud."
        : "Ventana publicada como disponible.";
  }
  if (offerClass === "local_service") {
    return state === "limited"
      ? "Agenda publicada como limitada."
      : state === "on_request"
        ? "Atención bajo solicitud."
        : "Agenda publicada como disponible.";
  }
  return state === "limited"
    ? "Capacidad de entrega publicada como limitada."
    : state === "on_request"
      ? "Entrega bajo solicitud."
      : "Oferta digital publicada como activa.";
}

function availabilityDetail(offer: AvailabilityContext): string | null {
  const details = offer.availability_details;
  if (offer.offer_class === "scheduled_food") {
    const startsAt = formatDateTime(details.starts_at);
    const endsAt = formatDateTime(details.ends_at);
    const cutoffAt = formatDateTime(details.cutoff_at);
    const capacity = cleanDetail(details.capacity_note);
    return [
      startsAt && endsAt ? `Ventana: ${startsAt} a ${endsAt}.` : null,
      cutoffAt ? `Pedido antes de ${cutoffAt}.` : null,
      capacity,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ") || null;
  }
  if (
    offer.offer_class === "local_service" ||
    offer.offer_class === "digital_offer"
  ) {
    if (offer.availability_model === "schedule") {
      const nextAvailable = formatDateTime(details.next_available_at);
      const scheduleNote = cleanDetail(details.schedule_note);
      return [
        nextAvailable ? `Próxima disponibilidad: ${nextAvailable}.` : null,
        scheduleNote,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ") || null;
    }
    return cleanDetail(details.requirements);
  }
  return cleanDetail(details.stock_note);
}

function formatDateTime(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_TIME.format(date);
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanDetail(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}
