begin;
select plan(9);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select lives_ok(
  $$
    select public.confirm_offer_freshness('10000000-0000-0000-0000-000000000020')
  $$,
  'owner can confirm offer freshness'
);

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'Fuera',
      '',
      'physical',
      '+50499993333',
      14.09,
      -87.19,
      true,
      'published',
      '10000000-0000-0000-0000-000000000010'
    )
  $$,
  '23514',
  null,
  'owner cannot publish a physical pin outside Siguatepeque'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$
    select public.confirm_offer_freshness('10000000-0000-0000-0000-000000000020')
  $$,
  'P0001',
  'offer_not_found',
  'buyer cannot confirm another seller offer'
);

select throws_ok(
  $$
    select public.upsert_offer(
      '10000000-0000-0000-0000-000000000010',
      'product',
      'Intruso',
      '',
      1000,
      'fixed',
      null,
      'available',
      'published',
      null,
      false
    )
  $$,
  'P0001',
  'presence_not_found',
  'buyer cannot insert an offer on a foreign presence'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;

select is(
  (
    select location is null and location_public_confirmed = false
    from public.seller_presences
    where id = public.upsert_seller_presence(
      'La Canasta Virtual',
      'Sigue virtual.',
      'virtual',
      '+50499992222',
      14.5969,
      -87.8310,
      true,
      'published',
      '10000000-0000-0000-0000-000000000011'
    )
  ),
  true,
  'virtual upsert drops coordinates even if a pin is submitted'
);

reset role;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000009',
  'authenticated',
  'authenticated',
  'esquina@example.com',
  extensions.crypt('test-pass-corte2', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dueña Esquina"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000009","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000009', true);
set local role authenticated;

select lives_ok(
  $$
    select public.upsert_seller_presence(
      'Pulpería La Esquina',
      'Barrio centro.',
      'physical',
      '+50499993333',
      14.5969,
      -87.8310,
      true,
      'published',
      null
    )
  $$,
  'new seller can publish a confirmed physical pin in Siguatepeque'
);

reset role;
set local role anon;

select is(
  (
    select count(*)::integer
    from public.catalog_presences
    where kind = 'physical' and lat is not null
  ) >= 2,
  true,
  'published physical presence appears in the public catalog with coordinates'
);

select is(
  (
    select count(*)::integer
    from public.catalog_presences
    where slug = 'la-canasta-virtual' and lat is not null
  ),
  0,
  'virtual catalog row never carries a public pin'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'Anónima',
      '',
      'virtual',
      '+50499994444',
      null,
      null,
      false,
      'published',
      null
    )
  $$,
  '42501',
  null,
  'anonymous callers cannot upsert a presence'
);

select * from finish();
rollback;
