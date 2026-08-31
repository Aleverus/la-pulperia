-- Plan 003: bind preparation to the complete reviewed context and snapshot
-- everything from rows locked by the same transaction.

alter table public.seller_requests
  add column presence_name_snapshot text,
  add column presence_slug_snapshot text;

update public.seller_requests r
set
  presence_name_snapshot = p.name,
  presence_slug_snapshot = p.slug::text
from public.seller_presences p
where p.id = r.presence_id;

alter table public.seller_requests
  alter column presence_name_snapshot set not null,
  alter column presence_slug_snapshot set not null;

create function public.fill_seller_request_presence_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.presence_name_snapshot is null or new.presence_slug_snapshot is null then
    select p.name, p.slug::text
    into new.presence_name_snapshot, new.presence_slug_snapshot
    from public.seller_presences p
    where p.id = new.presence_id;
  end if;
  return new;
end;
$$;

create trigger seller_request_presence_snapshot_trg
  before insert on public.seller_requests
  for each row execute function public.fill_seller_request_presence_snapshot();

alter table public.request_items
  add column service_territory_snapshot text;

create function public.offer_request_context_token(p_offer_id uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'offer_id', o.id::text,
          'offer_class', o.offer_class::text,
          'title', o.title,
          'price_cents', o.price_cents,
          'price_mode', o.price_mode::text,
          'unit', o.unit,
          'availability_model', o.availability_model::text,
          'availability_state', o.availability_state::text,
          'availability_details', o.availability_details,
          'confirmed_at_epoch', extract(epoch from o.confirmed_at),
          'fulfillment_modes', to_jsonb(coalesce(
            array(
              select f.mode::text
              from public.offer_fulfillment_modes f
              where f.offer_id = o.id
              order by f.mode::text
            ),
            '{}'::text[]
          )),
          'presence_id', p.id::text,
          'presence_name', p.name,
          'presence_mode', p.mode::text,
          'coverage_label', p.coverage_label,
          'service_territory', p.service_territory,
          'served_city', p.served_city,
          'location_public_confirmed', p.location_public_confirmed,
          'public_location', case
            when p.mode = 'fixed_location'
              and p.location_public_confirmed
              and p.location is not null
            then encode(
              extensions.st_asewkb(p.location::extensions.geometry),
              'hex'
            )
            else null
          end,
          'destination_e164', p.whatsapp_e164
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where o.id = p_offer_id
    and o.status = 'published'
    and p.status = 'published';
$$;

revoke all on function public.offer_request_context_token(uuid) from public;
grant execute on function public.offer_request_context_token(uuid)
  to anon, authenticated;

create or replace view public.catalog_offers
with (security_invoker = true, security_barrier = true) as
select
  o.id,
  o.slug,
  o.offer_class,
  o.title,
  o.description,
  o.price_cents,
  o.price_mode,
  o.unit,
  o.availability_model,
  o.availability_state,
  o.availability_details,
  o.confirmed_at,
  o.presence_id,
  p.slug as presence_slug,
  p.name as presence_name,
  p.mode as presence_mode,
  p.coverage_label,
  p.service_territory,
  coalesce(
    array(
      select f.mode
      from public.offer_fulfillment_modes f
      where f.offer_id = o.id
      order by f.mode::text
    ),
    '{}'::public.fulfillment_mode[]
  ) as fulfillment_modes,
  o.created_at,
  o.updated_at,
  public.offer_request_context_token(o.id) as request_context_token
from public.offers o
join public.seller_presences p on p.id = o.presence_id
where o.status = 'published'
  and p.status = 'published';

revoke all on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
) from public;

drop function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
);

