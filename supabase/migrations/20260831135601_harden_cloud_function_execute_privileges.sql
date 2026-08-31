-- Hosted Supabase can grant EXECUTE directly to Data API roles when functions
-- are created. Revoke those defaults and expose only the audited RPC surface.

alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

do $$
declare
  function_signature text;
begin
  for function_signature in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      function_signature
    );
  end loop;
end;
$$;

grant execute on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
) to anon, authenticated;
grant execute on function public.offer_request_context_token(uuid)
  to anon, authenticated;
grant execute on function public.record_public_event(text)
  to anon, authenticated;

grant execute on function public.abort_offer_media_upload(uuid) to authenticated;
grant execute on function public.account_deletion_pending() to authenticated;
grant execute on function public.begin_account_deletion() to authenticated;
grant execute on function public.begin_offer_media_deletion(uuid, uuid) to authenticated;
grant execute on function public.complete_offer_media_upload(uuid) to authenticated;
grant execute on function public.confirm_account_media_deleted(text[]) to authenticated;
grant execute on function public.confirm_offer_freshness(uuid) to authenticated;
grant execute on function public.confirm_request_understood(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.finalize_account_deletion() to authenticated;
grant execute on function public.finalize_offer_media_deletion(uuid, uuid) to authenticated;
grant execute on function public.get_account_deletion_paths(integer) to authenticated;
grant execute on function public.get_handoff(uuid) to authenticated;
grant execute on function public.get_metrics_summary() to authenticated;
grant execute on function public.get_my_presences() to authenticated;
grant execute on function public.get_my_request_batches() to authenticated;
grant execute on function public.get_my_seller_requests(uuid) to authenticated;
grant execute on function public.get_operator_reports() to authenticated;
grant execute on function public.is_operator() to authenticated;
grant execute on function public.mark_handoff_opened(uuid) to authenticated;
grant execute on function public.prepare_request_batch(jsonb) to authenticated;
grant execute on function public.purge_expired_requests() to authenticated, service_role;
grant execute on function public.reserve_offer_media_upload(uuid) to authenticated;
grant execute on function public.restore_offer_media_deletion(uuid, uuid) to authenticated;
grant execute on function public.review_report(uuid, text, text) to authenticated;
grant execute on function public.set_saved_locality(boolean) to authenticated;
grant execute on function public.submit_report(uuid, uuid, text, text) to authenticated;
grant execute on function public.upsert_offer(
  uuid, public.offer_class, text, text, integer, public.price_mode, text,
  public.availability_model, public.availability_state, jsonb,
  public.fulfillment_mode[], public.offer_status, uuid, boolean
) to authenticated;
grant execute on function public.upsert_offer_maintained(
  uuid, public.offer_class, text, text, integer, public.price_mode, text,
  public.availability_model, public.availability_state, jsonb,
  public.fulfillment_mode[], public.offer_status, uuid, boolean, integer
) to authenticated;
grant execute on function public.upsert_seller_presence(
  text, text, public.presence_mode, text, text, text, double precision,
  double precision, boolean, public.presence_status, uuid
) to authenticated;
