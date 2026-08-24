-- Public catalog hides WhatsApp and owner identity. Mutations go through RPCs.

create view public.catalog_presences
with (security_invoker = false, security_barrier = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.kind,
  p.served_city,
  case
    when p.kind = 'physical' and p.location_public_confirmed
      then p.location
    else null
  end as location,
  case
    when p.kind = 'physical' and p.location_public_confirmed
      then extensions.st_y(p.location::extensions.geometry)
    else null
  end as lat,
  case
    when p.kind = 'physical' and p.location_public_confirmed
      then extensions.st_x(p.location::extensions.geometry)
    else null
  end as lng,
  p.status,
  p.created_at,
  p.updated_at
from public.seller_presences p
where p.status = 'published';

create view public.catalog_offers
with (security_invoker = false, security_barrier = true) as
select
  o.id,
  o.slug,
  o.kind,
  o.title,
  o.description,
  o.price_cents,
  o.price_mode,
  o.unit,
  o.availability,
  o.confirmed_at,
  o.presence_id,
  p.slug as presence_slug,
  p.name as presence_name,
  p.kind as presence_kind,
  o.created_at,
  o.updated_at
from public.offers o
join public.seller_presences p on p.id = o.presence_id
where o.status = 'published'
  and p.status = 'published';

grant select on public.catalog_presences to anon, authenticated;
grant select on public.catalog_offers to anon, authenticated;

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy presence_owner_all on public.seller_presences
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy offer_owner_all on public.offers
  for all to authenticated
  using (
    exists (
      select 1 from public.seller_presences p
      where p.id = offers.presence_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.seller_presences p
      where p.id = offers.presence_id and p.owner_id = auth.uid()
    )
  );

create policy offer_media_owner_all on public.offer_media
  for all to authenticated
  using (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_media.offer_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_media.offer_id and p.owner_id = auth.uid()
    )
  );

create policy batches_buyer_select on public.request_batches
  for select to authenticated
  using (buyer_id = auth.uid());

create policy seller_requests_buyer_select on public.seller_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.request_batches b
      where b.id = seller_requests.batch_id and b.buyer_id = auth.uid()
    )
  );

create policy seller_requests_seller_select on public.seller_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.seller_presences p
      where p.id = seller_requests.presence_id and p.owner_id = auth.uid()
    )
  );

create policy request_items_buyer_select on public.request_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.seller_requests r
      join public.request_batches b on b.id = r.batch_id
      where r.id = request_items.seller_request_id and b.buyer_id = auth.uid()
    )
  );

create policy request_items_seller_select on public.request_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.seller_requests r
      join public.seller_presences p on p.id = r.presence_id
      where r.id = request_items.seller_request_id and p.owner_id = auth.uid()
    )
  );

create policy notes_public_select on public.public_context_notes
  for select to anon, authenticated
  using (true);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.seller_presences to authenticated;
grant select, insert, update, delete on public.offers to authenticated;
grant select, insert, update, delete on public.offer_media to authenticated;
grant select on public.request_batches to authenticated;
grant select on public.seller_requests to authenticated;
grant select on public.request_items to authenticated;
grant select on public.public_context_notes to anon, authenticated;

