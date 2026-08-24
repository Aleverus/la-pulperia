import { requireSession } from "@/lib/session";

export type RequestBatchSummary = {
  batch_id: string;
  created_at: string;
  expires_at: string;
  seller_count: number;
  handoff_opened_count: number;
};

export async function getMyRequestBatches(): Promise<RequestBatchSummary[]> {
  const { supabase } = await requireSession("/cuenta/solicitudes");
  const { data, error } = await supabase.rpc("get_my_request_batches");
  if (error) throw error;
  return (data ?? []) as RequestBatchSummary[];
}

export async function getSavedLocality(): Promise<string | null> {
  const { supabase } = await requireSession("/cuenta/ubicacion");
  const { data, error } = await supabase
    .from("profiles")
    .select("last_locality")
    .maybeSingle();
  if (error) throw error;
  return data?.last_locality ?? null;
}
