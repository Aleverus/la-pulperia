-- Open-pilot handoffs require a destination whose control has been verified.
-- This migration deliberately downgrades pre-existing published presences;
-- verification is not inferred from a syntactically valid number.

create type public.whatsapp_verification_status as enum (
  'unverified',
  'verified'
);

alter table public.seller_presences
  add column whatsapp_verification_status
    public.whatsapp_verification_status not null default 'unverified',
  add column whatsapp_verified_at timestamptz;

update public.seller_presences
set status = 'draft'
where status = 'published';

alter table public.seller_presences
  add constraint whatsapp_verification_consistent check (
    (
      whatsapp_verification_status = 'unverified'
      and whatsapp_verified_at is null
    ) or (
      whatsapp_verification_status = 'verified'
      and whatsapp_verified_at is not null
    )
  ),
  add constraint published_presence_has_verified_whatsapp check (
    status <> 'published'
    or whatsapp_verification_status = 'verified'
  );

create function public.enforce_whatsapp_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and new.whatsapp_e164 is distinct from old.whatsapp_e164
  then
    new.whatsapp_verification_status := 'unverified';
    new.whatsapp_verified_at := null;
  end if;

  if new.status = 'published'
    and new.whatsapp_verification_status <> 'verified'
  then
    raise exception 'whatsapp_not_verified' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_whatsapp_verification_trg
  before insert or update of whatsapp_e164, status,
    whatsapp_verification_status, whatsapp_verified_at
  on public.seller_presences
  for each row execute function public.enforce_whatsapp_verification();

revoke all on function public.get_my_presences() from public;
drop function public.get_my_presences();

create function public.get_my_presences()
returns table (
  id uuid,
  name text,
  slug citext,
  description text,
  mode public.presence_mode,
  whatsapp_e164 text,
  coverage_label text,
  service_territory text,
  status public.presence_status,
  location_public_confirmed boolean,
  lat double precision,
  lng double precision,
  whatsapp_verification_status public.whatsapp_verification_status,
  whatsapp_verified_at timestamptz
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
      else extensions.st_x(p.location::extensions.geometry) end,
    p.whatsapp_verification_status,
    p.whatsapp_verified_at
  from public.seller_presences p
  where p.owner_id = auth.uid()
  order by p.created_at, p.id;
$$;

revoke all on function public.get_my_presences() from public;
grant execute on function public.get_my_presences() to authenticated;

revoke all on function public.enforce_whatsapp_verification() from public;
