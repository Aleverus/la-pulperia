export function publicSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function hasPublicSupabaseEnv(): boolean {
  return publicSupabaseConfig() !== null;
}

export function localTestAuthEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.PULPERIA_LOCAL_TEST_AUTH !== "true") return false;
  try {
    const hostname = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1";
  } catch {
    return false;
  }
}
