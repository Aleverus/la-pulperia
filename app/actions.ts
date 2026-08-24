"use server";

import { redirect } from "next/navigation";
import { cartToPrepareItems, type CartLine } from "@/lib/cart";
import { getCatalogOffersByIds } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/carrito"));
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
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? "/vender"));
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

export async function refreshCartAction(ids: string[]) {
  return getCatalogOffersByIds(ids);
}

export async function prepareBatchAction(lines: CartLine[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/ingresar?next=/carrito");
  }

  const { data, error } = await supabase.rpc("prepare_request_batch", {
    p_items: cartToPrepareItems(lines),
  });
  if (error || !data) {
    redirect("/carrito?error=prepare");
  }

  const payload = data as { batch_id: string };
  redirect(`/cuenta/solicitudes/${payload.batch_id}`);
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

function safeNext(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/carrito";
}
