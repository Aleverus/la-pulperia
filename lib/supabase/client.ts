import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "@/lib/env";

export function createClient() {
  const config = publicSupabaseConfig();
  if (!config) {
    throw new Error("supabase_env_missing");
  }

  return createBrowserClient(config.url, config.key);
}
