begin;
select plan(6);

insert into public.request_batches (
  id, buyer_id, created_at, expires_at
) values (
  '10000000-0000-0000-0000-000000000080',
  '10000000-0000-0000-0000-000000000001',
  now() - interval '1 day',
  now() + interval '179 days'
);

insert into public.seller_requests (
  id, batch_id, presence_id, destination_e164, status, handoff_opened_at
) values
  (
    '10000000-0000-0000-0000-000000000081',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000010',
    '+50499991111',
    'handoff_opened',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000082',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000011',
    '+50499992222',
    'prepared',
    null
  );

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000001"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select seller_count from public.get_my_request_batches()
   where batch_id = '10000000-0000-0000-0000-000000000080'),
  2::bigint,
  'request history groups destinations by batch'
);

select is(
  (select handoff_opened_count from public.get_my_request_batches()
   where batch_id = '10000000-0000-0000-0000-000000000080'),
  1::bigint,
  'request history counts opened handoffs without exposing destinations'
);

select is(
  public.set_saved_locality(true),
  'Siguatepeque',
  'the buyer can remember the supported locality'
);

select is(
  (select last_locality from public.profiles
   where id = '10000000-0000-0000-0000-000000000001'),
  'Siguatepeque',
  'the profile stores only the locality name'
);

select ok(
  (select public.within_siguatepeque(last_locality_center)
   from public.profiles
   where id = '10000000-0000-0000-0000-000000000001'),
  'the saved center is a coarse city point inside coverage'
);

select is(
  public.set_saved_locality(false),
  null,
  'the buyer can forget the saved locality'
);

select * from finish();
rollback;
