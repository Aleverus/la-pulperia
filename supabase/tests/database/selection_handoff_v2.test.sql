begin;
select plan(14);

delete from public.request_batches
where buyer_id = '10000000-0000-0000-0000-000000000001';

select set_config(
  'test.offer22_context_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  true
);
select set_config(
  'test.offer25_context_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000025'
  ),
  true
);
select set_config(
  'test.offer26_context_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000026'
  ),
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.prepare_request_batch(
      '[{
        "offer_id":"10000000-0000-0000-0000-000000000022",
        "request":{"quantity":1},
        "context":{"request_context_token":"0000000000000000000000000000000000000000000000000000000000000000"}
      }]'::jsonb
    )
  $$,
  'P0001',
  'offer_context_changed',
  'preparation rejects context the buyer did not review'
);

select is(
  (
    select jsonb_array_length(public.prepare_request_batch(
      jsonb_build_array(
        jsonb_build_object(
          'offer_id', '10000000-0000-0000-0000-000000000022',
          'request', jsonb_build_object(
            'quantity', 2,
            'substitution_ok', true
          ),
          'context', jsonb_build_object(
            'request_context_token',
            current_setting('test.offer22_context_token')
          )
        ),
        jsonb_build_object(
          'offer_id', '10000000-0000-0000-0000-000000000025',
          'request', jsonb_build_object(
            'quantity', 3,
            'variant', 'sin azúcar',
            'requested_window_start', '2030-01-10T15:00:00-06:00',
            'requested_window_end', '2030-01-10T16:00:00-06:00'
          ),
          'context', jsonb_build_object(
            'request_context_token',
            current_setting('test.offer25_context_token')
          )
        ),
        jsonb_build_object(
          'offer_id', '10000000-0000-0000-0000-000000000026',
          'request', jsonb_build_object(
            'scope', 'Canastas para veinte personas',
            'appointment_preference', 'viernes por la tarde',
            'approximate_locality', 'barrio El Carmen'
          ),
          'context', jsonb_build_object(
            'request_context_token',
            current_setting('test.offer26_context_token')
          )
        )
      )
    ) -> 'requests')
  ),
  1,
  'three compatible class-specific items produce one request for one seller'
);

reset role;

select set_config(
  'test.seller_request_id',
  (
    select r.id::text
    from public.seller_requests r
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  true
);

select is(
  (
    select count(*)::integer
    from public.seller_requests r
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  1,
  'exactly one seller request is stored'
);

select is(
  (
    select count(*)::integer
    from public.request_items i
    join public.seller_requests r on r.id = i.seller_request_id
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  3,
  'the request keeps all three class-specific items'
);

select ok(
  (
    select bool_and(i.confirmed_at_snapshot = o.confirmed_at)
    from public.request_items i
    join public.offers o on o.id = i.offer_id
    join public.seller_requests r on r.id = i.seller_request_id
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  'every snapshot keeps the reviewed freshness context'
);

select is(
  (
    select i.request_payload->>'appointment_preference'
    from public.request_items i
    join public.seller_requests r on r.id = i.seller_request_id
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
      and i.offer_class_snapshot = 'local_service'
  ),
  'viernes por la tarde',
  'the service snapshot preserves its appointment semantics'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select throws_ok(
  format(
    'select public.confirm_request_understood(%L::uuid)',
    current_setting('test.seller_request_id')
  ),
  'P0001',
  'handoff_not_opened',
  'the seller cannot confirm understanding before the buyer opens the handoff'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  format(
    'select public.confirm_request_understood(%L::uuid)',
    current_setting('test.seller_request_id')
  ),
  'P0001',
  'seller_request_not_found',
  'another seller cannot confirm the request'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select is(
  public.mark_handoff_opened(
    current_setting('test.seller_request_id')::uuid
  )::text,
  'handoff_opened',
  'the buyer records only that the WhatsApp handoff was opened'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select ok(
  public.confirm_request_understood(
    current_setting('test.seller_request_id')::uuid
  ) is not null,
  'the owning seller can voluntarily confirm understanding'
);

select ok(
  public.confirm_request_understood(
    current_setting('test.seller_request_id')::uuid
  ) is not null,
  'understanding confirmation is idempotent'
);

select is(
  jsonb_array_length(public.get_my_seller_requests(
    '10000000-0000-0000-0000-000000000011'
  )),
  1,
  'the seller inbox exposes only the request addressed to that seller'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.search_events
    where event_kind = 'request_understood'
  ),
  1,
  'idempotent confirmation records one aggregate event'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select ok(
  (
    public.get_handoff((
      current_setting('test.seller_request_id')::uuid
    )) ->> 'seller_understood_at'
  ) is not null,
  'the buyer can see the voluntary understanding signal'
);

select * from finish();
rollback;
