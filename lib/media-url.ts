import { publicSupabaseConfig } from "@/lib/env";

export function mediaPublicUrl(storagePath: string): string | null {
  const config = publicSupabaseConfig();
  if (!config) return null;
  return `${config.url.replace(/\/$/, "")}/storage/v1/object/public/offer-media/${storagePath}`;
}
