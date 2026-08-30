"use server";

import { redirect } from "next/navigation";
import type {
  AvailabilityDetails,
  AvailabilityModel,
  AvailabilityState,
  FulfillmentMode,
  OfferClass,
  PresenceMode,
} from "@/lib/catalog";
import { OFFER_IMAGE_MAX_COUNT, processOfferImage } from "@/lib/image";
import { parseLempirasToCents, type PriceMode } from "@/lib/money";
import { normalizeWhatsapp } from "@/lib/phone";
import { requireSession } from "@/lib/session";
import {
  getOwnedMedia,
  getOwnedOffer,
  getOwnedPresence,
} from "@/lib/seller-data";
import type { OfferStatus, PresenceStatus } from "@/lib/seller";

export async function savePresenceAction(formData: FormData) {
  const { supabase } = await requireSession("/vender");
  const existing = await getOwnedPresence();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const mode = String(formData.get("mode") ?? "") as PresenceMode;
  const status = String(formData.get("status") ?? "draft") as PresenceStatus;
  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp") ?? ""));
  const coverage = emptyToNull(String(formData.get("coverage_label") ?? ""));
  const territory = emptyToNull(
    String(formData.get("service_territory") ?? ""),
  );
  const confirmed = formData.get("location_public_confirmed") === "on";
  const lat = parseCoord(formData.get("lat"));
  const lng = parseCoord(formData.get("lng"));

  if (!name) redirect(presenceError("name", existing?.id));
  if (!isPresenceMode(mode)) redirect(presenceError("mode", existing?.id));
  if (mode === "mobile" && !coverage) {
    redirect(presenceError("coverage", existing?.id));
  }
  if (mode === "remote" && !territory) {
    redirect(presenceError("territory", existing?.id));
  }
  if (!whatsapp) redirect(presenceError("whatsapp", existing?.id));
  if (status !== "draft" && status !== "published" && status !== "archived") {
    redirect(presenceError("status", existing?.id));
  }
  if (mode === "fixed_location" && status === "published" && !confirmed) {
    redirect(presenceError("pin", existing?.id));
  }

  const { error } = await supabase.rpc("upsert_seller_presence", {
    p_name: name,
    p_description: description,
    p_mode: mode,
    p_whatsapp_e164: whatsapp,
    p_coverage_label: mode === "mobile" ? coverage : null,
    p_service_territory: mode === "remote" ? territory : null,
    p_lat: mode === "fixed_location" ? lat : null,
    p_lng: mode === "fixed_location" ? lng : null,
    p_location_public_confirmed: mode === "fixed_location" && confirmed,
    p_status: status,
    p_id: existing?.id ?? null,
  });

  if (error) {
    redirect(presenceError(classifyPresenceError(error.message), existing?.id));
  }
  redirect("/mi-pulperia");
}

export async function saveOfferAction(formData: FormData) {
  const presence = await getOwnedPresence();
  if (!presence) redirect("/vender");
  const { supabase, user } = await requireSession("/mi-pulperia");

  const offerId = emptyToNull(String(formData.get("offer_id") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const offerClass = String(
    formData.get("offer_class") ?? "stocked_product",
  ) as OfferClass;
  const priceMode = String(formData.get("price_mode") ?? "fixed") as PriceMode;
  const rawPrice = String(formData.get("price") ?? "");
  const price = priceMode === "quote" ? null : parseLempirasToCents(rawPrice);
  const unit = String(formData.get("unit") ?? "").trim();
  const availabilityState = String(
    formData.get("availability_state") ?? "available",
  ) as AvailabilityState;
  const status = String(formData.get("status") ?? "draft") as OfferStatus;
  const fulfillmentModes = formData
    .getAll("fulfillment_modes")
    .map(String)
    .filter(isFulfillmentMode);

  if (!title) redirect(offerError("title", offerId));
  if (!isOfferClass(offerClass)) redirect(offerError("availability", offerId));
  if (!isPriceMode(priceMode) || (priceMode !== "quote" && price === null)) {
    redirect(offerError("price", offerId));
  }
  if (!isAvailabilityState(availabilityState)) {
    redirect(offerError("availability", offerId));
  }
  if (!isOfferStatus(status)) redirect(offerError("status", offerId));
  if (fulfillmentModes.length < 1) {
    redirect(offerError("fulfillment", offerId));
  }

  const contract = availabilityContract(offerClass, availabilityState, formData);
  if (!contract) redirect(offerError("availability", offerId));

  const { data, error } = await supabase.rpc("upsert_offer_maintained", {
    p_presence_id: presence.id,
    p_offer_class: offerClass,
    p_title: title,
    p_description: description,
    p_price_cents: price,
    p_price_mode: priceMode,
    p_unit: unit,
    p_availability_model: contract.model,
    p_availability_state: availabilityState,
    p_availability_details: contract.details,
    p_fulfillment_modes: fulfillmentModes,
    p_status: status,
    p_id: offerId,
    p_confirm: false,
    p_duration_seconds: maintenanceDurationSeconds(
      formData.get("maintenance_started_at_ms"),
    ),
  });
  if (error || !data) redirect(offerError(classifyOfferError(error?.message), offerId));

  const savedId = String(data);
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const uploaded = await storeOfferImage({
      supabase,
      userId: user.id,
      offerId: savedId,
      file: image,
    });
    if (!uploaded) redirect(`/mi-pulperia/ofertas/${savedId}?error=image`);
  }
  redirect(`/mi-pulperia/ofertas/${savedId}`);
}

export async function confirmOfferAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "");
  const { supabase } = await requireSession("/mi-pulperia");
  const { error } = await supabase.rpc("confirm_offer_freshness", {
    p_offer_id: offerId,
  });
  if (error) redirect(`/mi-pulperia/ofertas/${offerId}?error=confirm`);
  redirect(`/mi-pulperia/ofertas/${offerId}?ok=fresh`);
}

