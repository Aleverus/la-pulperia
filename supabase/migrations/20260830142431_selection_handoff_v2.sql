-- Corte 4: class-aware selection, reviewed context and an explicit seller
-- understanding signal. The latter is not acceptance, payment, sale or
-- fulfillment and therefore remains separate from request_status.

alter table public.seller_requests
  add column seller_understood_at timestamptz,
  add constraint seller_understanding_follows_handoff check (
    seller_understood_at is null
    or (
      handoff_opened_at is not null
      and seller_understood_at >= handoff_opened_at
    )
  );

comment on column public.seller_requests.seller_understood_at is
  'Voluntary seller confirmation that the structured request was understood; not acceptance, sale, payment or fulfillment.';

create or replace function public.prepare_request_batch(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  v_batch_id uuid;
  offer_ids uuid[];
  found_count integer;
  result jsonb;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 30
  then
    raise exception 'items_required' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) el
    where jsonb_typeof(el) <> 'object'
      or not public.jsonb_has_only_keys(
        el,
        array['offer_id', 'request', 'context']
      )
      or jsonb_typeof(el->'offer_id') <> 'string'
      or jsonb_typeof(el->'request') <> 'object'
      or jsonb_typeof(el->'context') <> 'object'
      or not public.jsonb_has_only_keys(
        el->'context',
        array['confirmed_at']
      )
      or not (el->'context' ? 'confirmed_at')
      or jsonb_typeof(el->'context'->'confirmed_at') <> 'string'
      or not public.is_rfc3339(el->'context'->>'confirmed_at')
  ) then
    raise exception 'item_invalid' using errcode = '22023';
  end if;

  select array_agg(distinct (el->>'offer_id')::uuid)
  into offer_ids
  from jsonb_array_elements(p_items) el;
  if array_length(offer_ids, 1) <> jsonb_array_length(p_items) then
    raise exception 'duplicate_offer' using errcode = '22023';
  end if;

  perform 1
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where o.id = any (offer_ids)
  for update of o, p;

  select count(*) into found_count
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where o.id = any (offer_ids)
    and o.status = 'published'
    and p.status = 'published'
    and o.availability_state <> 'unavailable';
  if found_count is distinct from array_length(offer_ids, 1) then
    raise exception 'offer_not_public' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) el
    join public.offers o on o.id = (el->>'offer_id')::uuid
    where o.confirmed_at is distinct from
      (el->'context'->>'confirmed_at')::timestamptz
  ) then
    raise exception 'offer_context_changed' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) el
    join public.offers o on o.id = (el->>'offer_id')::uuid
    where not public.valid_request_payload(o.offer_class, el->'request')
  ) then
    raise exception 'request_invalid' using errcode = '22023';
  end if;

  insert into public.request_batches (buyer_id)
  values (uid) returning id into v_batch_id;

  insert into public.seller_requests (
    batch_id, presence_id, destination_e164, status
  )
  select distinct
    v_batch_id,
    p.id,
    p.whatsapp_e164,
    'prepared'::public.request_status
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where o.id = any (offer_ids);

  insert into public.request_items (
    seller_request_id, offer_id, title_snapshot, price_cents_snapshot,
    price_mode_snapshot, unit_snapshot, confirmed_at_snapshot,
    offer_class_snapshot, availability_model_snapshot,
    availability_state_snapshot, availability_details_snapshot,
    presence_mode_snapshot, coverage_label_snapshot,
    fulfillment_modes_snapshot, request_payload
  )
  select
    r.id,
    o.id,
    o.title,
    o.price_cents,
    o.price_mode,
    o.unit,
    o.confirmed_at,
    o.offer_class,
    o.availability_model,
    o.availability_state,
    o.availability_details,
    p.mode,
    coalesce(p.coverage_label, p.service_territory),
    coalesce(
      array(
        select f.mode
        from public.offer_fulfillment_modes f
        where f.offer_id = o.id
        order by f.mode::text
      ),
      '{}'::public.fulfillment_mode[]
    ),
    el->'request'
  from jsonb_array_elements(p_items) el
  join public.offers o on o.id = (el->>'offer_id')::uuid
  join public.seller_presences p on p.id = o.presence_id
  join public.seller_requests r
    on r.batch_id = v_batch_id and r.presence_id = o.presence_id;

  select jsonb_agg(jsonb_build_object(
    'seller_request_id', r.id,
    'presence_id', r.presence_id,
    'presence_name', p.name,
    'presence_slug', p.slug
  ) order by p.name)
  into result
  from public.seller_requests r
  join public.seller_presences p on p.id = r.presence_id
  where r.batch_id = v_batch_id;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values ('', jsonb_array_length(result), 'request_prepared');

  return jsonb_build_object('batch_id', v_batch_id, 'requests', result);
