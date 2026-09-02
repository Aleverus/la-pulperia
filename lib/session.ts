import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireSession(nextPath: string) {
  const { supabase, user } = await getSession();
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
