-- Corte 3: discovery filters for the v2 offer contract.

revoke all on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.presence_mode, text
) from public;

drop function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.presence_mode, text
);

create function public.search_offers(
  p_query text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit integer default 20,
  p_offset integer default 0,
  p_offer_class public.offer_class default null,
  p_presence_mode public.presence_mode default null,
  p_availability_state public.availability_state default null,
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
          and p.location_public_confirmed
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
      and (p_offer_class is null or o.offer_class = p_offer_class)
      and (p_presence_mode is null or p.mode = p_presence_mode)
      and (
        p_availability_state is null
        or o.availability_state = p_availability_state
      )
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

revoke all on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
) from public;

grant execute on function public.search_offers(
  text, double precision, double precision, integer, integer,
  public.offer_class, public.presence_mode, public.availability_state, text
) to anon, authenticated;
