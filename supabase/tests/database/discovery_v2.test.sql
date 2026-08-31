begin;
select plan(12);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_offer_class => 'stocked_product')
  ),
  4,
  'stocked-product filter returns only searchable product offers'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_offer_class => 'scheduled_food')
  ),
  1,
  'scheduled-food filter returns its window offer'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_offer_class => 'local_service')
  ),
  1,
  'local-service filter returns its service offer'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_offer_class => 'digital_offer')
  ),
  1,
  'digital-offer filter returns its remote offer'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_availability_state => 'on_request')
  ),
  1,
  'availability filter distinguishes offers handled on request'
);

select is(
  (
    select offer_slug
    from public.search_offers(
      p_offer_class => 'digital_offer',
      p_presence_mode => 'remote'
    )
  ),
  'tarjeta-digital-fixture',
  'class and presence filters compose deterministically'
);

select is(
  (
    select service_territory
    from public.search_offers(p_offer_class => 'digital_offer')
  ),
  'Siguatepeque y atención digital en Honduras',
  'remote results expose territory without coordinates'
);

select is(
  (
    select fulfillment_modes::text
    from public.search_offers(p_offer_class => 'scheduled_food')
  ),
  '{local_coverage}',
  'results preserve fulfillment context for comparison'
);

select ok(
  (
    with ordered as (
      select array_agg(offer_slug) as slugs
      from public.search_offers(p_offer_class => 'stocked_product')
    )
    select
      array_position(slugs, 'zambos-picantes-el-pino')
      < array_position(slugs, 'zambos-picantes-canasta')
    from ordered
  ),
  'organic ordering gives equally relevant current information priority'
);

select ok(
  exists(
    select 1
    from public.search_offers(p_query => 'zambos picantes')
    where offer_slug = 'zambos-picantes-canasta'
  ),
  'old information loses priority without disappearing'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_availability_state => 'unavailable')
  ),
  0,
  'explicit availability filtering cannot reintroduce unavailable offers'
);

select is(
  (
    select count(*)::integer
    from public.search_offers()
  ),
  7,
  'default discovery returns every published searchable offer across four classes'
);

select * from finish();
rollback;
