"use server";

import { redirect } from "next/navigation";
import { OFFER_IMAGE_MAX_COUNT, processOfferImage } from "@/lib/image";
import { parseLempirasToCents } from "@/lib/money";
import { normalizeWhatsapp } from "@/lib/phone";
import { requireSession } from "@/lib/session";
import { getOwnedMedia, getOwnedPresence } from "@/lib/seller-data";
import type { OfferKind, OfferStatus, PresenceStatus } from "@/lib/seller";
import type { Availability, PresenceKind } from "@/lib/catalog";
import type { PriceMode } from "@/lib/money";

export async function savePresenceAction(formData: FormData) {
  const { supabase } = await requireSession("/vender");
  const existing = await getOwnedPresence();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as PresenceKind;
  const status = String(formData.get("status") ?? "draft") as PresenceStatus;
  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp") ?? ""));
  const confirmed = formData.get("location_public_confirmed") === "on";
  const lat = parseCoord(formData.get("lat"));
  const lng = parseCoord(formData.get("lng"));

  if (!name) redirect(presenceError("name", existing?.id));
  if (kind !== "physical" && kind !== "virtual") {
    redirect(presenceError("kind", existing?.id));
  }
  if (!whatsapp) redirect(presenceError("whatsapp", existing?.id));
  if (status !== "draft" && status !== "published" && status !== "archived") {
    redirect(presenceError("status", existing?.id));
  }
  if (kind === "physical" && status === "published" && !confirmed) {
    redirect(presenceError("pin", existing?.id));
  }

  const { error } = await supabase.rpc("upsert_seller_presence", {
    p_name: name,
    p_description: description,
    p_kind: kind,
    p_whatsapp_e164: whatsapp,
    p_lat: kind === "physical" ? lat : null,
    p_lng: kind === "physical" ? lng : null,
    p_location_public_confirmed: kind === "physical" && confirmed,
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
  const kind = String(formData.get("kind") ?? "product") as OfferKind;
  const price = parseLempirasToCents(String(formData.get("price") ?? ""));
  const priceMode = String(formData.get("price_mode") ?? "fixed") as PriceMode;
  const unit = String(formData.get("unit") ?? "").trim();
  const availability = String(
    formData.get("availability") ?? "available",
  ) as Availability;
  const status = String(formData.get("status") ?? "draft") as OfferStatus;

  if (!title) redirect(offerError("title", offerId));
  if (kind !== "product" && kind !== "service") {
    redirect(offerError("kind", offerId));
  }
  if (price === null) redirect(offerError("price", offerId));
  if (priceMode !== "fixed" && priceMode !== "from") {
    redirect(offerError("price", offerId));
  }
  if (
    availability !== "available" &&
    availability !== "limited" &&
    availability !== "unavailable"
  ) {
    redirect(offerError("availability", offerId));
  }
  if (
    status !== "draft" &&
    status !== "published" &&
    status !== "paused" &&
    status !== "archived"
  ) {
    redirect(offerError("status", offerId));
  }

  const { data, error } = await supabase.rpc("upsert_offer", {
    p_presence_id: presence.id,
    p_kind: kind,
    p_title: title,
    p_description: description,
    p_price_cents: price,
    p_price_mode: priceMode,
    p_unit: unit,
    p_availability: availability,
    p_status: status,
    p_id: offerId,
    p_confirm: false,
  });
  if (error || !data) {
    redirect(offerError("save", offerId));
  }

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
  const { supabase } = await requireSession("/mi-pulperia");
  const { data: current, error: readError } = await supabase
    .from("offers")
    .select(
      "id, kind, title, description, price_cents, price_mode, unit, availability",
    )
    .eq("id", offerId)
    .eq("presence_id", presence.id)
    .maybeSingle();
  if (readError || !current) {
    redirect(`/mi-pulperia/ofertas/${offerId}?error=save`);
  }
  const { error } = await supabase.rpc("upsert_offer", {
    p_presence_id: presence.id,
    p_kind: current.kind,
    p_title: current.title,
    p_description: current.description,
    p_price_cents: current.price_cents,
    p_price_mode: current.price_mode,
    p_unit: current.unit,
    p_availability: current.availability,
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
  if (text.includes("published_physical_is_located")) return "bounds";
  if (text.includes("virtual_without_coordinates")) return "kind";
  if (text.includes("whatsapp")) return "whatsapp";
  return "save";
}

function parseCoord(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
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
    .upload(path, processed, {
      contentType: "image/webp",
      upsert: true,
    });
  if (upload.error) return false;

  const { error } = await supabase.from("offer_media").insert({
    offer_id: offerId,
    storage_path: path,
    alt_text: "",
    sort_order: sort,
  });
  return !error;
}
