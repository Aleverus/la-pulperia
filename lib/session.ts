import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireSession(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/ingresar?next=${encodeURIComponent(nextPath)}`);
  }
  return { supabase, user };
}

export async function requireOperator(nextPath: string) {
  const session = await requireSession(nextPath);
  const { data, error } = await session.supabase.rpc("is_operator");
  if (error || data !== true) redirect("/");
  return session;
}
