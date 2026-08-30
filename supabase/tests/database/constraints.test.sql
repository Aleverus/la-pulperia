begin;
select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'vendedor@example.com',
  extensions.crypt('test-pass-corte1', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Vendedora de prueba"}'::jsonb, now(), now()
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
      owner_id, name, slug, mode, coverage_label, whatsapp_e164, location,
      location_public_confirmed, status
    ) values (
      '11111111-1111-1111-1111-111111111111', 'Canasta móvil',
      'canasta-movil-invalida', 'mobile', 'Siguatepeque', '+50499991111',
      extensions.st_point(-87.8310, 14.5969)::extensions.geography,
      false, 'draft'
    )
  $$,
  '23514', null,
  'mobile presence cannot store coordinates'
);

insert into public.seller_presences (
  id, owner_id, name, slug, mode, coverage_label, whatsapp_e164, status
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Canasta móvil', 'canasta-movil', 'mobile', 'Siguatepeque',
  '+50499991111', 'published'
);

select throws_ok(
  $$
    insert into public.offers (
      presence_id, slug, offer_class, title, price_cents, price_mode,
      availability_model, availability_state, status
    ) values (
      '22222222-2222-2222-2222-222222222222', 'cotizacion-con-cifra',
      'local_service', 'Servicio', 1000, 'quote', 'on_request', 'on_request',
      'draft'
    )
  $$,
  '23514', null,
  'quote rejects a numeric price'
);

select throws_ok(
  $$
    insert into public.offers (
      presence_id, slug, offer_class, title, price_cents, price_mode,
      availability_model, availability_state, status
    ) values (
      '22222222-2222-2222-2222-222222222222', 'fijo-sin-cifra',
      'stocked_product', 'Producto', null, 'fixed', 'stock', 'available',
      'draft'
    )
  $$,
  '23514', null,
  'fixed price requires a positive amount'
);

select throws_ok(
  $$
    insert into public.offers (
      presence_id, slug, offer_class, title, price_cents, price_mode,
      availability_model, availability_state, availability_details, status
    ) values (
      '22222222-2222-2222-2222-222222222222', 'producto-con-agenda',
      'stocked_product', 'Producto', 1000, 'fixed', 'schedule', 'available',
      '{"schedule_note":"Mañana"}'::jsonb, 'draft'
    )
  $$,
  '23514', null,
  'product cannot use schedule availability'
);

select throws_ok(
  $$
    insert into public.offers (
      presence_id, slug, offer_class, title, price_cents, price_mode,
      availability_model, availability_state, status
    ) values (
      '22222222-2222-2222-2222-222222222222', 'publicada-sin-cumplimiento',
      'stocked_product', 'Producto', 1000, 'fixed', 'stock', 'available',
      'published'
    )
  $$,
  '23514', 'fulfillment_required',
  'published offer requires fulfillment'
);

insert into public.offers (
  id, presence_id, slug, offer_class, title, price_cents, price_mode,
  availability_model, availability_state, status
) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'zambos-picantes', 'stocked_product', 'Zambos picantes', 3500, 'fixed',
  'stock', 'available', 'draft'
);

select throws_ok(
  $$
    insert into public.offer_fulfillment_modes (offer_id, mode)
    values ('33333333-3333-3333-3333-333333333333', 'digital_delivery')
  $$,
  '23514', 'fulfillment_invalid',
  'product rejects digital delivery'
);

insert into public.offers (
  id, presence_id, slug, offer_class, title, price_cents, price_mode,
  availability_model, availability_state, availability_details, status
) values (
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'servicio-local', 'local_service', 'Servicio local', null, 'quote',
  'on_request', 'on_request', '{"requirements":"Describir el trabajo"}', 'draft'
);

insert into public.offer_fulfillment_modes (offer_id, mode)
values ('44444444-4444-4444-4444-444444444444', 'local_coverage');

select throws_ok(
  $$
    update public.offers
    set offer_class = 'digital_offer'
    where id = '44444444-4444-4444-4444-444444444444';
    set constraints offers_fulfillment_compatibility_trg immediate
  $$,
  '23514', 'fulfillment_invalid',
  'changing class cannot leave an incompatible fulfillment mode'
);

insert into public.offer_media (offer_id, storage_path, sort_order) values
  ('33333333-3333-3333-3333-333333333333', 'a.webp', 0),
  ('33333333-3333-3333-3333-333333333333', 'b.webp', 1),
  ('33333333-3333-3333-3333-333333333333', 'c.webp', 2),
  ('33333333-3333-3333-3333-333333333333', 'd.webp', 3);

select throws_ok(
  $$
    insert into public.offer_media (offer_id, storage_path, sort_order)
    values ('33333333-3333-3333-3333-333333333333', 'e.webp', 0)
  $$,
  'P0001', 'offer_media_limit',
  'an offer accepts at most four images'
);

select throws_ok(
  $$
    insert into public.seller_presences (
      owner_id, name, slug, mode, whatsapp_e164, location,
      location_public_confirmed, status
    ) values (
      '11111111-1111-1111-1111-111111111111', 'Fuera', 'fuera',
      'fixed_location', '+50499992222',
      extensions.st_point(-87.19, 14.09)::extensions.geography,
      true, 'published'
    )
  $$,
  '23514', null,
  'published fixed location must sit in Siguatepeque'
);

select throws_ok(
  $$
    insert into public.seller_requests (
      batch_id, presence_id, destination_e164, status, handoff_opened_at
    ) values (
      gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
      '+50499991111', 'sold', now()
    )
  $$,
  '22P02', null,
  'seller request status cannot represent a sale'
);

select * from finish();
rollback;