end;
$$;

create or replace function public.get_handoff(p_seller_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  payload jsonb;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select jsonb_build_object(
    'seller_request_id', r.id,
    'batch_id', r.batch_id,
    'status', r.status,
    'handoff_opened_at', r.handoff_opened_at,
    'seller_understood_at', r.seller_understood_at,
    'destination_e164', r.destination_e164,
    'presence_name', p.name,
    'buyer_name', pr.display_name,
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
        'fulfillment_modes', i.fulfillment_modes_snapshot,
        'request', i.request_payload
      ) order by i.title_snapshot)
      from public.request_items i
      where i.seller_request_id = r.id
    ), '[]'::jsonb)
  ) into payload
  from public.seller_requests r
  join public.request_batches b on b.id = r.batch_id
  join public.seller_presences p on p.id = r.presence_id
  join public.profiles pr on pr.id = b.buyer_id
  where r.id = p_seller_request_id and b.buyer_id = uid;

  if payload is null then
    raise exception 'handoff_not_found' using errcode = 'P0001';
  end if;
  return payload;
end;
$$;

create function public.get_my_seller_requests()
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

  select coalesce(jsonb_agg(row_payload order by prepared_at desc), '[]'::jsonb)
  into result
  from (
    select
      r.created_at as prepared_at,
      jsonb_build_object(
        'seller_request_id', r.id,
        'batch_id', r.batch_id,
        'presence_name', p.name,
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
            'fulfillment_modes', i.fulfillment_modes_snapshot,
            'request', i.request_payload
          ) order by i.title_snapshot)
          from public.request_items i
          where i.seller_request_id = r.id
        ), '[]'::jsonb)
      ) as row_payload
    from public.seller_requests r
    join public.seller_presences p on p.id = r.presence_id
    where p.owner_id = uid
  ) rows_for_seller;

  return result;
end;
$$;

create function public.confirm_request_understood(p_seller_request_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  opened_at timestamptz;
  understood_at timestamptz;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select r.handoff_opened_at, r.seller_understood_at
  into opened_at, understood_at
  from public.seller_requests r
  join public.seller_presences p on p.id = r.presence_id
  where r.id = p_seller_request_id
    and p.owner_id = uid
  for update of r;

  if not found then
    raise exception 'seller_request_not_found' using errcode = 'P0001';
  end if;
  if opened_at is null then
    raise exception 'handoff_not_opened' using errcode = 'P0001';
  end if;

  if understood_at is null then
    update public.seller_requests
    set seller_understood_at = now()
    where id = p_seller_request_id
    returning seller_understood_at into understood_at;

    insert into public.search_events (
      query_normalized, result_count, event_kind
    ) values ('', 1, 'request_understood');
  end if;

  return understood_at;
end;
$$;

alter table public.search_events
  drop constraint search_events_event_kind_check;
alter table public.search_events
  add constraint search_events_event_kind_check check (
    event_kind in (
      'search', 'offer_open', 'selection_add', 'request_prepared',
      'handoff_opened', 'request_understood', 'seller_update'
    )
  );

create or replace function public.get_metrics_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_operator() then
    raise exception 'operator_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'events', jsonb_build_object(
      'search', count(*) filter (where event_kind = 'search'),
      'offer_open', count(*) filter (where event_kind = 'offer_open'),
      'selection_add', count(*) filter (where event_kind = 'selection_add'),
      'request_prepared', count(*) filter (where event_kind = 'request_prepared'),
      'handoff_opened', count(*) filter (where event_kind = 'handoff_opened'),
      'request_understood', count(*) filter (where event_kind = 'request_understood'),
      'seller_update', count(*) filter (where event_kind = 'seller_update')
    ),
    'useful_searches', count(*) filter (
      where event_kind = 'search' and result_count > 0
    ),
    'empty_searches', count(*) filter (
      where event_kind = 'search' and result_count = 0
    ),
    'published_presences', (
      select jsonb_build_object(
        'fixed_location', count(*) filter (where mode = 'fixed_location'),
        'mobile', count(*) filter (where mode = 'mobile'),
        'remote', count(*) filter (where mode = 'remote')
      )
      from public.seller_presences
      where status = 'published'
    )
  ) into result
  from public.search_events;

  return result;
end;
$$;

revoke all on function public.get_my_seller_requests() from public;
revoke all on function public.confirm_request_understood(uuid) from public;
revoke all on function public.prepare_request_batch(jsonb) from public;
revoke all on function public.get_handoff(uuid) from public;

grant execute on function public.get_my_seller_requests() to authenticated;
grant execute on function public.confirm_request_understood(uuid) to authenticated;
grant execute on function public.prepare_request_batch(jsonb) to authenticated;
grant execute on function public.get_handoff(uuid) to authenticated;
