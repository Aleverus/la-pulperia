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
import {
  isOfferImageFileSizeAllowed,
  processOfferImage,
} from "@/lib/image";
import { deleteMediaRecoverably } from "@/lib/deletion";
import { parseLempirasToCents, type PriceMode } from "@/lib/money";
import { normalizeWhatsapp } from "@/lib/phone";
import { requireSession } from "@/lib/session";
import {
  getOwnedOffer,
  getOwnedPresenceById,
  getSellerRequests,
} from "@/lib/seller-data";
import { sellerUrl } from "@/lib/seller-routing";
import type { OfferStatus, PresenceStatus } from "@/lib/seller";

export async function savePresenceAction(formData: FormData) {
  const { supabase } = await requireSession("/vender");
  const presenceId = emptyToNull(String(formData.get("presence_id") ?? ""));
  const existing = presenceId
    ? await getOwnedPresenceById(presenceId)
    : null;
  if (presenceId && !existing) redirect("/mi-pulperia");
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

  const { data, error } = await supabase.rpc("upsert_seller_presence", {
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
  if (!data) redirect(presenceError("save", existing?.id));
  const savedPresenceId = String(data);
  if (!existing && formData.get("continue_to_offer") === "1") {
    redirect(
      sellerUrl("/mi-pulperia/ofertas/nueva", savedPresenceId, {
        retomar: "1",
      }),
    );
  }
  redirect(sellerUrl("/mi-pulperia", savedPresenceId));
}

export async function saveOfferAction(formData: FormData) {
  const presence = await requireOwnedPresenceFromForm(formData);
  const { supabase } = await requireSession("/mi-pulperia");
  const starterDraft = formData.get("starter_draft") === "1";

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

  if (!title) redirect(offerError("title", presence.id, offerId, starterDraft));
  if (!isOfferClass(offerClass)) {
    redirect(offerError("availability", presence.id, offerId, starterDraft));
  }
  if (
    (offerClass === "stocked_product" || offerClass === "scheduled_food") &&
    !unit
  ) {
    redirect(offerError("unit", presence.id, offerId, starterDraft));
  }
  if (!isPriceMode(priceMode) || (priceMode !== "quote" && price === null)) {
    redirect(offerError("price", presence.id, offerId, starterDraft));
  }
  if (!isAvailabilityState(availabilityState)) {
    redirect(offerError("availability", presence.id, offerId, starterDraft));
  }
  if (!isOfferStatus(status)) {
    redirect(offerError("status", presence.id, offerId, starterDraft));
  }
  if (fulfillmentModes.length < 1) {
    redirect(offerError("fulfillment", presence.id, offerId, starterDraft));
  }

  const contract = availabilityContract(offerClass, availabilityState, formData);
  if (!contract) {
    redirect(offerError("availability", presence.id, offerId, starterDraft));
  }

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
  if (error || !data) {
    redirect(
      offerError(
        classifyOfferError(error?.message),
        presence.id,
        offerId,
        starterDraft,
      ),
    );
  }

  const savedId = String(data);
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const uploaded = await storeOfferImage({
      supabase,
      offerId: savedId,
      file: image,
    });
    if (uploaded !== "ok") {
      redirect(
        sellerUrl(`/mi-pulperia/ofertas/${savedId}`, presence.id, {
          error: uploaded,
        }),
      );
    }
  }
  redirect(
    sellerUrl(`/mi-pulperia/ofertas/${savedId}`, presence.id, {
      starter:
        starterDraft ? "cleared" : undefined,
    }),
  );
}

export async function confirmOfferAction(formData: FormData) {
  const presence = await requireOwnedPresenceFromForm(formData);
  const offerId = String(formData.get("offer_id") ?? "");
  const returnToDashboard = formData.get("return_to") === "dashboard";
  const current = await getOwnedOffer(presence.id, offerId);
  if (!current) redirect(sellerUrl("/mi-pulperia", presence.id));
  const { supabase } = await requireSession("/mi-pulperia");
  const { error } = await supabase.rpc("confirm_offer_freshness", {
    p_offer_id: offerId,
  });
  if (error) {
    redirect(
      sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id, {
        error: "confirm",
      }),
    );
  }
  redirect(
    returnToDashboard
      ? sellerUrl("/mi-pulperia", presence.id, {
          ok: "fresh",
          offer: offerId,
        })
      : sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id, {
          ok: "fresh",
        }),
  );
}

export async function setOfferStatusAction(formData: FormData) {
  const presence = await requireOwnedPresenceFromForm(formData);
  const offerId = String(formData.get("offer_id") ?? "");
  const status = String(formData.get("status") ?? "") as OfferStatus;
  const current = await getOwnedOffer(presence.id, offerId);
  if (!current || !isOfferStatus(status)) {
    redirect(
      sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id, {
        error: "save",
      }),
    );
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
  if (error) {
    redirect(
      sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id, {
        error: "save",
      }),
    );
  }
  redirect(sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id));
}