export async function setOfferStatusAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "");
  const status = String(formData.get("status") ?? "") as OfferStatus;
  const presence = await getOwnedPresence();
  if (!presence) redirect("/vender");
  const current = await getOwnedOffer(presence.id, offerId);
  if (!current || !isOfferStatus(status)) {
    redirect(`/mi-pulperia/ofertas/${offerId}?error=save`);
  }
  const { supabase } = await requireSession("/mi-pulperia");
  const { error } = await supabase.rpc("upsert_offer", {
    p_presence_id: presence.id,
    p_offer_class: current.offer_class,
    p_title: current.title,
    p_description: current.description,
    p_price_cents: current.price_cents,
    p_price_mode: current.price_mode,
    p_unit: current.unit,
    p_availability_model: current.availability_model,
    p_availability_state: current.availability_state,
    p_availability_details: current.availability_details,
    p_fulfillment_modes: current.fulfillment_modes,
    p_status: status,
    p_id: offerId,
    p_confirm: false,
  });
  if (error) redirect(`/mi-pulperia/ofertas/${offerId}?error=save`);
  redirect(`/mi-pulperia/ofertas/${offerId}`);
}

export async function removeOfferImageAction(formData: FormData) {
  const offerId = String(formData.get("offer_id") ?? "");
  const mediaId = String(formData.get("media_id") ?? "");
  const { supabase } = await requireSession("/mi-pulperia");
  const { data: media } = await supabase
    .from("offer_media")
    .select("id, storage_path")
    .eq("id", mediaId)
    .eq("offer_id", offerId)
    .maybeSingle();
  if (!media) redirect(`/mi-pulperia/ofertas/${offerId}?error=image`);
  await supabase.storage.from("offer-media").remove([media.storage_path]);
  await supabase.from("offer_media").delete().eq("id", mediaId);
  redirect(`/mi-pulperia/ofertas/${offerId}`);
}

