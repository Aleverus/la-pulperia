-- Corte 1: migrate the published v1 vertical to the offer contract v2.
-- Historical migrations remain unchanged; every v1 row is backfilled before
-- the old columns and enum types are removed.

drop view public.catalog_offer_media;
drop view public.catalog_offers;
drop view public.catalog_presences;

drop function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.presence_kind, text
);
drop function public.upsert_seller_presence(
  text, text, public.presence_kind, text, double precision, double precision,
  boolean, public.presence_status, uuid
);
drop function public.upsert_offer(
  uuid, public.offer_kind, text, text, integer, public.price_mode, text,
  public.availability, public.offer_status, uuid, boolean
);
drop function public.get_my_presences();

create type public.offer_class as enum (
  'stocked_product',
  'scheduled_food',
  'local_service',
  'digital_offer'
);
create type public.price_mode_v2 as enum ('fixed', 'from', 'quote');
create type public.availability_model as enum (
  'stock',
  'window',
  'schedule',
  'on_request'
);
create type public.availability_state as enum (
  'available',
  'limited',
  'unavailable',
  'on_request'
);
create type public.presence_mode as enum (
  'fixed_location',
  'mobile',
  'remote'
);
create type public.fulfillment_mode as enum (
  'pickup',
  'local_coverage',
  'seller_shipping',
  'appointment',
  'digital_delivery',
  'direct_agreement'
);

alter table public.seller_presences
  add column mode public.presence_mode,
  add column coverage_label text,
  add column service_territory text;

update public.seller_presences
set
  mode = case kind
    when 'physical' then 'fixed_location'::public.presence_mode
    else 'mobile'::public.presence_mode
  end,
  coverage_label = case kind
    when 'virtual' then 'Siguatepeque; confirmar cobertura con el vendedor'
    else null
  end;

alter table public.seller_presences
  alter column mode set not null,
  drop constraint virtual_without_coordinates,
  drop constraint published_physical_is_located,
  drop column kind,
  add constraint non_fixed_presence_without_coordinates check (
    mode = 'fixed_location'
    or (location is null and location_public_confirmed = false)
  ),
  add constraint published_fixed_location_is_located check (
    status <> 'published'
    or mode <> 'fixed_location'
    or (
      location is not null
      and location_public_confirmed
      and public.within_siguatepeque(location)
    )
  ),
  add constraint mobile_presence_has_coverage check (
    mode <> 'mobile'
    or (
      coverage_label is not null
      and char_length(btrim(coverage_label)) between 1 and 240
    )
  ),
  add constraint remote_presence_has_territory check (
    mode <> 'remote'
    or (
      service_territory is not null
      and char_length(btrim(service_territory)) between 1 and 240
    )
  ),
  add constraint presence_labels_bounded check (
    (coverage_label is null or char_length(coverage_label) <= 240)
    and (service_territory is null or char_length(service_territory) <= 240)
  );

alter table public.offers
  add column offer_class public.offer_class,
  add column price_mode_v2 public.price_mode_v2,
  add column availability_model public.availability_model,
  add column availability_state public.availability_state,
  add column availability_details jsonb not null default '{}'::jsonb;

update public.offers
set
  offer_class = 'stocked_product',
  price_mode_v2 = price_mode::text::public.price_mode_v2,
  availability_model = 'stock',
  availability_state = availability::text::public.availability_state,
  availability_details = '{}'::jsonb;

alter table public.offers
  alter column offer_class set not null,
  alter column price_mode_v2 set not null,
  alter column availability_model set not null,
  alter column availability_state set not null,
  alter column price_cents drop not null,
  drop constraint offers_price_cents_check,
  drop column kind,
  drop column price_mode,
  drop column availability;

alter table public.offers
  rename column price_mode_v2 to price_mode;

alter table public.request_items
  add column offer_class_snapshot public.offer_class,
  add column price_mode_snapshot_v2 public.price_mode_v2,
  add column availability_model_snapshot public.availability_model,
  add column availability_state_snapshot public.availability_state,
  add column availability_details_snapshot jsonb not null default '{}'::jsonb,
  add column presence_mode_snapshot public.presence_mode,
  add column coverage_label_snapshot text,
  add column fulfillment_modes_snapshot public.fulfillment_mode[] not null
    default array['direct_agreement'::public.fulfillment_mode],
  add column request_payload jsonb;