export async function confirmRequestUnderstoodAction(formData: FormData) {
  const presence = await requireOwnedPresenceFromForm(formData);
  const sellerRequestId = String(formData.get("seller_request_id") ?? "");
  const requests = await getSellerRequests(presence.id);
  if (!requests.some((request) => request.seller_request_id === sellerRequestId)) {
    redirect(sellerUrl("/mi-pulperia/solicitudes", presence.id));
  }
  const { supabase } = await requireSession("/mi-pulperia/solicitudes");
  const { error } = await supabase.rpc("confirm_request_understood", {
    p_seller_request_id: sellerRequestId,
  });
  if (error) {
    redirect(
      sellerUrl("/mi-pulperia/solicitudes", presence.id, {
        error: "confirm",
      }),
    );
  }
  redirect(
    sellerUrl("/mi-pulperia/solicitudes", presence.id, {
      ok: "understood",
    }),
  );
}

export async function removeOfferImageAction(formData: FormData) {
  const presence = await requireOwnedPresenceFromForm(formData);
  const offerId = String(formData.get("offer_id") ?? "");
  const mediaId = String(formData.get("media_id") ?? "");
  const offer = await getOwnedOffer(presence.id, offerId);
  if (!offer) redirect(sellerUrl("/mi-pulperia", presence.id));
  const { supabase } = await requireSession("/mi-pulperia");
  const result = await deleteMediaRecoverably({
    begin: async () => {
      const { data, error } = await supabase.rpc(
        "begin_offer_media_deletion",
        { p_offer_id: offerId, p_media_id: mediaId },
      );
      if (error || typeof data !== "string") throw error ?? new Error("media");
      return data;
    },
    removeStorage: async (path) => {
      const { error } = await supabase.storage.from("offer-media").remove([path]);
      if (error) throw error;
    },
    restore: async () => {
      const { data, error } = await supabase.rpc(
        "restore_offer_media_deletion",
        { p_offer_id: offerId, p_media_id: mediaId },
      );
      if (error || data !== true) throw error ?? new Error("restore");
    },
    finalize: async () => {
      const { data, error } = await supabase.rpc(
        "finalize_offer_media_deletion",
        { p_offer_id: offerId, p_media_id: mediaId },
      );
      if (error || data !== true) throw error ?? new Error("finalize");
    },
  });
  if (!result.ok) {
    redirect(
      sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id, {
        error: result.pending ? "image_cleanup" : "image",
      }),
    );
  }
  redirect(sellerUrl(`/mi-pulperia/ofertas/${offerId}`, presence.id));
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
  return presenceId
    ? sellerUrl("/mi-pulperia", presenceId, { error: code })
    : `/vender?error=${encodeURIComponent(code)}`;
}

function offerError(
  code: string,
  presenceId: string,
  offerId: string | null,
  starterDraft = false,
) {
  const path = offerId
    ? `/mi-pulperia/ofertas/${offerId}`
    : "/mi-pulperia/ofertas/nueva";
  return sellerUrl(path, presenceId, {
    error: code,
    retomar: starterDraft ? "1" : undefined,
  });
}

async function requireOwnedPresenceFromForm(formData: FormData) {
  const presenceId = String(formData.get("presence_id") ?? "");
  if (!presenceId) redirect("/mi-pulperia");
  const presence = await getOwnedPresenceById(presenceId);
  if (!presence) redirect("/mi-pulperia");
  return presence;
}

function classifyPresenceError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("whatsapp_not_verified")) return "verification";
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
  offerId,
  file,
}: {
  supabase: Awaited<ReturnType<typeof requireSession>>["supabase"];
  offerId: string;
  file: File;
}): Promise<"ok" | "image" | "image_cleanup"> {
  if (!isOfferImageFileSizeAllowed(file.size)) return "image";

  let processed: Buffer;
  try {
    processed = await processOfferImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return "image";
  }

  const reservation = await supabase.rpc("reserve_offer_media_upload", {
    p_offer_id: offerId,
  });
  const reserved = parseMediaReservation(reservation.data);
  if (reservation.error || !reserved) return "image";

  const upload = await supabase.storage
    .from("offer-media")
    .upload(reserved.storagePath, processed, {
      contentType: "image/webp",
      upsert: false,
    });
  if (upload.error) {
    const abort = await supabase.rpc("abort_offer_media_upload", {
      p_media_id: reserved.mediaId,
    });
    return abort.error || abort.data !== true ? "image_cleanup" : "image";
  }

  const completed = await supabase.rpc("complete_offer_media_upload", {
    p_media_id: reserved.mediaId,
  });
  return completed.error || completed.data !== true ? "image_cleanup" : "ok";
}

function parseMediaReservation(value: unknown): {
  mediaId: string;
  storagePath: string;
} | null {
  if (!value || typeof value !== "object") return null;
  const mediaId = (value as { media_id?: unknown }).media_id;
  const storagePath = (value as { storage_path?: unknown }).storage_path;
  return typeof mediaId === "string" && typeof storagePath === "string"
    ? { mediaId, storagePath }
    : null;
}
