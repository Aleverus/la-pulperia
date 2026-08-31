"use server";

import { redirect } from "next/navigation";
import { getCatalogOffersByIds } from "@/lib/data";
import { safeAuthNext } from "@/lib/auth";
import { localTestAuthEnabled } from "@/lib/env";
import {
  parseSelection,
  selectionNeedsOfferReview,
  selectionToPrepareItems,
  type SelectionLine,
} from "@/lib/selection";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  if (!localTestAuthEnabled()) redirect("/ingresar?error=auth_disabled");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeAuthNext(String(formData.get("next") ?? "/carrito"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/ingresar?next=${encodeURIComponent(next)}&error=1`);
  }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  if (!localTestAuthEnabled()) redirect("/ingresar?error=auth_disabled");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeAuthNext(String(formData.get("next") ?? "/vender"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName || "Vecino" },
    },
  });
  if (error) {
    redirect(`/ingresar?next=${encodeURIComponent(next)}&error=signup`);
  }
  const { error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (sessionError) {
    redirect(`/ingresar?next=${encodeURIComponent(next)}&error=signup`);
  }
  redirect(next);
}

export async function refreshSelectionAction(ids: string[]) {
  if (
    !Array.isArray(ids) ||
    ids.length > 30 ||
    ids.some((id) => !UUID.test(id))
  ) {
    return [];
  }
  return getCatalogOffersByIds(ids);
}

export async function prepareBatchAction(lines: SelectionLine[]) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 30) {
    return { ok: false, reason: "prepare_failed" } as const;
  }
  let validated: SelectionLine[];
  try {
    validated = parseSelection(JSON.stringify(lines));
  } catch {
    return { ok: false, reason: "prepare_failed" } as const;
  }
  if (validated.length !== lines.length) {
    return { ok: false, reason: "prepare_failed" } as const;
  }
  if (validated.some(selectionNeedsOfferReview)) {
    return { ok: false, reason: "context_changed" } as const;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "auth_required" } as const;
  }

  const { data, error } = await supabase.rpc("prepare_request_batch", {
    p_items: selectionToPrepareItems(validated),
  });
  if (error || !data) {
    return {
      ok: false,
      reason: error?.message.includes("offer_context_changed")
        ? "context_changed"
        : error?.message.includes("offer_not_public") ||
            error?.message.includes("offer_window_closed")
          ? "offer_not_public"
        : "prepare_failed",
    } as const;
  }

  const payload = data as { batch_id: string };
  return { ok: true, batchId: payload.batch_id } as const;
}

export async function markHandoffAction(sellerRequestId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_handoff_opened", {
    p_seller_request_id: sellerRequestId,
  });
  if (error) {
    throw error;
  }
}


const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
