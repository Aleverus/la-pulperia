begin;
select plan(9);

select has_table(
  'public',
  'seller_maintenance_events',
  'anonymous seller maintenance metrics exist'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.seller_maintenance_events'::regclass),
  true,
  'seller maintenance metrics have RLS enabled'
);

select is(
  has_table_privilege('anon', 'public.seller_maintenance_events', 'select'),
  false,
  'anonymous visitors cannot read seller maintenance samples'
);

select is(
  has_table_privilege('authenticated', 'public.seller_maintenance_events', 'select'),
  false,
  'authenticated users cannot read seller maintenance samples'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select lives_ok(
  $$
    select public.upsert_offer_maintained(
      '10000000-0000-0000-0000-000000000010',
      'stocked_product',
      'Zambos picantes',
      'Actualización de prueba',
      3500,
      'fixed',
      'bolsa',
      'stock',
      'available',
      '{"stock_note":"Disponible hoy"}'::jsonb,
      array['direct_agreement'::public.fulfillment_mode],
      'draft',
      '10000000-0000-0000-0000-000000000020',
      false,
      37
    )
  $$,
  'an owner can maintain an offer through the measured RPC'
);

reset role;

select is(
  (
    select action_kind || ':' || offer_class::text || ':' || duration_seconds::text
    from public.seller_maintenance_events
    order by id desc
    limit 1
  ),
  'update:stocked_product:37',
  'the metric retains only action, class, and bounded duration'
);

select is(
  (
    select array_agg(column_name::text order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'seller_maintenance_events'
  ),
  array['id', 'action_kind', 'offer_class', 'duration_seconds', 'created_at'],
  'the metric has no seller, offer, text, contact, or location column'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$
    select public.upsert_offer_maintained(
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
      'draft',
      null,
      false,
      12
    )
  $$,
  'P0001',
  'presence_not_found',
  'measurement does not weaken offer ownership'
);

reset role;

select is(
  (select count(*)::integer from public.seller_maintenance_events),
  1,
  'a rejected foreign write creates no metric sample'
);

select * from finish();
rollback;
