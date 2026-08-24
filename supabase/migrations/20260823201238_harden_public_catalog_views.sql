-- Public catalog views must obey RLS instead of inheriting the creator's bypass.

create policy presence_public_catalog_select
  on public.seller_presences
  for select
  to anon
  using (status = 'published');

create policy offer_public_catalog_select
  on public.offers
  for select
  to anon
  using (
    status = 'published'
    and exists (
      select 1
      from public.seller_presences p
      where p.id = offers.presence_id
        and p.status = 'published'
    )
  );

create policy offer_media_public_catalog_select
  on public.offer_media
  for select
  to anon
  using (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_media.offer_id
        and o.status = 'published'
        and p.status = 'published'
    )
  );

grant select (
  id, name, slug, description, kind, served_city, location,
  location_public_confirmed, status, created_at, updated_at
) on public.seller_presences to anon;

grant select (
  id, presence_id, slug, kind, title, description, price_cents, price_mode,
  unit, availability, confirmed_at, status, created_at, updated_at
) on public.offers to anon;

grant select (
  id, offer_id, storage_path, alt_text, sort_order, created_at
) on public.offer_media to anon;

alter view public.catalog_presences set (security_invoker = true);
alter view public.catalog_offers set (security_invoker = true);
alter view public.catalog_offer_media set (security_invoker = true);

alter function public.immutable_unaccent(text)
  set search_path = pg_catalog, public, extensions;
alter function public.within_siguatepeque(extensions.geography)
  set search_path = pg_catalog, public, extensions;
alter function public.set_updated_at()
  set search_path = pg_catalog, public, extensions;
alter function public.offer_media_limit()
  set search_path = pg_catalog, public, extensions;
alter function public.slugify(text)
  set search_path = pg_catalog, public, extensions;
alter function public.allocate_presence_slug(text, uuid)
  set search_path = pg_catalog, public, extensions;
alter function public.allocate_offer_slug(text, uuid, uuid)
  set search_path = pg_catalog, public, extensions;
