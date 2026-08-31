begin;
select plan(9);

insert into public.search_events (
  query_normalized, result_count, event_kind, created_at
)
select
  'persona@example.com',
  1,
  'offer_open',
  '2037-01-01 10:00:20+00'::timestamptz
from generate_series(1, 100);

select is(
  (
    select count(*)::integer
    from public.search_events
    where event_kind = 'offer_open'
      and metric_bucket = '2037-01-01 10:00:00+00'::timestamptz
  ),
  1,
  'a public burst occupies one minute bucket'
);

select is(
  (
    select event_count::integer
    from public.search_events
    where event_kind = 'offer_open'
      and metric_bucket = '2037-01-01 10:00:00+00'::timestamptz
  ),
  60,
  'the public bucket is capped instead of counting an arbitrary burst'
);

select is(
  (
    select query_normalized
    from public.search_events
    where event_kind = 'offer_open'
      and metric_bucket = '2037-01-01 10:00:00+00'::timestamptz
  ),
  '',
  'the aggregated event retains no submitted text or PII'
);

insert into public.search_events (
  query_normalized, result_count, event_kind, created_at
)
select 'consulta útil', 3, 'search', '2037-01-01 10:01:15+00'::timestamptz
from generate_series(1, 80);

insert into public.search_events (
  query_normalized, result_count, event_kind, created_at
)
select 'consulta vacía', 0, 'search', '2037-01-01 10:01:45+00'::timestamptz
from generate_series(1, 80);

select is(
  (
    select count(*)::integer
    from public.search_events
    where event_kind = 'search'
      and metric_bucket = '2037-01-01 10:01:00+00'::timestamptz
  ),
  2,
  'searches retain only useful versus empty outcome variants'
);

select is(
  (
    select event_count::integer
    from public.search_events
    where event_kind = 'search'
      and metric_bucket = '2037-01-01 10:01:00+00'::timestamptz
      and metric_variant = 1
  ),
  60,
  'useful search bursts are capped independently'
);

select is(
  (
    select event_count::integer
    from public.search_events
    where event_kind = 'search'
      and metric_bucket = '2037-01-01 10:01:00+00'::timestamptz
      and metric_variant = 0
  ),
  60,
  'empty search bursts are capped independently'
);

select is(
  (
    select count(*)::integer
    from public.search_events
    where query_normalized <> ''
  ),
  0,
  'no metric row retains raw queries'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;

select is(
  public.get_metrics_summary()->'events'->>'offer_open',
  '60',
  'operator summaries use the bounded aggregate count'
);

reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.search_events $$,
  '42501',
  null,
  'anonymous callers cannot read raw metric buckets'
);

select * from finish();
rollback;
