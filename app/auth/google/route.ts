import { NextResponse } from "next/server";
import { safeAuthNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeAuthNext(requestUrl.searchParams.get("next") ?? "/carrito");
  const callbackUrl = new URL("/auth/callback", requestUrl.origin);
  callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    const errorUrl = new URL("/ingresar", requestUrl.origin);
    errorUrl.searchParams.set("next", next);
    errorUrl.searchParams.set("error", "oauth");
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(data.url);
}