create function public.search_offers(
  p_query text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_offer_class public.offer_class default null,
  p_presence_mode public.presence_mode default null,
  p_availability_state public.availability_state default null,
  p_sort text default 'organic'
)
returns table (
  offer_id uuid,
  offer_slug text,
  offer_class public.offer_class,
  title text,
  description text,
  price_cents integer,
  price_mode public.price_mode,
  unit text,
  availability_model public.availability_model,
  availability_state public.availability_state,
  availability_details jsonb,
  confirmed_at timestamptz,
  presence_id uuid,
  presence_slug text,
  presence_name text,
  presence_mode public.presence_mode,
  coverage_label text,
  service_territory text,
  fulfillment_modes public.fulfillment_mode[],
  dist_meters double precision,
  request_context_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  q_norm text := lower(public.immutable_unaccent(trim(coalesce(p_query, ''))));
  ts_q tsquery;
  lim integer := greatest(1, least(coalesce(p_limit, 20), 50));
  off integer := greatest(coalesce(p_offset, 0), 0);
  sort_mode text := case
    when p_sort in ('organic', 'recent', 'nearby') then p_sort
    else 'organic'
  end;
  n integer := 0;
begin
  if q_norm <> '' then
    ts_q := plainto_tsquery('spanish', q_norm);
  end if;

  return query
  with ranked as (
    select
      o.id as rid,
      o.slug::text as rslug,
      o.offer_class as rclass,
      o.title as rtitle,
      o.description as rdescription,
      o.price_cents as rprice,
      o.price_mode as rprice_mode,
      o.unit as runit,
      o.availability_model as ravailability_model,
      o.availability_state as ravailability_state,
      o.availability_details as ravailability_details,
      o.confirmed_at as rconfirmed,
      p.id as rpresence,
      p.slug::text as rpslug,
      p.name as rpname,
      p.mode as rpresence_mode,
      p.coverage_label as rcoverage_label,
      p.service_territory as rservice_territory,
      coalesce(
        array(
          select f.mode
          from public.offer_fulfillment_modes f
          where f.offer_id = o.id
          order by f.mode::text
        ),
        '{}'::public.fulfillment_mode[]
      ) as rfulfillment_modes,
      case
        when p.mode = 'fixed_location'
          and p.location is not null
          and p.location_public_confirmed
          and p_lat is not null
          and p_lng is not null
          then extensions.st_distance(
            p.location,
            extensions.st_point(p_lng, p_lat)::extensions.geography
          )
        else null
      end as rdist,
      case o.availability_state
        when 'available' then 0
        when 'limited' then 1
        when 'on_request' then 2
        else 3
      end as avail_rank,
      case
        when o.confirmed_at >= now() - interval '7 days' then 0
        when o.confirmed_at >= now() - interval '30 days' then 1
        else 2
      end as fresh_rank,
      case
        when q_norm = '' or ts_q is null then 0::real
        else greatest(
          ts_rank_cd(o.search_vector, ts_q),
          extensions.similarity(public.immutable_unaccent(o.title), q_norm)
        )
      end as rel
    from public.offers o
    join public.seller_presences p on p.id = o.presence_id
    where o.status = 'published'
      and p.status = 'published'
      and public.offer_effectively_available(
        o.offer_class,
        o.availability_state,
        o.availability_details,
        now()
      )
      and (p_offer_class is null or o.offer_class = p_offer_class)
      and (p_presence_mode is null or p.mode = p_presence_mode)
      and (
        p_availability_state is null
        or o.availability_state = p_availability_state
      )
      and (
        q_norm = ''
        or (ts_q is not null and o.search_vector @@ ts_q)
        or public.immutable_unaccent(o.title) % q_norm
        or public.immutable_unaccent(o.title) ilike '%' || q_norm || '%'
      )
  )
  select
    ranked.rid,
    ranked.rslug,
    ranked.rclass,
    ranked.rtitle,
    ranked.rdescription,
    ranked.rprice,
    ranked.rprice_mode,
    ranked.runit,
    ranked.ravailability_model,
    ranked.ravailability_state,
    ranked.ravailability_details,
    ranked.rconfirmed,
    ranked.rpresence,
    ranked.rpslug,
    ranked.rpname,
    ranked.rpresence_mode,
    ranked.rcoverage_label,
    ranked.rservice_territory,
    ranked.rfulfillment_modes,
    ranked.rdist,
    public.offer_request_context_token(ranked.rid)
  from ranked
  order by
    case when sort_mode = 'nearby' then ranked.rdist end asc nulls last,
    case when sort_mode = 'recent' then ranked.rconfirmed end desc,
    case when sort_mode = 'organic' then ranked.rel end desc,
    ranked.avail_rank,
    ranked.fresh_rank,
    ranked.rdist nulls last,
    ranked.rtitle,
    ranked.rid
  limit lim
  offset off;

  get diagnostics n = row_count;
  insert into public.search_events (query_normalized, result_count, event_kind)
  values (q_norm, n, 'search');
end;
$$;

revoke all on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
) from public;