update public.request_items i
set
  offer_class_snapshot = 'stocked_product',
  price_mode_snapshot_v2 = i.price_mode_snapshot::text::public.price_mode_v2,
  availability_model_snapshot = 'stock',
  availability_state_snapshot = i.availability_snapshot::text::public.availability_state,
  presence_mode_snapshot = p.mode,
  coverage_label_snapshot = coalesce(p.coverage_label, p.service_territory),
  request_payload = jsonb_build_object('quantity', i.quantity)
from public.seller_requests r
join public.seller_presences p on p.id = r.presence_id
where r.id = i.seller_request_id;

alter table public.request_items
  alter column offer_class_snapshot set not null,
  alter column price_mode_snapshot_v2 set not null,
  alter column availability_model_snapshot set not null,
  alter column availability_state_snapshot set not null,
  alter column presence_mode_snapshot set not null,
  alter column request_payload set not null,
  alter column price_cents_snapshot drop not null,
  drop constraint request_items_price_cents_snapshot_check,
  drop column price_mode_snapshot,
  drop column availability_snapshot,
  drop column quantity;

alter table public.request_items
  rename column price_mode_snapshot_v2 to price_mode_snapshot;

drop type public.offer_kind;
drop type public.presence_kind;
drop type public.availability;
drop type public.price_mode;
alter type public.price_mode_v2 rename to price_mode;

