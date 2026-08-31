-- Deletions cross PostgreSQL and Storage, so model them as resumable work.
-- Storage objects are always removed through the Storage API; these functions
-- only close or advance the PostgreSQL side after observing that removal.

alter table public.offer_media
  add column deletion_pending boolean not null default false;

comment on column public.offer_media.deletion_pending is
  'True while Storage cleanup is pending. Pending media is never catalogued.';

create or replace view public.catalog_offer_media
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
  and p.status = 'published'
  and not m.deletion_pending;

drop policy offer_media_public_catalog_select on public.offer_media;
create policy offer_media_public_catalog_select
  on public.offer_media
  for select
  to anon
  using (
    not deletion_pending
    and exists (
      select 1
      from public.offers o
      join public.seller_presences p on p.id = o.presence_id
      where o.id = offer_media.offer_id
        and o.status = 'published'
        and p.status = 'published'
    )
  );

-- The invoker-security catalog view evaluates deletion_pending under the anon
-- role, so expose only that gate column in addition to the existing safe set.
grant select (deletion_pending) on public.offer_media to anon;

create type public.account_deletion_status as enum ('pending_media');

create table public.account_deletion_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status public.account_deletion_status not null default 'pending_media',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_deletion_requests is
  'Durable outbox for resumable account and Storage cleanup.';

alter table public.account_deletion_requests enable row level security;
revoke all on table public.account_deletion_requests from anon, authenticated;

create function public.begin_offer_media_deletion(
  p_offer_id uuid,
  p_media_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  object_path text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    raise exception 'account_deletion_pending' using errcode = 'P0001';
  end if;

  select m.storage_path
  into object_path
  from public.offer_media m
  join public.offers o on o.id = m.offer_id
  join public.seller_presences p on p.id = o.presence_id
  where m.id = p_media_id
    and m.offer_id = p_offer_id
    and p.owner_id = uid
  for update of m;

  if object_path is null then
    raise exception 'offer_media_not_found' using errcode = 'P0001';
  end if;

  update public.offer_media
  set deletion_pending = true
  where id = p_media_id;
  return object_path;
end;
$$;

create function public.restore_offer_media_deletion(
  p_offer_id uuid,
  p_media_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  restored boolean;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    raise exception 'account_deletion_pending' using errcode = 'P0001';
  end if;

  update public.offer_media m
  set deletion_pending = false
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where m.id = p_media_id
    and m.offer_id = p_offer_id
    and o.id = m.offer_id
    and p.owner_id = uid
  returning true into restored;
  return coalesce(restored, false);
end;
$$;

create function public.finalize_offer_media_deletion(
  p_offer_id uuid,
  p_media_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  owned boolean;
  removed boolean;
  object_path text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.offers o
    join public.seller_presences p on p.id = o.presence_id
    where o.id = p_offer_id and p.owner_id = uid
  ) into owned;
  if not owned then
    raise exception 'offer_not_found' using errcode = 'P0001';
  end if;

  select m.storage_path
  into object_path
  from public.offer_media m
  where m.id = p_media_id
    and m.offer_id = p_offer_id
    and m.deletion_pending;
  if object_path is not null and exists (
    select 1
    from storage.objects s
    where s.bucket_id = 'offer-media' and s.name = object_path
  ) then
    raise exception 'storage_object_remains' using errcode = 'P0001';
  end if;

  delete from public.offer_media
  where id = p_media_id
    and offer_id = p_offer_id
    and deletion_pending
  returning true into removed;

  -- Repeating the finalize call after a committed deletion is harmless.
  return coalesce(removed, true);
end;
$$;

create function public.account_deletion_pending()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.account_deletion_requests d
    where d.user_id = auth.uid()
  );
$$;

create function public.begin_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  perform 1 from auth.users u where u.id = uid for update;
  if exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    return uid;
  end if;

  -- Close the public surface transactionally before recording cleanup work.
  update public.offers o
  set status = 'archived'
  from public.seller_presences p
  where p.id = o.presence_id and p.owner_id = uid;

  update public.seller_presences
  set status = 'archived'
  where owner_id = uid;

  update public.offer_media m
  set deletion_pending = true
  from public.offers o
  join public.seller_presences p on p.id = o.presence_id
  where m.offer_id = o.id and p.owner_id = uid;

  insert into public.account_deletion_requests (user_id)
  values (uid);
  return uid;
end;
$$;

create function public.get_account_deletion_paths(p_limit integer default 1000)
returns text[]
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  lim integer := least(greatest(coalesce(p_limit, 1000), 1), 1000);
  paths text[];
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    raise exception 'account_deletion_not_prepared' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(path order by path), '{}'::text[])
  into paths
  from (
    select path
    from (
      select m.storage_path as path
      from public.offer_media m
      join public.offers o on o.id = m.offer_id
      join public.seller_presences p on p.id = o.presence_id
      where p.owner_id = uid
      union
      select s.name as path
      from storage.objects s
      where s.bucket_id = 'offer-media'
        and split_part(s.name, '/', 1) = uid::text
    ) pending_paths
    order by path
    limit lim
  ) bounded_paths;
  return paths;
