-- Plan 004: seller maintenance always operates on one explicit owned presence.

revoke all on function public.get_my_seller_requests() from public;
drop function public.get_my_seller_requests();

create function public.get_my_seller_requests(p_presence_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not exists (
    select 1
    from public.seller_presences p
    where p.id = p_presence_id and p.owner_id = uid
  ) then
    raise exception 'presence_not_found' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(row_payload order by prepared_at desc), '[]'::jsonb)
  into result
  from (
    select
      r.created_at as prepared_at,
      jsonb_build_object(
        'seller_request_id', r.id,
        'batch_id', r.batch_id,
        'presence_id', r.presence_id,
        'presence_name', r.presence_name_snapshot,
        'status', r.status,
        'prepared_at', r.created_at,
        'handoff_opened_at', r.handoff_opened_at,
        'seller_understood_at', r.seller_understood_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'title', i.title_snapshot,
            'offer_class', i.offer_class_snapshot,
            'price_cents', i.price_cents_snapshot,
            'price_mode', i.price_mode_snapshot,
            'unit', i.unit_snapshot,
            'availability_model', i.availability_model_snapshot,
            'availability_state', i.availability_state_snapshot,
            'availability_details', i.availability_details_snapshot,
            'confirmed_at', i.confirmed_at_snapshot,
            'presence_mode', i.presence_mode_snapshot,
            'coverage_label', i.coverage_label_snapshot,
            'service_territory', i.service_territory_snapshot,
            'fulfillment_modes', i.fulfillment_modes_snapshot,
            'request', i.request_payload
          ) order by i.title_snapshot)
          from public.request_items i
          where i.seller_request_id = r.id
        ), '[]'::jsonb)
      ) as row_payload
    from public.seller_requests r
    where r.presence_id = p_presence_id
  ) rows_for_seller;

  return result;
end;
$$;

revoke all on function public.get_my_seller_requests(uuid) from public;
grant execute on function public.get_my_seller_requests(uuid) to authenticated;