grant execute on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
) to anon, authenticated;

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
        array['request_context_token']
      )
      or jsonb_typeof(el->'context'->'request_context_token') <> 'string'
      or (el->'context'->>'request_context_token') !~ '^[0-9a-f]{64}$'
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
    and public.offer_effectively_available(
      o.offer_class,
      o.availability_state,
      o.availability_details,
      now()
    );
  if found_count is distinct from array_length(offer_ids, 1) then
    raise exception 'offer_not_public' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) el
    join public.offers o on o.id = (el->>'offer_id')::uuid
    where public.offer_request_context_token(o.id) is distinct from
      el->'context'->>'request_context_token'
  ) then
    raise exception 'offer_context_changed' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) el
    join public.offers o on o.id = (el->>'offer_id')::uuid
    where not public.valid_request_payload(o.offer_class, el->'request')
      or (
        o.offer_class = 'scheduled_food'
        and not public.valid_requested_window(
          o.availability_details,
          el->'request',
          now()
        )
      )
  ) then
    raise exception 'request_invalid' using errcode = '22023';
  end if;

  insert into public.request_batches (buyer_id)
  values (uid) returning id into v_batch_id;

  insert into public.seller_requests (
    batch_id, presence_id, destination_e164, status,
    presence_name_snapshot, presence_slug_snapshot
  )
  select distinct
    v_batch_id,
    p.id,
    p.whatsapp_e164,
    'prepared'::public.request_status,
    p.name,
    p.slug::text
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where o.id = any (offer_ids);

  insert into public.request_items (
    seller_request_id, offer_id, title_snapshot, price_cents_snapshot,
    price_mode_snapshot, unit_snapshot, confirmed_at_snapshot,
    offer_class_snapshot, availability_model_snapshot,
    availability_state_snapshot, availability_details_snapshot,
    presence_mode_snapshot, coverage_label_snapshot,
    service_territory_snapshot, fulfillment_modes_snapshot, request_payload
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
    p.coverage_label,
    p.service_territory,
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
    'presence_name', r.presence_name_snapshot,
    'presence_slug', r.presence_slug_snapshot
  ) order by r.presence_name_snapshot)
  into result
  from public.seller_requests r
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
    'presence_name', r.presence_name_snapshot,
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
        'service_territory', i.service_territory_snapshot,
        'fulfillment_modes', i.fulfillment_modes_snapshot,
        'request', i.request_payload
      ) order by i.title_snapshot)
      from public.request_items i
      where i.seller_request_id = r.id
    ), '[]'::jsonb)
  ) into payload
  from public.seller_requests r
  join public.request_batches b on b.id = r.batch_id
  join public.profiles pr on pr.id = b.buyer_id
  where r.id = p_seller_request_id and b.buyer_id = uid;

  if payload is null then
    raise exception 'handoff_not_found' using errcode = 'P0001';
  end if;
  return payload;
end;
$$;

create or replace function public.get_my_seller_requests()
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
    join public.seller_presences p on p.id = r.presence_id
    where p.owner_id = uid
  ) rows_for_seller;

  return result;
end;
$$;
