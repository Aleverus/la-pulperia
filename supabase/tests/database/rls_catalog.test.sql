begin;
select plan(18);

select hasnt_column(
  'public',
  'catalog_presences',
  'whatsapp_e164',
  'public catalog does not expose WhatsApp'
);

select is(
  (
    select location is null
    from public.catalog_presences
    where slug = 'la-canasta-virtual'
  ),
  true,
  'mobile presence has no public coordinates'
);

select ok(
  (
    select lat is not null and lng is not null
    from public.catalog_presences
    where slug = 'el-pino'
  ),
  'fixed published presence exposes coordinates'
);

select is(
  (
    select count(*)::integer
    from public.search_offers('zambos picantes')
  ),
  2,
  'search returns comparable zambos from both sellers'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_query => 'zámbos picantes')
  ),
  2,
  'search normalizes accents'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_query => 'zambs picantes')
  ),
  2,
  'search tolerates a common typo'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(
      p_query => 'zambos picantes',
      p_presence_mode => 'fixed_location'
    )
  ),
  1,
  'fixed-location filter excludes mobile offers'
);

select is(
  (
    select presence_name
    from public.search_offers(
      p_query => 'zambos picantes',
      p_sort => 'organic'
    )
    limit 1
  ),
  'La Canasta Móvil',
  'organic ordering is explicit and deterministic'
);

select is(
  (
    select presence_name
    from public.search_offers(
      p_query => 'zambos picantes',
      p_limit => 1,
      p_offset => 1,
      p_sort => 'organic'
    )
    limit 1
  ),
  'Pulpería El Pino',
  'limit and offset preserve the selected ordering'
);

select ok(
  (
    select dist_meters < 10
    from public.search_offers(
      p_query => 'zambos picantes',
      p_lat => 14.5969,
      p_lng => -87.831,
      p_sort => 'nearby'
    )
    where presence_slug = 'el-pino'
  ),
  'nearby sorting returns an ephemeral distance for a fixed seller'
);

select is(
  (
    select count(*)::integer
    from public.search_offers('zambos picantes') s
    where s.availability_state = 'unavailable'
  ),
  0,
  'unavailable offers stay out of default search'
);

select ok(
  exists(
    select 1 from public.catalog_offers where slug = 'pan-de-yema-el-pino'
  ),
  'unavailable offer remains visible on the pulpería catalog'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('catalog_presences', 'catalog_offers', 'catalog_offer_media')
      and c.reloptions @> array['security_invoker=true']
  ),
  3,
  'all public catalog views enforce invoker RLS'
);

set local role anon;

select lives_ok(
  $$ select count(*) from public.catalog_offer_media $$,
  'anonymous media catalog access can evaluate the pending-deletion gate'
);

select is(
  (
    select count(*)::integer
    from public.catalog_offers
    where id in (
      '10000000-0000-0000-0000-000000000020',
      '10000000-0000-0000-0000-000000000021',
      '10000000-0000-0000-0000-000000000022',
      '10000000-0000-0000-0000-000000000023',
      '10000000-0000-0000-0000-000000000024'
    )
  ),
  5,
  'anonymous catalog reads all published seed offers through RLS'
);

select throws_ok(
  $$ select whatsapp_e164 from public.seller_presences limit 1 $$,
  '42501',
  null,
  'anonymous catalog access cannot read seller WhatsApp'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is_empty(
  $$
    select whatsapp_e164
    from public.seller_presences
    where slug = 'el-pino'
  $$,
  'buyer cannot read another seller WhatsApp from the base table'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select public.prepare_request_batch(
      '[{"offer_id":"10000000-0000-0000-0000-000000000020","request":{"quantity":1}}]'::jsonb
    )
  $$,
  '42501',
  null,
  'anonymous callers cannot prepare a request'
);

select * from finish();
rollback;