create or replace function public.search_offers(
  p_query text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  offer_id uuid,
  offer_slug text,
  title text,
  description text,
  price_cents integer,
  price_mode public.price_mode,
  unit text,
  availability public.availability,
  confirmed_at timestamptz,
  presence_id uuid,
  presence_slug text,
  presence_name text,
  presence_kind public.presence_kind,
  dist_meters double precision
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
      o.title as rtitle,
      o.description as rdescription,
      o.price_cents as rprice,
      o.price_mode as rmode,
      o.unit as runit,
      o.availability as ravail,
      o.confirmed_at as rconfirmed,
      p.id as rpresence,
      p.slug::text as rpslug,
      p.name as rpname,
      p.kind as rkind,
      case
        when p.kind = 'physical'
          and p.location is not null
          and p_lat is not null
          and p_lng is not null
          then extensions.st_distance(
            p.location,
            extensions.st_point(p_lng, p_lat)::extensions.geography
          )
        else null
      end as rdist,
      case o.availability
        when 'available' then 0
        when 'limited' then 1
        else 2
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
      and o.availability <> 'unavailable'
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
    ranked.rtitle,
    ranked.rdescription,
    ranked.rprice,
    ranked.rmode,
    ranked.runit,
    ranked.ravail,
    ranked.rconfirmed,
    ranked.rpresence,
    ranked.rpslug,
    ranked.rpname,
    ranked.rkind,
    ranked.rdist
  from ranked
  order by
    ranked.rel desc,
    ranked.avail_rank,
    ranked.fresh_rank,
    ranked.rdist nulls last,
    ranked.rtitle
  limit lim
  offset off;

  get diagnostics n = row_count;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values (q_norm, n, 'search');
end;
$$;

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

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'items_required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) el
    where (el->>'offer_id') is null
       or (el->>'quantity') is null
       or (el->>'quantity')::integer < 1
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
    and o.availability <> 'unavailable';

  if found_count is distinct from array_length(offer_ids, 1) then
    raise exception 'offer_not_public' using errcode = 'P0001';
  end if;

  insert into public.request_batches (buyer_id)
  values (uid)
  returning id into v_batch_id;

  insert into public.seller_requests (batch_id, presence_id, destination_e164, status)
  select distinct v_batch_id, p.id, p.whatsapp_e164, 'prepared'::public.request_status
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where o.id = any (offer_ids);

  insert into public.request_items (
    seller_request_id,
    offer_id,
    title_snapshot,
    quantity,
    price_cents_snapshot,
    price_mode_snapshot,
    unit_snapshot,
    availability_snapshot,
    confirmed_at_snapshot
  )
  select
    r.id,
    o.id,
    o.title,
    (el->>'quantity')::integer,
    o.price_cents,
    o.price_mode,
    o.unit,
    o.availability,
    o.confirmed_at
  from jsonb_array_elements(p_items) el
  join public.offers o on o.id = (el->>'offer_id')::uuid
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
    'destination_e164', r.destination_e164,
    'presence_name', p.name,
    'buyer_name', pr.display_name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', i.title_snapshot,
        'quantity', i.quantity,
        'price_cents', i.price_cents_snapshot,
        'price_mode', i.price_mode_snapshot
      ) order by i.title_snapshot)
      from public.request_items i
      where i.seller_request_id = r.id
    ), '[]'::jsonb)
  )
  into payload
  from public.seller_requests r
  join public.request_batches b on b.id = r.batch_id
  join public.seller_presences p on p.id = r.presence_id
  join public.profiles pr on pr.id = b.buyer_id
  where r.id = p_seller_request_id
    and b.buyer_id = uid;

  if payload is null then
    raise exception 'handoff_not_found' using errcode = 'P0001';
  end if;

  return payload;
end;
$$;

create or replace function public.mark_handoff_opened(p_seller_request_id uuid)
returns public.request_status
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  new_status public.request_status;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  update public.seller_requests r
  set
    status = 'handoff_opened',
    handoff_opened_at = coalesce(r.handoff_opened_at, now())
  from public.request_batches b
  where r.id = p_seller_request_id
    and b.id = r.batch_id
    and b.buyer_id = uid
  returning r.status into new_status;

  if new_status is null then
    raise exception 'handoff_not_found' using errcode = 'P0001';
  end if;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values (p_seller_request_id::text, 1, 'handoff_opened');

  return new_status;
end;
$$;

revoke all on function public.search_offers(text, double precision, double precision, integer, integer) from public;
revoke all on function public.prepare_request_batch(jsonb) from public;
revoke all on function public.get_handoff(uuid) from public;
revoke all on function public.mark_handoff_opened(uuid) from public;

grant execute on function public.search_offers(text, double precision, double precision, integer, integer)
  to anon, authenticated;
grant execute on function public.prepare_request_batch(jsonb) to authenticated;
grant execute on function public.get_handoff(uuid) to authenticated;
grant execute on function public.mark_handoff_opened(uuid) to authenticated;
