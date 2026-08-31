begin;
select plan(8);

insert into public.request_batches (id, buyer_id)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.seller_requests (
  id, batch_id, presence_id, destination_e164, status
) values
  (
    '20000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000011',
    '+50499992222',
    'prepared'
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000012',
    '+50499993333',
    'prepared'
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

select is(
  (select count(*)::integer from public.get_my_presences()),
  0,
  'an account with no seller presence gets an empty collection'
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

select is(
  (select count(*)::integer from public.get_my_presences()),
  1,
  'a one-presence seller gets exactly that presence'
);

select throws_ok(
  $$
    select public.get_my_seller_requests(
      '10000000-0000-0000-0000-000000000011'
    )
  $$,
  'P0001',
  'presence_not_found',
  'a seller cannot address another owner presence'
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

select is(
  (select count(*)::integer from public.get_my_presences()),
  2,
  'a multi-presence seller gets the complete collection'
);

select is(
  (select array_agg(id) from public.get_my_presences()),
  array[
    '10000000-0000-0000-0000-000000000011'::uuid,
    '10000000-0000-0000-0000-000000000012'::uuid
  ],
  'owned presences keep a stable deterministic order'
);

select is(
  public.get_my_seller_requests(
    '10000000-0000-0000-0000-000000000011'
  )->0->>'seller_request_id',
  '20000000-0000-0000-0000-000000000011',
  'the mobile inbox contains only its own request'
);

select is(
  public.get_my_seller_requests(
    '10000000-0000-0000-0000-000000000012'
  )->0->>'seller_request_id',
  '20000000-0000-0000-0000-000000000012',
  'the remote inbox contains only its own request'
);

select throws_ok(
  $$
    select public.get_my_seller_requests(
      '10000000-0000-0000-0000-000000000010'
    )
  $$,
  'P0001',
  'presence_not_found',
  'an invalid active presence is rejected without leaking its inbox'
);

select * from finish();
rollback;
