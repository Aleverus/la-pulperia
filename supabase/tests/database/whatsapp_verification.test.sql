begin;
select plan(12);

select is(
  (
    select count(*)::integer
    from public.seller_presences
    where status = 'published'
      and whatsapp_verification_status <> 'verified'
  ),
  0,
  'every published fixture has a verified WhatsApp destination'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000091',
  'authenticated',
  'authenticated',
  'whatsapp-gate@local.test',
  extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Prueba WhatsApp"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000091","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000091',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'Destino sin verificar', '', 'mobile', '+50499995555',
      'Siguatepeque', null, null, null, false, 'published', null
    )
  $$,
  'P0001',
  'whatsapp_not_verified',
  'a new unverified number cannot be published'
);

select lives_ok(
  $$
    select public.upsert_seller_presence(
      'Destino sin verificar', '', 'mobile', '+50499995555',
      'Siguatepeque', null, null, null, false, 'draft', null
    )
  $$,
  'the same presence can be saved as a draft'
);

select is(
  (
    select whatsapp_verification_status::text
    from public.seller_presences
    where owner_id = auth.uid()
  ),
  'unverified',
  'draft creation never infers control from number syntax'
);

select is(
  (
    select whatsapp_verification_status::text
    from public.get_my_presences()
    where name = 'Destino sin verificar'
  ),
  'unverified',
  'the owner RPC exposes the explicit verification state'
);

select is(
  public.confirm_owned_whatsapp(
    (select id from public.seller_presences where owner_id = auth.uid())
  ),
  true,
  'the authenticated owner can confirm the saved WhatsApp destination'
);

select is(
  (
    select whatsapp_verification_status::text
    from public.seller_presences
    where owner_id = auth.uid()
  ),
  'verified',
  'owner confirmation records the verification gate'
);

select is(
  public.confirm_owned_whatsapp('10000000-0000-0000-0000-000000000010'),
  false,
  'an owner cannot confirm another presence'
);

reset role;

update public.seller_presences
set
  whatsapp_verification_status = 'verified',
  whatsapp_verified_at = now()
where owner_id = '10000000-0000-0000-0000-000000000091';

set local role authenticated;

select lives_ok(
  $$
    select public.upsert_seller_presence(
      'Destino verificado', '', 'mobile', '+50499995555',
      'Siguatepeque', null, null, null, false, 'published',
      (select id from public.seller_presences where owner_id = auth.uid())
    )
  $$,
  'a trusted verification mark allows publication'
);

reset role;
set local role anon;

select is(
  (
    select count(*)::integer
    from public.catalog_presences
    where name = 'Destino verificado'
  ),
  1,
  'the verified presence is visible in the public catalog'
);

reset role;

update public.seller_presences
set whatsapp_e164 = '+50499996666', status = 'draft'
where owner_id = '10000000-0000-0000-0000-000000000091';

select is(
  (
    select whatsapp_verification_status::text
    from public.seller_presences
    where owner_id = '10000000-0000-0000-0000-000000000091'
  ),
  'unverified',
  'changing the destination resets its verification'
);

set local role authenticated;

select throws_ok(
  $$
    select public.upsert_seller_presence(
      'Destino cambiado', '', 'mobile', '+50499996666',
      'Siguatepeque', null, null, null, false, 'published',
      (select id from public.seller_presences where owner_id = auth.uid())
    )
  $$,
  'P0001',
  'whatsapp_not_verified',
  'a changed number must be verified again before publication'
);

select * from finish();
rollback;