function availabilityContract(
  offerClass: OfferClass,
  state: AvailabilityState,
  formData: FormData,
): { model: AvailabilityModel; details: AvailabilityDetails } | null {
  if (offerClass === "stocked_product") {
    if (state === "on_request") return null;
    const stockNote = emptyToNull(String(formData.get("stock_note") ?? ""));
    return { model: "stock", details: stockNote ? { stock_note: stockNote } : {} };
  }
  if (offerClass === "scheduled_food") {
    if (state === "on_request") return null;
    const startsAt = localDateTimeWithOffset(formData.get("window_start"));
    const endsAt = localDateTimeWithOffset(formData.get("window_end"));
    const cutoffAt = localDateTimeWithOffset(formData.get("window_cutoff"));
    if (!startsAt || !endsAt) return null;
    const capacityNote = emptyToNull(
      String(formData.get("capacity_note") ?? ""),
    );
    return {
      model: "window",
      details: {
        starts_at: startsAt,
        ends_at: endsAt,
        ...(cutoffAt ? { cutoff_at: cutoffAt } : {}),
        ...(capacityNote ? { capacity_note: capacityNote } : {}),
      },
    };
  }
  if (state === "on_request") {
    const requirements = emptyToNull(
      String(formData.get("requirements") ?? ""),
    );
    return requirements
      ? { model: "on_request", details: { requirements } }
      : null;
  }
  const scheduleNote = emptyToNull(
    String(formData.get("schedule_note") ?? ""),
  );
  const nextAvailableAt = localDateTimeWithOffset(
    formData.get("next_available_at"),
  );
  if (!scheduleNote && !nextAvailableAt) return null;
  return {
    model: "schedule",
    details: {
      ...(nextAvailableAt ? { next_available_at: nextAvailableAt } : {}),
      ...(scheduleNote ? { schedule_note: scheduleNote } : {}),
    },
  };
}

function presenceError(code: string, presenceId?: string) {
  const path = presenceId ? "/mi-pulperia" : "/vender";
  return `${path}?error=${encodeURIComponent(code)}`;
}

function offerError(code: string, offerId: string | null) {
  const path = offerId
    ? `/mi-pulperia/ofertas/${offerId}`
    : "/mi-pulperia/ofertas/nueva";
  return `${path}?error=${encodeURIComponent(code)}`;
}

function classifyPresenceError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("published_fixed_location_is_located")) return "bounds";
  if (text.includes("mobile_presence_has_coverage")) return "coverage";
  if (text.includes("remote_presence_has_territory")) return "territory";
  if (text.includes("whatsapp")) return "whatsapp";
  return "save";
}

function classifyOfferError(message?: string): string {
  const text = message?.toLowerCase() ?? "";
  if (text.includes("fulfillment")) return "fulfillment";
  if (text.includes("contract")) return "availability";
  return "save";
}

function isPresenceMode(value: string): value is PresenceMode {
  return value === "fixed_location" || value === "mobile" || value === "remote";
}

function isOfferClass(value: string): value is OfferClass {
  return (
    value === "stocked_product" ||
    value === "scheduled_food" ||
    value === "local_service" ||
    value === "digital_offer"
  );
}

function isPriceMode(value: string): value is PriceMode {
  return value === "fixed" || value === "from" || value === "quote";
}

function isAvailabilityState(value: string): value is AvailabilityState {
  return (
    value === "available" ||
    value === "limited" ||
    value === "unavailable" ||
    value === "on_request"
  );
}

function isFulfillmentMode(value: string): value is FulfillmentMode {
  return (
    value === "pickup" ||
    value === "local_coverage" ||
    value === "seller_shipping" ||
    value === "appointment" ||
    value === "digital_delivery" ||
    value === "direct_agreement"
  );
}

function isOfferStatus(value: string): value is OfferStatus {
  return (
    value === "draft" ||
    value === "published" ||
    value === "paused" ||
    value === "archived"
  );
}

function parseCoord(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function localDateTimeWithOffset(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-06:00`
    : null;
}

function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function maintenanceDurationSeconds(
  value: FormDataEntryValue | null,
): number | null {
  if (typeof value !== "string" || !/^\d{10,16}$/.test(value)) return null;
  const startedAt = Number(value);
  if (!Number.isSafeInteger(startedAt)) return null;
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  return elapsed >= 0 && elapsed <= 7200 ? elapsed : null;
}

async function storeOfferImage({
  supabase,
  userId,
  offerId,
  file,
}: {
  supabase: Awaited<ReturnType<typeof requireSession>>["supabase"];
  userId: string;
  offerId: string;
  file: File;
}): Promise<boolean> {
  const existing = await getOwnedMedia(offerId);
  if (existing.length >= OFFER_IMAGE_MAX_COUNT) return false;

  let processed: Buffer;
  try {
    processed = await processOfferImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return false;
  }

  const sort = existing.length;
  const path = `${userId}/${offerId}/${sort}.webp`;
  const upload = await supabase.storage
    .from("offer-media")
    .upload(path, processed, { contentType: "image/webp", upsert: true });
  if (upload.error) return false;

  const { error } = await supabase.from("offer_media").insert({
    offer_id: offerId,
    storage_path: path,
    alt_text: "",
    sort_order: sort,
  });
  return !error;
}
