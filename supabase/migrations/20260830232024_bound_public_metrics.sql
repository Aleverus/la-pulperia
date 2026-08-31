-- Public metrics are directional pilot signals, not a request log. Collapse
-- identical public outcomes into minute buckets and cap each bucket so a burst
-- cannot be interpreted as equivalent independent demand.

drop trigger scrub_search_event_trg on public.search_events;

alter table public.search_events
  add column metric_bucket timestamptz,
  add column metric_variant smallint,
  add column event_count smallint not null default 1;

update public.search_events
set
  query_normalized = '',
  metric_bucket = date_trunc('minute', created_at),
  metric_variant = case
    when event_kind = 'search' and result_count > 0 then 1
    else 0
  end;

alter table public.search_events
  alter column metric_bucket set not null,
  alter column metric_variant set not null,
  add constraint search_events_metric_variant_check check (
    metric_variant in (0, 1)
  ),
  add constraint search_events_event_count_check check (
    event_count between 1 and 60
  );

-- Collapse any historical duplicates before enforcing the new bucket shape.
update public.search_events e
set
  event_count = grouped.total,
  result_count = case when grouped.metric_variant = 1 then 1 else 0 end
from (
  select
    min(id) as keeper_id,
    event_kind,
    metric_bucket,
    metric_variant,
    least(sum(event_count), 60)::smallint as total
  from public.search_events
  where event_kind in ('search', 'offer_open', 'selection_add')
  group by event_kind, metric_bucket, metric_variant
) grouped
where e.id = grouped.keeper_id;

delete from public.search_events e
using public.search_events keeper
where e.event_kind in ('search', 'offer_open', 'selection_add')
  and keeper.event_kind = e.event_kind
  and keeper.metric_bucket = e.metric_bucket
  and keeper.metric_variant = e.metric_variant
  and keeper.id < e.id;

create unique index search_events_public_bucket_idx
  on public.search_events (event_kind, metric_bucket, metric_variant)
  where event_kind in ('search', 'offer_open', 'selection_add');

create or replace function public.scrub_search_event()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.query_normalized := '';
  new.metric_bucket := date_trunc(
    'minute',
    coalesce(new.created_at, statement_timestamp())
  );
  new.metric_variant := case
    when new.event_kind = 'search' and new.result_count > 0 then 1
    else 0
  end;
  new.event_count := 1;

  if new.event_kind in ('search', 'offer_open', 'selection_add') then
    perform pg_advisory_xact_lock(
      hashtextextended(
        new.event_kind || ':' ||
          extract(epoch from new.metric_bucket)::bigint::text || ':' ||
          new.metric_variant::text,
        0
      )
    );

    update public.search_events e
    set event_count = least(e.event_count + 1, 60)::smallint
    where e.event_kind = new.event_kind
      and e.metric_bucket = new.metric_bucket
      and e.metric_variant = new.metric_variant;
    if found then
      return null;
    end if;
  end if;

  return new;
end;
$$;

create trigger scrub_search_event_trg
  before insert on public.search_events
  for each row execute function public.scrub_search_event();

comment on table public.search_events is
  'PII-free aggregate pilot signals. Public kinds are capped at 60 events per minute and outcome variant.';

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
      'search', coalesce(sum(event_count) filter (where event_kind = 'search'), 0),
      'offer_open', coalesce(sum(event_count) filter (where event_kind = 'offer_open'), 0),
      'selection_add', coalesce(sum(event_count) filter (where event_kind = 'selection_add'), 0),
      'request_prepared', coalesce(sum(event_count) filter (where event_kind = 'request_prepared'), 0),
      'handoff_opened', coalesce(sum(event_count) filter (where event_kind = 'handoff_opened'), 0),
      'request_understood', coalesce(sum(event_count) filter (where event_kind = 'request_understood'), 0),
      'seller_update', coalesce(sum(event_count) filter (where event_kind = 'seller_update'), 0)
    ),
    'useful_searches', coalesce(sum(event_count) filter (
      where event_kind = 'search' and metric_variant = 1
    ), 0),
    'empty_searches', coalesce(sum(event_count) filter (
      where event_kind = 'search' and metric_variant = 0
    ), 0),
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

revoke all on function public.scrub_search_event() from public;
