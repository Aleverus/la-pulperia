begin;
select plan(6);

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
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'vendedor@example.com',
  extensions.crypt('test-pass-corte0', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Vendedora de prueba"}'::jsonb,
  now(),
  now()
);

select ok(
  exists(
    select 1 from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'
      and display_name = 'Vendedora de prueba'
  ),
  'new auth user creates a profile'
);

select throws_ok(
  $$
    insert into public.seller_presences (
      owner_id, name, slug, kind, whatsapp_e164, location, location_public_confirmed, status
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'Canasta Virtual',
      'canasta-virtual',
      'virtual',
      '+50499991111',
      extensions.ST_Point(-87.8310, 14.5969)::extensions.geography,
      false,
      'draft'
    )
  $$,
  '23514',
  null,
  'virtual presence cannot store coordinates'
);

insert into public.seller_presences (
  id, owner_id, name, slug, kind, whatsapp_e164, status
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Canasta Virtual',
  'canasta-virtual',
  'virtual',
  '+50499991111',
  'published'
);

select throws_ok(
  $$
    insert into public.offers (
      presence_id, slug, kind, title, price_cents, price_mode, status
    ) values (
      '22222222-2222-2222-2222-222222222222',
      'sin-precio',
      'product',
      'Zambos',
      0,
      'fixed',
      'published'
    )
  $$,
  '23514',
  null,
  'offer requires a positive HNL amount'
);

insert into public.offers (
  id, presence_id, slug, kind, title, price_cents, price_mode, status
) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'zambos-picantes',
  'product',
  'Zambos picantes',
  3500,
  'fixed',
  'published'
);

insert into public.offer_media (offer_id, storage_path, sort_order)
values
  ('33333333-3333-3333-3333-333333333333', 'a.webp', 0),
  ('33333333-3333-3333-3333-333333333333', 'b.webp', 1),
  ('33333333-3333-3333-3333-333333333333', 'c.webp', 2),
  ('33333333-3333-3333-3333-333333333333', 'd.webp', 3);

select throws_ok(
  $$
    insert into public.offer_media (offer_id, storage_path, sort_order)
    values ('33333333-3333-3333-3333-333333333333', 'e.webp', 0)
  $$,
  'P0001',
  'offer_media_limit',
  'an offer accepts at most four images'
);

select throws_ok(
  $$
    insert into public.seller_presences (
      owner_id, name, slug, kind, whatsapp_e164, location, location_public_confirmed, status
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'Fuera de la ciudad',
      'fuera',
      'physical',
      '+50499992222',
      extensions.ST_Point(-87.19, 14.09)::extensions.geography,
      true,
      'published'
    )
  $$,
  '23514',
  null,
  'published physical presence must sit in Siguatepeque'
);

select throws_ok(
  $$
    insert into public.seller_requests (
      batch_id,
      presence_id,
      destination_e164,
      status,
      handoff_opened_at
    ) values (
      gen_random_uuid(),
      '22222222-2222-2222-2222-222222222222',
      '+50499991111',
      'sold',
      now()
    )
  $$,
  '22P02',
  null,
  'seller request status cannot represent a sale'
);

select * from finish();
rollback;