end;
$$;

create function public.confirm_account_media_deleted(p_paths text[])
returns bigint
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  removed bigint;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    raise exception 'account_deletion_not_prepared' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_paths), 0) < 1
    or cardinality(p_paths) > 1000
  then
    raise exception 'account_deletion_batch_invalid' using errcode = '22023';
  end if;
  if exists (
    select 1
    from storage.objects s
    where s.bucket_id = 'offer-media'
      and split_part(s.name, '/', 1) = uid::text
      and s.name = any (p_paths)
  ) then
    raise exception 'storage_objects_remain' using errcode = 'P0001';
  end if;

  delete from public.offer_media m
  using public.offers o, public.seller_presences p
  where m.offer_id = o.id
    and o.presence_id = p.id
    and p.owner_id = uid
    and m.deletion_pending
    and m.storage_path = any (p_paths);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create function public.block_account_deletion_presence_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.account_deletion_requests d
    where d.user_id = new.owner_id
  ) then
    raise exception 'account_deletion_pending' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function public.block_account_deletion_offer_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.account_deletion_requests d
    join public.seller_presences p on p.owner_id = d.user_id
    where p.id = new.presence_id
  ) then
    raise exception 'account_deletion_pending' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function public.block_account_deletion_media_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.account_deletion_requests d
    join public.seller_presences p on p.owner_id = d.user_id
    join public.offers o on o.presence_id = p.id
    where o.id = new.offer_id
  ) then
    raise exception 'account_deletion_pending' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger block_account_deletion_presence_change_trg
  before insert or update on public.seller_presences
  for each row execute function public.block_account_deletion_presence_change();

create trigger block_account_deletion_offer_change_trg
  before insert or update on public.offers
  for each row execute function public.block_account_deletion_offer_change();

create trigger block_account_deletion_media_change_trg
  before insert on public.offer_media
  for each row execute function public.block_account_deletion_media_change();

create function public.finalize_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid := auth.uid();
  removed boolean;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    raise exception 'account_deletion_not_prepared' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.offer_media m
    join public.offers o on o.id = m.offer_id
    join public.seller_presences p on p.id = o.presence_id
    where p.owner_id = uid
  ) or exists (
    select 1
    from storage.objects s
    where s.bucket_id = 'offer-media'
      and split_part(s.name, '/', 1) = uid::text
  ) then
    raise exception 'account_media_cleanup_pending' using errcode = 'P0001';
  end if;

  delete from public.request_batches b
  where b.buyer_id = uid
    or exists (
      select 1
      from public.seller_requests r
      join public.seller_presences p on p.id = r.presence_id
      where r.batch_id = b.id and p.owner_id = uid
    );

  update public.operator_actions a
  set report_id = null
  where a.report_id in (
    select r.id from public.reports r where r.author_id = uid
  );
  delete from public.operator_actions where operator_id = uid;
  delete from public.public_context_notes where published_by = uid;
  update public.operator_members set granted_by = null where granted_by = uid;
  delete from public.operator_members where user_id = uid;
  delete from public.seller_presences where owner_id = uid;
  delete from auth.users where id = uid returning true into removed;
  return coalesce(removed, false);
end;
$$;

create or replace function public.delete_my_account()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.finalize_account_deletion();
$$;

