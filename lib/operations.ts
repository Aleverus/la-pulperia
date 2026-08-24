import { createPublicClient } from "@/lib/supabase/public";
import { requireOperator } from "@/lib/session";

export type PublicContextNote = {
  id: string;
  body: string;
  published_at: string;
};

export type OperatorReport = {
  report_id: string;
  report_status: "open" | "dismissed" | "noted" | "content_removed";
  category: string;
  explanation: string;
  created_at: string;
  target_kind: "offer" | "presence";
  target_id: string;
  target_name: string;
  target_slug: string;
};

export type MetricsSummary = {
  events: Record<
    | "search"
    | "offer_open"
    | "cart_add"
    | "request_prepared"
    | "handoff_opened"
    | "seller_update",
    number
  >;
  useful_searches: number;
  empty_searches: number;
  published_presences: { physical: number; virtual: number };
};

export async function getPublicContextNotes(input: {
  offerId?: string;
  presenceId?: string;
}): Promise<PublicContextNote[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("public_context_notes")
    .select("id, body, published_at")
    .order("published_at", { ascending: false });
  query = input.offerId
    ? query.eq("offer_id", input.offerId)
    : query.eq("presence_id", input.presenceId ?? "");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PublicContextNote[];
}

export async function recordPublicEvent(
  eventKind: "offer_open" | "cart_add",
): Promise<void> {
  const supabase = createPublicClient();
  await supabase.rpc("record_public_event", { p_event_kind: eventKind });
}

export async function getOperationSnapshot(): Promise<{
  reports: OperatorReport[];
  metrics: MetricsSummary;
}> {
  const { supabase } = await requireOperator("/operacion/reportes");
  const [reportsResult, metricsResult] = await Promise.all([
    supabase.rpc("get_operator_reports"),
    supabase.rpc("get_metrics_summary"),
  ]);
  if (reportsResult.error) throw reportsResult.error;
  if (metricsResult.error) throw metricsResult.error;
  return {
    reports: (reportsResult.data ?? []) as OperatorReport[],
    metrics: metricsResult.data as MetricsSummary,
  };
}
