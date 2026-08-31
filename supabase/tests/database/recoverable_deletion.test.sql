begin;
select plan(17);

insert into public.offer_media (
  id, offer_id, storage_path, alt_text, sort_order
) values (
  '10000000-0000-0000-0000-000000000095',
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000002/offer/retry.webp',
  'Prueba de borrado',
  3
);

insert into storage.objects (bucket_id, name)
values (
  'offer-media',
  '10000000-0000-0000-0000-000000000002/offer/retry.webp'
);

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
  public.begin_offer_media_deletion(
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000095'
  ),
  '10000000-0000-0000-0000-000000000002/offer/retry.webp',
  'the owner prepares a media deletion and receives its exact path'
);

select is(
  (
    select deletion_pending
    from public.offer_media
    where id = '10000000-0000-0000-0000-000000000095'
  ),
  true,
  'prepared media is marked pending'
);

select throws_ok(
  $$
    select public.finalize_offer_media_deletion(
      '10000000-0000-0000-0000-000000000020',
      '10000000-0000-0000-0000-000000000095'
    )
  $$,
  'P0001',
  'storage_object_remains',
  'database finalization refuses to orphan a Storage object'
);

reset role;
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where bucket_id = 'offer-media'
  and name = '10000000-0000-0000-0000-000000000002/offer/retry.webp';

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
    select public.begin_offer_media_deletion(
      '10000000-0000-0000-0000-000000000020',
      '10000000-0000-0000-0000-000000000095'
    )
  $$,
  'P0001',
  'offer_media_not_found',
  'another account cannot prepare the owner media deletion'
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
  public.finalize_offer_media_deletion(
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000095'
  ),
  true,
  'media metadata finalizes after Storage is gone'
);

select is(
  (
    select count(*)::integer
    from public.offer_media
    where id = '10000000-0000-0000-0000-000000000095'
  ),
  0,
  'finalization removes the pending media row'
);

select is(
  public.finalize_offer_media_deletion(
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000095'
  ),
  true,
  'repeating database finalization is idempotent'
);

reset role;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000092',
  'authenticated',
  'authenticated',
  'borrado-reanudable@local.test',
  extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Borrado reanudable"}'::jsonb,
  now(),
  now()
);

insert into public.seller_presences (
  id, owner_id, name, slug, description, mode, whatsapp_e164,
  served_city, coverage_label, location_public_confirmed, status
) values (
  '10000000-0000-0000-0000-000000000092',
  '10000000-0000-0000-0000-000000000092',
  'Cuenta por borrar',
  'cuenta-por-borrar',
  '',
  'mobile',
  '+50499997777',
  'Siguatepeque',
  'Siguatepeque',
  false,
  'draft'
);

insert into public.offers (
  id, presence_id, slug, offer_class, title, description,
  price_cents, price_mode, unit, availability_model, availability_state,
  availability_details, confirmed_at, status
) values (
  '10000000-0000-0000-0000-000000000093',
  '10000000-0000-0000-0000-000000000092',
  'oferta-por-borrar',
  'stocked_product',
  'Oferta por borrar',
  '',
  1000,
  'fixed',
  'unidad',
  'stock',
  'available',
  '{}'::jsonb,
  now(),
  'draft'
);

insert into public.offer_fulfillment_modes (offer_id, mode)
values (
  '10000000-0000-0000-0000-000000000093',
  'direct_agreement'
);

insert into public.offer_media (
  id, offer_id, storage_path, alt_text, sort_order
) values (
  '10000000-0000-0000-0000-000000000094',
  '10000000-0000-0000-0000-000000000093',
  '10000000-0000-0000-0000-000000000092/offer/tracked.webp',
  '',
  0
);

insert into storage.objects (bucket_id, name)
values (
  'offer-media',
  '10000000-0000-0000-0000-000000000092/orphan.webp'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000092","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000092',
  true
);
set local role authenticated;

select is(
  public.begin_account_deletion(),
  '10000000-0000-0000-0000-000000000092'::uuid,
  'account closure is durably prepared'
);

select is(
  (
    select status::text
    from public.seller_presences
    where id = '10000000-0000-0000-0000-000000000092'
  ),
  'archived',
  'account closure removes the presence from public use transactionally'
);

select is(
  (
    select deletion_pending
    from public.offer_media
    where id = '10000000-0000-0000-0000-000000000094'
  ),
  true,
  'account closure enqueues its tracked media'
);

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'No reabrir', '', 'mobile', '+50499997777', 'Siguatepeque', null,
      null, null, false, 'draft',
      '10000000-0000-0000-0000-000000000092'
    )
  $$,
  'P0001',
  'account_deletion_pending',
  'commercial writes stay closed while deletion is pending'
);

select is(
  cardinality(public.get_account_deletion_paths(1000)),
  2,
  'cleanup includes tracked media and an owned orphan Storage object'
);

select throws_ok(
  $$
    select public.confirm_account_media_deleted(
      public.get_account_deletion_paths(1000)
    )
  $$,
  'P0001',
  'storage_objects_remain',
  'database rows cannot be acknowledged before Storage removal'
);

reset role;
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where bucket_id = 'offer-media'
  and split_part(name, '/', 1) = '10000000-0000-0000-0000-000000000092';

set local role authenticated;

select is(
  public.confirm_account_media_deleted(
    public.get_account_deletion_paths(1000)
  ),
  1::bigint,
  'the database acknowledges the batch after Storage removal'
);

select is(
  cardinality(public.get_account_deletion_paths(1000)),
  0,
  'the outbox advances to an empty batch'
);

select is(
  public.finalize_account_deletion(),
  true,
  'the clean account can be finalized'
);

reset role;

select is(
  (
    select count(*)::integer
    from auth.users
    where id = '10000000-0000-0000-0000-000000000092'
  ),
  0,
  'finalization removes the auth identity'
);

select * from finish();
rollback;
