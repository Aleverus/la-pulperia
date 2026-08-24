-- Complete account history and coarse locality preference surfaces.

create or replace function public.get_my_request_batches()
returns table (
  batch_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  seller_count bigint,
  handoff_opened_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  return query
  select
    b.id,
    b.created_at,
    b.expires_at,
    count(r.id),
    count(r.id) filter (where r.status = 'handoff_opened')
  from public.request_batches b
  left join public.seller_requests r on r.batch_id = b.id
  where b.buyer_id = uid
  group by b.id, b.created_at, b.expires_at
  order by b.created_at desc;
end;
$$;

create or replace function public.set_saved_locality(p_remember boolean)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  saved text;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  update public.profiles
  set
    last_locality = case when p_remember then 'Siguatepeque' else null end,
    last_locality_center = case
      when p_remember
        then extensions.st_point(-87.8310, 14.5969)::extensions.geography
      else null
    end
  where id = uid
  returning last_locality into saved;

  return saved;
end;
$$;

revoke all on function public.get_my_request_batches() from public;
revoke all on function public.set_saved_locality(boolean) from public;
grant execute on function public.get_my_request_batches() to authenticated;
grant execute on function public.set_saved_locality(boolean) to authenticated;
