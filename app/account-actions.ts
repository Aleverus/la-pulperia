"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAccountRecoverably } from "@/lib/deletion";
import { requireSession } from "@/lib/session";

export async function updateAccountProfileAction(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatarPath = String(formData.get("avatar_path") ?? "").trim();
  if (displayName.length < 1 || displayName.length > 80) {
    redirect("/cuenta?error=perfil");
  }
  if (avatarPath.length > 1024) redirect("/cuenta?error=foto");

  const { supabase, user } = await requireSession("/cuenta");
  let verifiedAvatarPath: string | null = null;
  if (avatarPath) {
    const { data, error } = await supabase
      .from("offer_media")
      .select("storage_path")
      .eq("storage_path", avatarPath)
      .eq("deletion_pending", false)
      .limit(1);
    const [media] = data ?? [];
    if (error || !media) redirect("/cuenta?error=foto");
    verifiedAvatarPath = media.storage_path;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, avatar_url: verifiedAvatarPath })
    .eq("id", user.id);
  if (error) redirect("/cuenta?error=perfil");

  revalidatePath("/cuenta");
  redirect("/cuenta?perfil=guardado");
}

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
  const result = await finishAccountDeletion(supabase);
  if (!result.ok) redirect(`/cuenta?error=${accountDeletionError(result.phase)}`);
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?cuenta=borrada");
}

export async function retryAccountDeletionAction() {
  const { supabase } = await requireSession("/cuenta");
  const result = await finishAccountDeletion(supabase);
  if (!result.ok) redirect(`/cuenta?error=${accountDeletionError(result.phase)}`);
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?cuenta=borrada");
}

type SessionSupabase = Awaited<ReturnType<typeof requireSession>>["supabase"];

async function finishAccountDeletion(supabase: SessionSupabase) {
  return deleteAccountRecoverably({
    begin: async () => {
      const { data, error } = await supabase.rpc("begin_account_deletion");
      if (error || typeof data !== "string") throw error ?? new Error("begin");
    },
    getPaths: async () => {
      const { data, error } = await supabase.rpc("get_account_deletion_paths", {
        p_limit: 1000,
      });
      if (error || !Array.isArray(data)) throw error ?? new Error("paths");
      if (!data.every((path) => typeof path === "string")) {
        throw new Error("paths");
      }
      return data as string[];
    },
    removeStorage: async (paths) => {
      const { error } = await supabase.storage.from("offer-media").remove(paths);
      if (error) throw error;
    },
    confirmRemoved: async (paths) => {
      const { error } = await supabase.rpc("confirm_account_media_deleted", {
        p_paths: paths,
      });
      if (error) throw error;
    },
    finalize: async () => {
      const { data, error } = await supabase.rpc("finalize_account_deletion");
      if (error || data !== true) throw error ?? new Error("finalize");
    },
  });
}

function accountDeletionError(phase: string) {
  if (phase === "storage") return "archivos";
  if (phase === "prepare") return "eliminacion";
  return "limpieza";
}
