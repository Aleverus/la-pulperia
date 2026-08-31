begin;
select plan(9);

select ok(
  public.valid_request_payload(
    'stocked_product', '{"quantity":0.5}'::jsonb
  ),
  'stock product accepts a half-unit quantity'
);

select ok(
  public.valid_request_payload(
    'scheduled_food',
    '{"quantity":1.25,"requested_window_start":"2030-01-10T14:00:00-06:00","requested_window_end":"2030-01-10T16:00:00-06:00"}'::jsonb
  ),
  'scheduled food accepts a quantity with two decimals'
);

select is(
  public.valid_request_payload('stocked_product', '{"quantity":0}'::jsonb),
  false,
  'zero quantity is rejected'
);

select is(
  public.valid_request_payload('stocked_product', '{"quantity":-0.5}'::jsonb),
  false,
  'negative quantity is rejected'
);

select is(
  public.valid_request_payload('stocked_product', '{"quantity":1.0001}'::jsonb),
  false,
  'more than three quantity decimals are rejected'
);

select ok(
  public.valid_request_payload('stocked_product', '{"quantity":10000}'::jsonb),
  'the explicit quantity maximum is accepted'
);

select is(
  public.valid_request_payload('stocked_product', '{"quantity":10000.001}'::jsonb),
  false,
  'quantities above the maximum are rejected'
);

select throws_ok(
  $$
    update public.offers
    set unit = null
    where id = '10000000-0000-0000-0000-000000000020'
  $$,
  '23514', null,
  'a quantified offer cannot lose its commercial unit'
);

select is(
  (
    select array_agg(offer_id order by ordinal)
    from public.search_offers(p_sort => 'price_asc')
      with ordinality as rows(offer_id, offer_slug, offer_class, title,
        description, price_cents, price_mode, unit, availability_model,
        availability_state, availability_details, confirmed_at, presence_id,
        presence_slug, presence_name, presence_mode, coverage_label,
        service_territory, fulfillment_modes, dist_meters,
        request_context_token, ordinal)
  ),
  (
    select array_agg(offer_id order by ordinal)
    from public.search_offers(p_sort => 'organic')
      with ordinality as rows(offer_id, offer_slug, offer_class, title,
        description, price_cents, price_mode, unit, availability_model,
        availability_state, availability_details, confirmed_at, presence_id,
        presence_slug, presence_name, presence_mode, coverage_label,
        service_territory, fulfillment_modes, dist_meters,
        request_context_token, ordinal)
  ),
  'legacy price sorting degrades to organic ordering'
);

select * from finish();
rollback;
