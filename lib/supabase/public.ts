import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "@/lib/env";

export function createPublicClient() {
  const config = publicSupabaseConfig();
  if (!config) throw new Error("supabase_env_missing");

  return createSupabaseClient(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
