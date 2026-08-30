"use server";

import { redirect } from "next/navigation";
import { requireOperator, requireSession } from "@/lib/session";

export async function submitReportAction(formData: FormData) {
  const returnPath = safeReturn(String(formData.get("return_path") ?? "/"));
  const { supabase } = await requireSession(returnPath);
  const offerId = emptyToNull(String(formData.get("offer_id") ?? ""));
  const presenceId = emptyToNull(String(formData.get("presence_id") ?? ""));
  const category = String(formData.get("category") ?? "");
  const explanation = String(formData.get("explanation") ?? "").trim();
  const { error } = await supabase.rpc("submit_report", {
    p_offer_id: offerId,
    p_presence_id: presenceId,
    p_category: category,
    p_explanation: explanation,
  });
  redirect(withStatus(returnPath, "reporte", error ? "error" : "recibido"));
}

export async function reviewReportAction(formData: FormData) {
  const { supabase } = await requireOperator("/operacion/reportes");
  const reportId = String(formData.get("report_id") ?? "");
  const action = String(formData.get("review_action") ?? "");
  const publicNote = emptyToNull(String(formData.get("public_note") ?? ""));
  const { error } = await supabase.rpc("review_report", {
    p_report_id: reportId,
    p_action: action,
    p_public_note: publicNote,
  });
  redirect(`/operacion/reportes?${error ? "error=revision" : "ok=revision"}`);
}

export async function recordPublicEventAction(
  eventKind: "offer_open" | "selection_add",
) {
  const { recordPublicEvent } = await import("@/lib/operations");
  await recordPublicEvent(eventKind);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function safeReturn(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function withStatus(path: string, key: string, value: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${value}`;
}
