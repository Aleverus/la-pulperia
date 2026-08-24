"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export async function setSavedLocalityAction(formData: FormData) {
  const remember = String(formData.get("remember") ?? "") === "true";
  const { supabase } = await requireSession("/cuenta/ubicacion");
  const { error } = await supabase.rpc("set_saved_locality", {
    p_remember: remember,
  });
  redirect(`/cuenta/ubicacion?${error ? "error=ubicacion" : "ok=ubicacion"}`);
}

export async function deleteAccountAction(formData: FormData) {
  if (String(formData.get("confirmation") ?? "") !== "BORRAR") {
    redirect("/cuenta?error=confirmacion");
  }

  const { supabase } = await requireSession("/cuenta");
  const { data: media, error: mediaReadError } = await supabase
    .from("offer_media")
    .select("storage_path");
  if (mediaReadError) redirect("/cuenta?error=eliminacion");

  const paths = (media ?? []).map(({ storage_path }) => storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("offer-media")
      .remove(paths);
    if (storageError) redirect("/cuenta?error=archivos");
  }

  const { data, error } = await supabase.rpc("delete_my_account");
  if (error || data !== true) redirect("/cuenta?error=eliminacion");
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?cuenta=borrada");
}
