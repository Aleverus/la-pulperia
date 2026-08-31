create type public.presence_kind as enum ('physical', 'virtual');
create type public.presence_status as enum ('draft', 'published', 'archived');
create type public.offer_kind as enum ('product', 'service');
create type public.price_mode as enum ('fixed', 'from');
create type public.availability as enum ('available', 'limited', 'unavailable');
create type public.offer_status as enum ('draft', 'published', 'paused', 'archived');
create type public.request_status as enum ('prepared', 'handoff_opened');
create type public.report_status as enum ('open', 'dismissed', 'noted', 'content_removed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  last_locality text check (last_locality is null or char_length(last_locality) between 1 and 80),
  last_locality_center extensions.geography(Point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id)
);

create table public.seller_presences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  slug extensions.citext not null unique,
  description text not null default '' check (char_length(description) <= 2000),
  kind public.presence_kind not null,
  whatsapp_e164 text not null check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  served_city text not null default 'Siguatepeque' check (served_city = 'Siguatepeque'),
  location extensions.geography(Point, 4326),
  location_public_confirmed boolean not null default false,
  status public.presence_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint virtual_without_coordinates check (
    kind <> 'virtual'
    or (location is null and location_public_confirmed = false)
  ),
  constraint published_physical_is_located check (
    status <> 'published'
    or kind <> 'physical'
    or (
      location is not null
      and location_public_confirmed
      and public.within_siguatepeque(location)
    )
  )
);

create index seller_presences_location_gist
  on public.seller_presences
  using gist (location);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  presence_id uuid not null references public.seller_presences (id) on delete cascade,
  slug extensions.citext not null unique,
  kind public.offer_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  price_cents integer not null check (price_cents > 0),
  price_mode public.price_mode not null,
  unit text check (unit is null or char_length(unit) between 1 and 40),
  availability public.availability not null default 'available',
  confirmed_at timestamptz not null default now(),
  status public.offer_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('spanish', public.immutable_unaccent(title)), 'A')
    || setweight(to_tsvector('spanish', public.immutable_unaccent(description)), 'B')
  ) stored
);

create index offers_search_vector_idx on public.offers using gin (search_vector);
create index offers_title_trgm_idx
  on public.offers
  using gin (public.immutable_unaccent(title) extensions.gin_trgm_ops);
create index offers_presence_idx on public.offers (presence_id);

create table public.offer_media (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order smallint not null check (sort_order between 0 and 3),
  created_at timestamptz not null default now(),
  unique (offer_id, sort_order)
);

create or replace function public.offer_media_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.offer_media where offer_id = new.offer_id
  ) >= 4 then
    raise exception 'offer_media_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger offer_media_limit_trg
  before insert on public.offer_media
  for each row
  execute function public.offer_media_limit();

create table public.request_batches (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days')
);

create index request_batches_expires_idx on public.request_batches (expires_at);

create table public.seller_requests (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.request_batches (id) on delete cascade,
  presence_id uuid not null references public.seller_presences (id) on delete restrict,
  destination_e164 text not null check (destination_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status public.request_status not null default 'prepared',
  handoff_opened_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_id, presence_id),
  constraint handoff_timestamp_matches_status check (
    (status = 'prepared' and handoff_opened_at is null)
    or (status = 'handoff_opened' and handoff_opened_at is not null)
  )
);

create table public.request_items (
  id uuid primary key default gen_random_uuid(),
  seller_request_id uuid not null references public.seller_requests (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete restrict,
  title_snapshot text not null,
  quantity integer not null check (quantity > 0),
  price_cents_snapshot integer not null check (price_cents_snapshot > 0),
  price_mode_snapshot public.price_mode not null,
  unit_snapshot text,
  availability_snapshot public.availability not null,
  confirmed_at_snapshot timestamptz not null
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete cascade,
  presence_id uuid references public.seller_presences (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 40),
  explanation text not null check (char_length(explanation) between 1 and 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint report_has_target check (num_nonnulls(offer_id, presence_id) >= 1)
);

create table public.public_context_notes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers (id) on delete cascade,
  presence_id uuid references public.seller_presences (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  published_at timestamptz not null default now(),
  published_by uuid not null references public.profiles (id),
  constraint note_has_one_target check (num_nonnulls(offer_id, presence_id) = 1)
);

create table public.search_events (
  id bigint generated always as identity primary key,
  query_normalized text not null,
  result_count integer not null check (result_count >= 0),
  event_kind text not null check (
    event_kind in (
      'search',
      'offer_open',
      'cart_add',
      'request_prepared',
      'handoff_opened',
      'seller_update'
    )
  ),
  created_at timestamptz not null default now()
);

create table public.operator_actions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles (id),
  action_kind text not null,
  report_id uuid references public.reports (id),
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        'Vecino'
      ),
      80
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger seller_presences_updated_at
  before update on public.seller_presences
  for each row
  execute function public.set_updated_at();

create trigger offers_updated_at
  before update on public.offers
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.operator_members enable row level security;
alter table public.seller_presences enable row level security;
alter table public.offers enable row level security;
alter table public.offer_media enable row level security;
alter table public.request_batches enable row level security;
alter table public.seller_requests enable row level security;
alter table public.request_items enable row level security;
alter table public.reports enable row level security;
alter table public.public_context_notes enable row level security;
alter table public.search_events enable row level security;
alter table public.operator_actions enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.operator_members from anon, authenticated;
revoke all on table public.seller_presences from anon, authenticated;
revoke all on table public.offers from anon, authenticated;
revoke all on table public.offer_media from anon, authenticated;
revoke all on table public.request_batches from anon, authenticated;
revoke all on table public.seller_requests from anon, authenticated;
revoke all on table public.request_items from anon, authenticated;
revoke all on table public.reports from anon, authenticated;
revoke all on table public.public_context_notes from anon, authenticated;
revoke all on table public.search_events from anon, authenticated;
revoke all on table public.operator_actions from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