create or replace function public.jsonb_has_only_keys(
  input jsonb,
  allowed text[]
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_typeof(input) = 'object'
    and not exists (
      select 1
      from jsonb_object_keys(input) as key
      where not (key = any (allowed))
    );
$$;

create or replace function public.is_rfc3339(input text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if input is null
    or input !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$'
  then
    return false;
  end if;
  perform input::timestamptz;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.valid_offer_contract(
  p_class public.offer_class,
  p_price_mode public.price_mode,
  p_price_cents integer,
  p_model public.availability_model,
  p_state public.availability_state,
  p_details jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  starts_at timestamptz;
  ends_at timestamptz;
  cutoff_at timestamptz;
begin
  if (p_price_mode = 'quote' and p_price_cents is not null)
    or (p_price_mode <> 'quote' and coalesce(p_price_cents, 0) <= 0)
    or jsonb_typeof(p_details) <> 'object'
  then
    return false;
  end if;

  if p_class = 'stocked_product' then
    return p_model = 'stock'
      and p_state <> 'on_request'
      and public.jsonb_has_only_keys(p_details, array['stock_note'])
      and (
        not (p_details ? 'stock_note')
        or (
          jsonb_typeof(p_details->'stock_note') = 'string'
          and char_length(p_details->>'stock_note') <= 500
        )
      );
  end if;

  if p_class = 'scheduled_food' then
    if p_model <> 'window'
      or p_state = 'on_request'
      or not public.jsonb_has_only_keys(
        p_details,
        array['starts_at', 'ends_at', 'cutoff_at', 'capacity_note']
      )
      or not public.is_rfc3339(p_details->>'starts_at')
      or not public.is_rfc3339(p_details->>'ends_at')
    then
      return false;
    end if;
    starts_at := (p_details->>'starts_at')::timestamptz;
    ends_at := (p_details->>'ends_at')::timestamptz;
    if starts_at >= ends_at then
      return false;
    end if;
    if p_details ? 'cutoff_at' then
      if not public.is_rfc3339(p_details->>'cutoff_at') then
        return false;
      end if;
      cutoff_at := (p_details->>'cutoff_at')::timestamptz;
      if cutoff_at > ends_at then
        return false;
      end if;
    end if;
    return not (p_details ? 'capacity_note')
      or (
        jsonb_typeof(p_details->'capacity_note') = 'string'
        and char_length(p_details->>'capacity_note') <= 500
      );
  end if;

  if p_model = 'schedule' then
    if p_class not in ('local_service', 'digital_offer')
      or p_state = 'on_request'
      or not public.jsonb_has_only_keys(
        p_details,
        array['next_available_at', 'schedule_note']
      )
      or not (p_details ? 'next_available_at' or p_details ? 'schedule_note')
    then
      return false;
    end if;
    return (
      not (p_details ? 'next_available_at')
      or public.is_rfc3339(p_details->>'next_available_at')
    ) and (
      not (p_details ? 'schedule_note')
      or (
        jsonb_typeof(p_details->'schedule_note') = 'string'
        and char_length(btrim(p_details->>'schedule_note')) between 1 and 500
      )
    );
  end if;

  if p_model = 'on_request' then
    return p_class in ('local_service', 'digital_offer')
      and p_state = 'on_request'
      and public.jsonb_has_only_keys(p_details, array['requirements'])
      and jsonb_typeof(p_details->'requirements') = 'string'
      and char_length(btrim(p_details->>'requirements')) between 1 and 500;
  end if;

  return false;
end;
$$;

create or replace function public.valid_request_payload(
  p_class public.offer_class,
  payload jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  quantity numeric;
begin
  if jsonb_typeof(payload) <> 'object' then
    return false;
  end if;

  if p_class = 'stocked_product' then
    if not public.jsonb_has_only_keys(
      payload,
      array['quantity', 'substitution_ok']
    ) or jsonb_typeof(payload->'quantity') <> 'number' then
      return false;
    end if;
    quantity := (payload->>'quantity')::numeric;
    return quantity >= 1
      and quantity = trunc(quantity)
      and (
        not (payload ? 'substitution_ok')
        or jsonb_typeof(payload->'substitution_ok') = 'boolean'
      );
  end if;

  if p_class = 'scheduled_food' then
    if not public.jsonb_has_only_keys(
      payload,
      array[
        'quantity', 'variant', 'requested_window_start',
        'requested_window_end'
      ]
    ) or jsonb_typeof(payload->'quantity') <> 'number'
      or not public.is_rfc3339(payload->>'requested_window_start')
      or not public.is_rfc3339(payload->>'requested_window_end')
    then
      return false;
    end if;
    quantity := (payload->>'quantity')::numeric;
    return quantity >= 1
      and quantity = trunc(quantity)
      and (payload->>'requested_window_start')::timestamptz
        < (payload->>'requested_window_end')::timestamptz
      and (
        not (payload ? 'variant')
        or (
          jsonb_typeof(payload->'variant') = 'string'
          and char_length(payload->>'variant') <= 120
        )
      );
  end if;

  if p_class = 'local_service' then
    return public.jsonb_has_only_keys(
      payload,
      array['scope', 'appointment_preference', 'approximate_locality']
    )
      and jsonb_typeof(payload->'scope') = 'string'
      and char_length(btrim(payload->>'scope')) between 1 and 1000
      and (
        not (payload ? 'appointment_preference')
        or (
          jsonb_typeof(payload->'appointment_preference') = 'string'
          and char_length(payload->>'appointment_preference') <= 240
        )
      )
      and (
        not (payload ? 'approximate_locality')
        or (
          jsonb_typeof(payload->'approximate_locality') = 'string'
          and char_length(payload->>'approximate_locality') <= 80
        )
      );
  end if;

  if p_class = 'digital_offer' then
    return public.jsonb_has_only_keys(
      payload,
      array['scope', 'plan', 'reference_url']
    )
      and jsonb_typeof(payload->'scope') = 'string'
      and char_length(btrim(payload->>'scope')) between 1 and 1000
      and (
        not (payload ? 'plan')
        or (
          jsonb_typeof(payload->'plan') = 'string'
          and char_length(payload->>'plan') <= 120
        )
      )
      and (
        not (payload ? 'reference_url')
        or (
          jsonb_typeof(payload->'reference_url') = 'string'
          and char_length(payload->>'reference_url') <= 500
          and payload->>'reference_url' ~ '^https?://'
        )
      );
  end if;

  return false;
exception when others then
  return false;
end;
$$;

create or replace function public.fulfillment_allowed(
  p_class public.offer_class,
  p_mode public.fulfillment_mode
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_class
    when 'stocked_product' then p_mode in (
      'pickup', 'local_coverage', 'seller_shipping', 'direct_agreement'
    )
    when 'scheduled_food' then p_mode in (
      'pickup', 'local_coverage', 'seller_shipping', 'direct_agreement'
    )
    when 'local_service' then p_mode in (
      'local_coverage', 'appointment', 'direct_agreement'
    )
    when 'digital_offer' then p_mode in (
      'digital_delivery', 'appointment', 'direct_agreement'
    )
  end;
$$;

alter table public.offers
  add constraint offers_v2_contract check (
    public.valid_offer_contract(
      offer_class,
      price_mode,
      price_cents,
      availability_model,
      availability_state,
      availability_details
    )
  );

alter table public.request_items
  add constraint request_items_v2_price check (
    (price_mode_snapshot = 'quote' and price_cents_snapshot is null)
    or (price_mode_snapshot <> 'quote' and price_cents_snapshot > 0)
  ),
  add constraint request_items_v2_offer_snapshot check (
    public.valid_offer_contract(
      offer_class_snapshot,
      price_mode_snapshot,
      price_cents_snapshot,
      availability_model_snapshot,
      availability_state_snapshot,
      availability_details_snapshot
    )
  ),
  add constraint request_items_v2_request check (
    public.valid_request_payload(offer_class_snapshot, request_payload)
  );

create table public.offer_fulfillment_modes (
  offer_id uuid not null references public.offers (id) on delete cascade,
  mode public.fulfillment_mode not null,
  primary key (offer_id, mode)
);

insert into public.offer_fulfillment_modes (offer_id, mode)
select id, 'direct_agreement'
from public.offers;

create or replace function public.enforce_offer_publish_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and not exists (
    select 1
    from public.offer_fulfillment_modes f
    where f.offer_id = new.id
  ) then
    raise exception 'fulfillment_required' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger offers_publish_contract_trg
  before insert or update of status on public.offers
  for each row
  execute function public.enforce_offer_publish_contract();

create or replace function public.enforce_fulfillment_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_class public.offer_class;
  current_status public.offer_status;
begin
  select o.offer_class, o.status
  into current_class, current_status
  from public.offers o
  where o.id = coalesce(new.offer_id, old.offer_id);

  if tg_op <> 'DELETE'
    and not public.fulfillment_allowed(current_class, new.mode)
  then
    raise exception 'fulfillment_invalid' using errcode = '23514';
  end if;

  if tg_op = 'DELETE'
    and current_status = 'published'
    and not exists (
      select 1
      from public.offer_fulfillment_modes f
      where f.offer_id = old.offer_id and f.mode <> old.mode
    )
  then
    raise exception 'fulfillment_required' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger fulfillment_contract_trg
  before insert or update or delete on public.offer_fulfillment_modes
  for each row
  execute function public.enforce_fulfillment_contract();

create or replace function public.enforce_offer_fulfillment_compatibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.offers o
    join public.offer_fulfillment_modes f on f.offer_id = o.id
    where o.id = new.id
      and not public.fulfillment_allowed(o.offer_class, f.mode)
  ) then
    raise exception 'fulfillment_invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create constraint trigger offers_fulfillment_compatibility_trg
  after insert or update on public.offers
  deferrable initially deferred
  for each row
  execute function public.enforce_offer_fulfillment_compatibility();

alter table public.offer_fulfillment_modes enable row level security;
revoke all on table public.offer_fulfillment_modes from anon, authenticated;

create policy fulfillment_owner_all
  on public.offer_fulfillment_modes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_fulfillment_modes.offer_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_fulfillment_modes.offer_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy fulfillment_public_catalog_select
  on public.offer_fulfillment_modes
  for select
  to anon
  using (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_fulfillment_modes.offer_id
        and o.status = 'published'
        and p.status = 'published'
    )
  );

grant select on public.offer_fulfillment_modes to anon;
grant select on public.offer_fulfillment_modes to authenticated;

revoke select on public.seller_presences from anon;
revoke select on public.offers from anon;
revoke insert, update, delete on public.seller_presences from authenticated;
revoke insert, update, delete on public.offers from authenticated;

grant select (
  id, name, slug, description, mode, coverage_label, service_territory,
  served_city, location, location_public_confirmed, status, created_at,
  updated_at
) on public.seller_presences to anon;

grant select (
  id, presence_id, slug, offer_class, title, description, price_cents,
  price_mode, unit, availability_model, availability_state,
  availability_details, confirmed_at, status, created_at, updated_at
) on public.offers to anon;

create view public.catalog_presences
with (security_invoker = true, security_barrier = true) as
select
  p.id,
  p.name,
  p.slug,
  p.description,
  p.mode,
  p.coverage_label,
  p.service_territory,
  p.served_city,
  case
    when p.mode = 'fixed_location' and p.location_public_confirmed
      then p.location
    else null
  end as location,
  case
    when p.mode = 'fixed_location' and p.location_public_confirmed
      then extensions.st_y(p.location::extensions.geometry)
    else null
  end as lat,
  case
    when p.mode = 'fixed_location' and p.location_public_confirmed
      then extensions.st_x(p.location::extensions.geometry)
    else null
  end as lng,
  p.status,
  p.created_at,
  p.updated_at
from public.seller_presences p
where p.status = 'published';

create view public.catalog_offers
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
  o.updated_at
from public.offers o
join public.seller_presences p on p.id = o.presence_id
where o.status = 'published'
  and p.status = 'published';

create view public.catalog_offer_media
with (security_invoker = true, security_barrier = true) as
select
  m.id,
  m.offer_id,
  m.storage_path,
  m.alt_text,
  m.sort_order
from public.offer_media m
join public.offers o on o.id = m.offer_id
join public.seller_presences p on p.id = o.presence_id
where o.status = 'published'
  and p.status = 'published';

grant select on public.catalog_presences to anon, authenticated;
grant select on public.catalog_offers to anon, authenticated;
grant select on public.catalog_offer_media to anon, authenticated;

create function public.search_offers(
  p_query text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_presence_mode public.presence_mode default null,
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
  sort_mode text := case
    when p_sort in ('organic', 'price_asc', 'price_desc', 'recent', 'nearby')
      then p_sort
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
      and o.availability_state <> 'unavailable'
      and (p_presence_mode is null or p.mode = p_presence_mode)
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
    ranked.rdist
  from ranked
  order by
    case when sort_mode = 'nearby' then ranked.rdist end asc nulls last,
    case when sort_mode = 'price_asc' then ranked.rprice end asc nulls last,
    case when sort_mode = 'price_desc' then ranked.rprice end desc nulls last,
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

create function public.upsert_seller_presence(
  p_name text,
  p_description text,
  p_mode public.presence_mode,
  p_whatsapp_e164 text,
  p_coverage_label text default null,
  p_service_territory text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_location_public_confirmed boolean default false,
  p_status public.presence_status default 'draft',
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  loc extensions.geography(Point, 4326);
  confirmed boolean := coalesce(p_location_public_confirmed, false);
  v_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if p_mode <> 'fixed_location' then
    loc := null;
    confirmed := false;
  elsif p_lat is not null and p_lng is not null then
    loc := extensions.st_point(p_lng, p_lat)::extensions.geography;
  else
    loc := null;
  end if;

  if p_id is null then
    insert into public.seller_presences (
      owner_id, name, slug, description, mode, whatsapp_e164,
      coverage_label, service_territory, location,
      location_public_confirmed, status
    ) values (
      uid, p_name, public.allocate_presence_slug(p_name, null),
      coalesce(p_description, ''), p_mode, p_whatsapp_e164,
      nullif(btrim(coalesce(p_coverage_label, '')), ''),
      nullif(btrim(coalesce(p_service_territory, '')), ''),
      loc, confirmed, p_status
    ) returning id into v_id;
  else
    update public.seller_presences
    set
      name = p_name,
      slug = public.allocate_presence_slug(p_name, p_id),
      description = coalesce(p_description, ''),
      mode = p_mode,
      whatsapp_e164 = p_whatsapp_e164,
      coverage_label = nullif(btrim(coalesce(p_coverage_label, '')), ''),
      service_territory = nullif(btrim(coalesce(p_service_territory, '')), ''),
      location = loc,
      location_public_confirmed = confirmed,
      status = p_status
    where id = p_id and owner_id = uid
    returning id into v_id;
    if v_id is null then
      raise exception 'presence_not_found' using errcode = 'P0001';
    end if;
  end if;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values (v_id::text, 1, 'seller_update');
  return v_id;
end;
$$;

create function public.get_my_presences()
returns table (
  id uuid,
  name text,
  slug extensions.citext,
  description text,
  mode public.presence_mode,
  whatsapp_e164 text,
  coverage_label text,
  service_territory text,
  status public.presence_status,
  location_public_confirmed boolean,
  lat double precision,
  lng double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    p.id, p.name, p.slug, p.description, p.mode, p.whatsapp_e164,
    p.coverage_label, p.service_territory, p.status,
    p.location_public_confirmed,
    case when p.location is null then null
      else extensions.st_y(p.location::extensions.geometry) end,
    case when p.location is null then null
      else extensions.st_x(p.location::extensions.geometry) end
  from public.seller_presences p
  where p.owner_id = auth.uid()
  order by p.created_at, p.id;
$$;

create function public.upsert_offer(
  p_presence_id uuid,
  p_offer_class public.offer_class,
  p_title text,
  p_description text,
  p_price_cents integer,
  p_price_mode public.price_mode,
  p_unit text,
  p_availability_model public.availability_model,
  p_availability_state public.availability_state,
  p_availability_details jsonb,
  p_fulfillment_modes public.fulfillment_mode[],
  p_status public.offer_status,
  p_id uuid default null,
  p_confirm boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  v_id uuid;
  old public.offers%rowtype;
  old_modes public.fulfillment_mode[];
  clean_modes public.fulfillment_mode[];
  material boolean := false;
  touch boolean := false;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.seller_presences p
    where p.id = p_presence_id and p.owner_id = uid
  ) then
    raise exception 'presence_not_found' using errcode = 'P0001';
  end if;
  if not public.valid_offer_contract(
    p_offer_class, p_price_mode, p_price_cents,
    p_availability_model, p_availability_state,
    coalesce(p_availability_details, '{}'::jsonb)
  ) then
    raise exception 'offer_contract_invalid' using errcode = '22023';
  end if;

  select array(
    select distinct mode
    from unnest(coalesce(p_fulfillment_modes, '{}'::public.fulfillment_mode[])) mode
    order by mode
  )
  into clean_modes;

  if coalesce(cardinality(clean_modes), 0) < 1
    or exists (
      select 1 from unnest(clean_modes) mode
      where not public.fulfillment_allowed(p_offer_class, mode)
    )
  then
    raise exception 'fulfillment_invalid' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.offers (
      presence_id, slug, offer_class, title, description, price_cents,
      price_mode, unit, availability_model, availability_state,
      availability_details, status, confirmed_at
    ) values (
      p_presence_id, public.allocate_offer_slug(p_title, p_presence_id, null),
      p_offer_class, p_title, coalesce(p_description, ''), p_price_cents,
      p_price_mode, nullif(btrim(coalesce(p_unit, '')), ''),
      p_availability_model, p_availability_state,
      coalesce(p_availability_details, '{}'::jsonb),
      case when p_status = 'published' then 'draft' else p_status end,
      now()
    ) returning id into v_id;
  else
    select * into old
    from public.offers
    where id = p_id and presence_id = p_presence_id
    for update;
    if old.id is null then
      raise exception 'offer_not_found' using errcode = 'P0001';
    end if;
    select array_agg(mode order by mode::text)
    into old_modes
    from public.offer_fulfillment_modes
    where offer_id = p_id;
    material :=
      old.offer_class is distinct from p_offer_class
      or old.title is distinct from p_title
      or old.description is distinct from coalesce(p_description, '')
      or old.price_cents is distinct from p_price_cents
      or old.price_mode is distinct from p_price_mode
      or old.unit is distinct from nullif(btrim(coalesce(p_unit, '')), '')
      or old.availability_model is distinct from p_availability_model
      or old.availability_state is distinct from p_availability_state
      or old.availability_details is distinct from coalesce(p_availability_details, '{}'::jsonb)
      or old_modes is distinct from clean_modes;
    touch := material or coalesce(p_confirm, false)
      or (old.status is distinct from 'published' and p_status = 'published');
    update public.offers
    set
      offer_class = p_offer_class,
      title = p_title,
      description = coalesce(p_description, ''),
      price_cents = p_price_cents,
      price_mode = p_price_mode,
      unit = nullif(btrim(coalesce(p_unit, '')), ''),
      availability_model = p_availability_model,
      availability_state = p_availability_state,
      availability_details = coalesce(p_availability_details, '{}'::jsonb),
      status = case when p_status = 'published' then 'draft' else p_status end,
      confirmed_at = case when touch then now() else old.confirmed_at end
    where id = p_id
    returning id into v_id;
  end if;

  delete from public.offer_fulfillment_modes where offer_id = v_id;
  insert into public.offer_fulfillment_modes (offer_id, mode)
  select v_id, mode from unnest(clean_modes) mode;

  update public.offers set status = p_status where id = v_id;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values (v_id::text, 1, 'seller_update');
  return v_id;
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
  if p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
  then
    raise exception 'items_required' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) el
    where jsonb_typeof(el) <> 'object'
      or not public.jsonb_has_only_keys(el, array['offer_id', 'request'])
      or jsonb_typeof(el->'offer_id') <> 'string'
      or jsonb_typeof(el->'request') <> 'object'
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
    where not public.valid_request_payload(o.offer_class, el->'request')
  ) then
    raise exception 'request_invalid' using errcode = '22023';
  end if;

  insert into public.request_batches (buyer_id)
  values (uid) returning id into v_batch_id;
  insert into public.seller_requests (
    batch_id, presence_id, destination_e164, status
  )
  select distinct v_batch_id, p.id, p.whatsapp_e164, 'prepared'::public.request_status
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
    r.id, o.id, o.title, o.price_cents, o.price_mode, o.unit, o.confirmed_at,
    o.offer_class, o.availability_model, o.availability_state,
    o.availability_details, p.mode,
    coalesce(p.coverage_label, p.service_territory),
    coalesce(
      array(
        select f.mode from public.offer_fulfillment_modes f
        where f.offer_id = o.id order by f.mode::text
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

alter table public.search_events
  drop constraint search_events_event_kind_check;
update public.search_events set event_kind = 'selection_add'
where event_kind = 'cart_add';
alter table public.search_events
  add constraint search_events_event_kind_check check (
    event_kind in (
      'search', 'offer_open', 'selection_add', 'request_prepared',
      'handoff_opened', 'seller_update'
    )
  );

create or replace function public.record_public_event(p_event_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_kind not in ('offer_open', 'selection_add') then
    raise exception 'public_event_invalid' using errcode = '22023';
  end if;
  insert into public.search_events (query_normalized, result_count, event_kind)
  values ('', 1, p_event_kind);
end;
$$;

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

revoke all on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.presence_mode, text
) from public;
revoke all on function public.upsert_seller_presence(
  text, text, public.presence_mode, text, text, text, double precision,
  double precision, boolean, public.presence_status, uuid
) from public;
revoke all on function public.upsert_offer(
  uuid, public.offer_class, text, text, integer, public.price_mode, text,
  public.availability_model, public.availability_state, jsonb,
  public.fulfillment_mode[], public.offer_status, uuid, boolean
) from public;
revoke all on function public.get_my_presences() from public;

grant execute on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.presence_mode, text
) to anon, authenticated;
grant execute on function public.upsert_seller_presence(
  text, text, public.presence_mode, text, text, text, double precision,
  double precision, boolean, public.presence_status, uuid
) to authenticated;
grant execute on function public.upsert_offer(
  uuid, public.offer_class, text, text, integer, public.price_mode, text,
  public.availability_model, public.availability_state, jsonb,
  public.fulfillment_mode[], public.offer_status, uuid, boolean
) to authenticated;
grant execute on function public.get_my_presences() to authenticated;

revoke all on function public.jsonb_has_only_keys(jsonb, text[]) from public;
revoke all on function public.is_rfc3339(text) from public;
revoke all on function public.valid_offer_contract(
  public.offer_class, public.price_mode, integer, public.availability_model,
  public.availability_state, jsonb
) from public;
revoke all on function public.valid_request_payload(
  public.offer_class, jsonb
) from public;
revoke all on function public.enforce_offer_publish_contract() from public;
revoke all on function public.enforce_fulfillment_contract() from public;
revoke all on function public.enforce_offer_fulfillment_compatibility() from public;
alter function public.scrub_search_event() set search_path = public;
revoke all on function public.scrub_search_event() from public;
revoke all on function public.fulfillment_allowed(
  public.offer_class, public.fulfillment_mode
) from public;
revoke all on function public.enforce_offer_publish_contract() from public;
revoke all on function public.enforce_fulfillment_contract() from public;
