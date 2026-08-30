begin;
select plan(12);

select is(
  (select count(distinct offer_class)::integer from public.offers),
  4,
  'seed covers all four offer classes'
);

select is(
  (select count(distinct availability_model)::integer from public.offers),
  4,
  'seed covers all four availability models'
);

select is(
  (
    select count(*)::integer from public.offers
    where price_mode = 'quote' and price_cents is not null
  ),
  0,
  'quote never invents a numeric price'
);

select hasnt_column(
  'public', 'catalog_presences', 'whatsapp_e164',
  'v2 public catalog still hides WhatsApp'
);

select ok(
  public.valid_request_payload(
    'stocked_product', '{"quantity":2,"substitution_ok":true}'::jsonb
  ),
  'stock product accepts quantity and substitution preference'
);

select ok(
  public.valid_request_payload(
    'scheduled_food',
    '{"quantity":1,"requested_window_start":"2030-01-10T14:00:00-06:00","requested_window_end":"2030-01-10T17:00:00-06:00"}'::jsonb
  ),
  'scheduled food accepts quantity and desired window'
);

select ok(
  public.valid_request_payload(
    'local_service',
    '{"scope":"Revisar una licuadora","approximate_locality":"Barrio Centro"}'::jsonb
  ),
  'local service accepts scope and approximate locality'
);

select ok(
  public.valid_request_payload(
    'digital_offer',
    '{"scope":"Tarjeta para cumpleaños","reference_url":"https://example.com/reference"}'::jsonb
  ),
  'digital offer accepts scope and a bounded public URL'
);

select is(
  public.valid_request_payload(
    'stocked_product', '{"quantity":1,"admin":true}'::jsonb
  ),
  false,
  'request payload rejects undeclared keys'
);

select is(
  public.valid_request_payload(
    'scheduled_food',
    '{"quantity":1,"requested_window_start":"2030-01-10T17:00:00-06:00","requested_window_end":"2030-01-10T14:00:00-06:00"}'::jsonb
  ),
  false,
  'food request rejects a reversed window'
);

select is(
  public.valid_request_payload(
    'local_service',
    '{"scope":"Visita","lat":14.59,"lng":-87.83}'::jsonb
  ),
  false,
  'service request cannot persist exact coordinates'
);

select is(
  public.fulfillment_allowed('digital_offer', 'pickup'),
  false,
  'digital offer rejects physical pickup fulfillment'
);

select * from finish();
rollback;
