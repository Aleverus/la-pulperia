-- Seller self-service: slug, presence/offer upserts, freshness, public media, storage.

create or replace function public.slugify(input text)
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        regexp_replace(
          lower(public.immutable_unaccent(coalesce(input, ''))),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '-{2,}',
        '-',
        'g'
      )),
      ''
    ),
    'pulperia'
  );
$$;

create or replace function public.allocate_presence_slug(p_name text, p_id uuid)
returns extensions.citext
language plpgsql
as $$
declare
  base text := public.slugify(p_name);
  candidate text := base;
  n integer := 2;
begin
  while exists (
    select 1
    from public.seller_presences s
    where s.slug = candidate
      and (p_id is null or s.id <> p_id)
  ) loop
    candidate := base || '-' || n;
    n := n + 1;
  end loop;
  return candidate;
end;
$$;

create or replace function public.allocate_offer_slug(
  p_title text,
  p_presence_id uuid,
  p_offer_id uuid
)
returns extensions.citext
language plpgsql
as $$
declare
  presence_slug text;
  base text;
  candidate text;
  n integer := 2;
begin
  select slug::text into presence_slug
  from public.seller_presences
  where id = p_presence_id;

  base := public.slugify(p_title) || '-' || coalesce(presence_slug, 'oferta');
  candidate := base;

  while exists (
    select 1
    from public.offers o
    where o.slug = candidate
      and (p_offer_id is null or o.id <> p_offer_id)
  ) loop
    candidate := base || '-' || n;
    n := n + 1;
  end loop;
  return candidate;
end;
$$;

create or replace function public.upsert_seller_presence(
  p_name text,
  p_description text,
  p_kind public.presence_kind,
  p_whatsapp_e164 text,
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

  if p_kind = 'virtual' then
    loc := null;
    confirmed := false;
  elsif p_lat is not null and p_lng is not null then
    loc := extensions.st_point(p_lng, p_lat)::extensions.geography;
  else
    loc := null;
  end if;

  if p_id is null then
    insert into public.seller_presences (
      owner_id,
      name,
      slug,
      description,
      kind,
      whatsapp_e164,
      location,
      location_public_confirmed,
      status
    ) values (
      uid,
      p_name,
      public.allocate_presence_slug(p_name, null),
      coalesce(p_description, ''),
      p_kind,
      p_whatsapp_e164,
      loc,
      confirmed,
      p_status
    )
    returning id into v_id;
  else
    update public.seller_presences
    set
      name = p_name,
      slug = public.allocate_presence_slug(p_name, p_id),
      description = coalesce(p_description, ''),
      kind = p_kind,
      whatsapp_e164 = p_whatsapp_e164,
      location = loc,
      location_public_confirmed = confirmed,
      status = p_status
    where id = p_id
      and owner_id = uid
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

create or replace function public.upsert_offer(
  p_presence_id uuid,
  p_kind public.offer_kind,
  p_title text,
  p_description text,
  p_price_cents integer,
  p_price_mode public.price_mode,
  p_unit text,
  p_availability public.availability,
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
  material boolean := false;
  touch boolean := false;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.seller_presences p
    where p.id = p_presence_id
      and p.owner_id = uid
  ) then
    raise exception 'presence_not_found' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.offers (
      presence_id,
      slug,
      kind,
      title,
      description,
      price_cents,
      price_mode,
      unit,
      availability,
      status,
      confirmed_at
    ) values (
      p_presence_id,
      public.allocate_offer_slug(p_title, p_presence_id, null),
      p_kind,
      p_title,
      coalesce(p_description, ''),
      p_price_cents,
      p_price_mode,
      nullif(btrim(coalesce(p_unit, '')), ''),
      p_availability,
      p_status,
      now()
    )
    returning id into v_id;
  else
    select * into old
    from public.offers
    where id = p_id
      and presence_id = p_presence_id
    for update;

    if old.id is null then
      raise exception 'offer_not_found' using errcode = 'P0001';
    end if;

    material :=
      old.kind is distinct from p_kind
      or old.title is distinct from p_title
      or old.description is distinct from coalesce(p_description, '')
      or old.price_cents is distinct from p_price_cents
      or old.price_mode is distinct from p_price_mode
      or old.unit is distinct from nullif(btrim(coalesce(p_unit, '')), '')
      or old.availability is distinct from p_availability;

    touch :=
      material
      or coalesce(p_confirm, false)
      or (old.status is distinct from 'published' and p_status = 'published');

    update public.offers
    set
      kind = p_kind,
      title = p_title,
      description = coalesce(p_description, ''),
      price_cents = p_price_cents,
      price_mode = p_price_mode,
      unit = nullif(btrim(coalesce(p_unit, '')), ''),
      availability = p_availability,
      status = p_status,
      confirmed_at = case when touch then now() else old.confirmed_at end
    where id = p_id
    returning id into v_id;
  end if;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values (v_id::text, 1, 'seller_update');

  return v_id;
end;
$$;

create or replace function public.confirm_offer_freshness(p_offer_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  touched timestamptz;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  update public.offers o
  set confirmed_at = now()
  from public.seller_presences p
  where o.id = p_offer_id
    and p.id = o.presence_id
    and p.owner_id = uid
  returning o.confirmed_at into touched;

  if touched is null then
    raise exception 'offer_not_found' using errcode = 'P0001';
  end if;

  insert into public.search_events (query_normalized, result_count, event_kind)
  values (p_offer_id::text, 1, 'seller_update');

  return touched;
end;
$$;

create view public.catalog_offer_media
with (security_invoker = false, security_barrier = true) as
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

grant select on public.catalog_offer_media to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-media',
  'offer-media',
  true,
  1048576,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists offer_media_public_read on storage.objects;
drop policy if exists offer_media_owner_insert on storage.objects;
drop policy if exists offer_media_owner_update on storage.objects;
drop policy if exists offer_media_owner_delete on storage.objects;

create policy offer_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'offer-media');

create policy offer_media_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'offer-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy offer_media_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'offer-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'offer-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy offer_media_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'offer-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create or replace function public.get_my_presences()
returns table (
  id uuid,
  name text,
  slug extensions.citext,
  description text,
  kind public.presence_kind,
  whatsapp_e164 text,
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
    p.id,
    p.name,
    p.slug,
    p.description,
    p.kind,
    p.whatsapp_e164,
    p.status,
    p.location_public_confirmed,
    case
      when p.location is null then null
      else extensions.st_y(p.location::extensions.geometry)
    end,
    case
      when p.location is null then null
      else extensions.st_x(p.location::extensions.geometry)
    end
  from public.seller_presences p
  where p.owner_id = auth.uid()
  order by p.created_at;
$$;

revoke all on function public.get_my_presences() from public;
grant execute on function public.get_my_presences() to authenticated;

revoke all on function public.upsert_seller_presence(
  text, text, public.presence_kind, text, double precision, double precision, boolean, public.presence_status, uuid
) from public;
revoke all on function public.upsert_offer(
  uuid, public.offer_kind, text, text, integer, public.price_mode, text, public.availability, public.offer_status, uuid, boolean
) from public;
revoke all on function public.confirm_offer_freshness(uuid) from public;

grant execute on function public.upsert_seller_presence(
  text, text, public.presence_kind, text, double precision, double precision, boolean, public.presence_status, uuid
) to authenticated;
grant execute on function public.upsert_offer(
  uuid, public.offer_kind, text, text, integer, public.price_mode, text, public.availability, public.offer_status, uuid, boolean
) to authenticated;
grant execute on function public.confirm_offer_freshness(uuid) to authenticated;
