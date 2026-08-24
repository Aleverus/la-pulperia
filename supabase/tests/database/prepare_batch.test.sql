begin;
select plan(5);

-- Keep the fixture buyer deterministic when this gate follows a local E2E run.
delete from public.request_batches
where buyer_id = '10000000-0000-0000-0000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (
    select jsonb_array_length(public.prepare_request_batch(
      '[
        {"offer_id":"10000000-0000-0000-0000-000000000020","quantity":2},
        {"offer_id":"10000000-0000-0000-0000-000000000022","quantity":1}
      ]'::jsonb
    ) -> 'requests')
  ),
  2,
  'multi-seller cart produces one request per seller'
);

reset role;

select is(
  (
    select count(distinct r.presence_id)::integer
    from public.seller_requests r
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  2,
  'exactly two seller destinations are stored'
);

select is(
  (
    select i.price_cents_snapshot
    from public.request_items i
    join public.seller_requests r on r.id = i.seller_request_id
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
      and i.offer_id = '10000000-0000-0000-0000-000000000020'
  ),
  3500,
  'snapshot captures the published price'
);

update public.offers
set price_cents = 9900
where id = '10000000-0000-0000-0000-000000000020';

select is(
  (
    select i.price_cents_snapshot
    from public.request_items i
    where i.offer_id = '10000000-0000-0000-0000-000000000020'
    order by i.id
    limit 1
  ),
  3500,
  'later price edits do not rewrite the snapshot'
);

select isnt(
  (
    select r.status::text
    from public.seller_requests r
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
    limit 1
  ),
  'handoff_opened',
  'preparing a request is not a sale or an opened handoff'
);

select * from finish();
rollback;
