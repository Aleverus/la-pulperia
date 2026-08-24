-- Corte 3b: explicit proximity ordering using an ephemeral session coordinate.

create or replace function public.search_offers(
  p_query text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_presence_kind public.presence_kind default null,
  p_sort text default 'organic'
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
      and (p_presence_kind is null or p.kind = p_presence_kind)
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
    case when sort_mode = 'nearby' then ranked.rdist end asc nulls last,
    case when sort_mode = 'price_asc' then ranked.rprice end asc,
    case when sort_mode = 'price_desc' then ranked.rprice end desc,
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