create function public.reserve_offer_media_upload(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  uid uuid := auth.uid();
  media_id uuid := gen_random_uuid();
  slot smallint;
  object_path text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if not exists (
    select 1
    from public.offers o
    join public.seller_presences p on p.id = o.presence_id
    where o.id = p_offer_id and p.owner_id = uid
  ) then
    raise exception 'offer_not_found' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.account_deletion_requests d where d.user_id = uid
  ) then
    raise exception 'account_deletion_pending' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_offer_id::text, 0));
  select candidate::smallint
  into slot
  from generate_series(0, 3) candidate
  where not exists (
    select 1
    from public.offer_media m
    where m.offer_id = p_offer_id and m.sort_order = candidate
  )
  order by candidate
  limit 1;
  if slot is null then
    raise exception 'offer_media_limit' using errcode = 'P0001';
  end if;

  object_path := uid::text || '/' || p_offer_id::text || '/' ||
    media_id::text || '.webp';
  insert into public.offer_media (
    id, offer_id, storage_path, alt_text, sort_order, deletion_pending
  ) values (
    media_id, p_offer_id, object_path, '', slot, true
  );

  return jsonb_build_object(
    'media_id', media_id,
    'storage_path', object_path,
    'sort_order', slot
  );
end;
$$;

create function public.complete_offer_media_upload(p_media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  object_path text;
  completed boolean;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select m.storage_path
  into object_path
  from public.offer_media m
  join public.offers o on o.id = m.offer_id
  join public.seller_presences p on p.id = o.presence_id
  where m.id = p_media_id
    and m.deletion_pending
    and p.owner_id = uid
  for update of m;
  if object_path is null then
    raise exception 'offer_media_not_found' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from storage.objects s
    where s.bucket_id = 'offer-media' and s.name = object_path
  ) then
    raise exception 'storage_object_missing' using errcode = 'P0001';
  end if;

  update public.offer_media
  set deletion_pending = false
  where id = p_media_id
  returning true into completed;
  return coalesce(completed, false);
end;
$$;

create function public.abort_offer_media_upload(p_media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  uid uuid := auth.uid();
  object_path text;
  removed boolean;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select m.storage_path
  into object_path
  from public.offer_media m
  join public.offers o on o.id = m.offer_id
  join public.seller_presences p on p.id = o.presence_id
  where m.id = p_media_id
    and m.deletion_pending
    and p.owner_id = uid
  for update of m;
  if object_path is null then
    return true;
  end if;
  if exists (
    select 1
    from storage.objects s
    where s.bucket_id = 'offer-media' and s.name = object_path
  ) then
    raise exception 'storage_object_remains' using errcode = 'P0001';
  end if;

  delete from public.offer_media where id = p_media_id
  returning true into removed;
  return coalesce(removed, true);
end;
$$;

-- Commercial deletion is intentionally available only through the resumable
-- RPCs. The application already uses RPCs for presence and offer maintenance.
revoke insert, update, delete on public.seller_presences from authenticated;
revoke insert, update, delete on public.offers from authenticated;
revoke insert, update, delete on public.offer_media from authenticated;

revoke all on function public.begin_offer_media_deletion(uuid, uuid) from public;
revoke all on function public.restore_offer_media_deletion(uuid, uuid) from public;
revoke all on function public.finalize_offer_media_deletion(uuid, uuid) from public;
revoke all on function public.account_deletion_pending() from public;
revoke all on function public.begin_account_deletion() from public;
revoke all on function public.get_account_deletion_paths(integer) from public;
revoke all on function public.confirm_account_media_deleted(text[]) from public;
revoke all on function public.finalize_account_deletion() from public;
revoke all on function public.delete_my_account() from public;
revoke all on function public.reserve_offer_media_upload(uuid) from public;
revoke all on function public.complete_offer_media_upload(uuid) from public;
revoke all on function public.abort_offer_media_upload(uuid) from public;

grant execute on function public.begin_offer_media_deletion(uuid, uuid) to authenticated;
grant execute on function public.restore_offer_media_deletion(uuid, uuid) to authenticated;
grant execute on function public.finalize_offer_media_deletion(uuid, uuid) to authenticated;
grant execute on function public.account_deletion_pending() to authenticated;
grant execute on function public.begin_account_deletion() to authenticated;
grant execute on function public.get_account_deletion_paths(integer) to authenticated;
grant execute on function public.confirm_account_media_deleted(text[]) to authenticated;
grant execute on function public.finalize_account_deletion() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.reserve_offer_media_upload(uuid) to authenticated;
grant execute on function public.complete_offer_media_upload(uuid) to authenticated;
grant execute on function public.abort_offer_media_upload(uuid) to authenticated;

revoke all on function public.block_account_deletion_presence_change() from public;
revoke all on function public.block_account_deletion_offer_change() from public;
revoke all on function public.block_account_deletion_media_change() from public;
