begin;
select plan(14);

update public.offers
set confirmed_at = now() - interval '8 days'
where id = '10000000-0000-0000-0000-000000000020';

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    update public.seller_presences
    set description = description
    where id = '10000000-0000-0000-0000-000000000010'
  $$,
  '42501', null,
  'authenticated sellers cannot bypass the presence RPC with direct writes'
);

select throws_ok(
  $$
    update public.offers
    set title = title
    where id = '10000000-0000-0000-0000-000000000020'
  $$,
  '42501', null,
  'authenticated sellers cannot bypass the offer RPC with direct writes'
);

select throws_ok(
  $$
    delete from public.offer_fulfillment_modes
    where offer_id = '10000000-0000-0000-0000-000000000020'
  $$,
  '42501', null,
  'authenticated sellers cannot bypass fulfillment validation with direct writes'
);

select lives_ok(
  $$
    select public.confirm_offer_freshness('10000000-0000-0000-0000-000000000020')
  $$,
  'owner can confirm offer freshness'
);

select ok(
  (
    select confirmed_at >= now() - interval '1 minute'
    from public.offers
    where id = '10000000-0000-0000-0000-000000000020'
  ),
  'an offer can be reconfirmed after more than one week without operator help'
);

select lives_ok(
  $$
    select public.upsert_offer(
      '10000000-0000-0000-0000-000000000010',
      'stocked_product',
      'Producto RPC de prueba',
      '',
      1000,
      'fixed',
      'unidad',
      'stock',
      'available',
      '{}'::jsonb,
      array[
        'direct_agreement'::public.fulfillment_mode,
        'direct_agreement'::public.fulfillment_mode
      ],
      'draft',
      null,
      false
    );
    set constraints offers_fulfillment_compatibility_trg immediate
  $$,
  'owner can create a valid offer and duplicate fulfillment modes are normalized'
);

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'Fuera',
      '',
      'fixed_location',
      '+50499991111',
      null,
      null,
      14.09,
      -87.19,
      true,
      'published',
      '10000000-0000-0000-0000-000000000010'
    )
  $$,
  '23514',
  null,
  'owner cannot publish a fixed pin outside Siguatepeque'
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
      'stocked_product',
      'Intruso',
      '',
      1000,
      'fixed',
      null,
      'stock',
      'available',
      '{}'::jsonb,
      array['direct_agreement'::public.fulfillment_mode],
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
      'La Canasta Móvil',
      'Sigue móvil.',
      'mobile',
      '+50499992222',
      'Siguatepeque',
      null,
      14.5969,
      -87.8310,
      true,
      'published',
      '10000000-0000-0000-0000-000000000011'
    )
  ),
  true,
  'mobile upsert drops coordinates even if a pin is submitted'
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
      'fixed_location',
      '+50499993333',
      null,
      null,
      14.5969,
      -87.8310,
      true,
      'draft',
      null
    )
  $$,
  'new seller can save a confirmed fixed pin as an unverified draft'
);

reset role;
set local role anon;

select is(
  (
    select count(*)::integer
    from public.catalog_presences
    where mode = 'fixed_location' and lat is not null
  ) >= 1,
  true,
  'the verified fixture remains in the public catalog with coordinates'
);

select is(
  (
    select count(*)::integer
    from public.catalog_presences
    where slug = 'la-canasta-virtual' and lat is not null
  ),
  0,
  'mobile catalog row never carries a public pin'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'Anónima',
      '',
      'mobile',
      '+50499994444',
      'Siguatepeque',
      null,
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
