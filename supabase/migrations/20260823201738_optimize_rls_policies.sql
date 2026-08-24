-- Evaluate auth identity once per statement and collapse duplicate select policies.

alter policy profiles_self_select on public.profiles
  using (id = (select auth.uid()));

alter policy profiles_self_update on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy presence_owner_all on public.seller_presences
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter policy offer_owner_all on public.offers
  using (
    exists (
      select 1
      from public.seller_presences p
      where p.id = offers.presence_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.seller_presences p
      where p.id = offers.presence_id
        and p.owner_id = (select auth.uid())
    )
  );

alter policy offer_media_owner_all on public.offer_media
  using (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_media.offer_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_media.offer_id
        and p.owner_id = (select auth.uid())
    )
  );

alter policy batches_buyer_select on public.request_batches
  using (buyer_id = (select auth.uid()));

drop policy seller_requests_buyer_select on public.seller_requests;
drop policy seller_requests_seller_select on public.seller_requests;

create policy seller_requests_participant_select
  on public.seller_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.request_batches b
      where b.id = seller_requests.batch_id
        and b.buyer_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.seller_presences p
      where p.id = seller_requests.presence_id
        and p.owner_id = (select auth.uid())
    )
  );

drop policy request_items_buyer_select on public.request_items;
drop policy request_items_seller_select on public.request_items;

create policy request_items_participant_select
  on public.request_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.seller_requests r
      join public.request_batches b on b.id = r.batch_id
      where r.id = request_items.seller_request_id
        and b.buyer_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.seller_requests r
      join public.seller_presences p on p.id = r.presence_id
      where r.id = request_items.seller_request_id
        and p.owner_id = (select auth.uid())
    )
  );
