begin;
select plan(14);

delete from public.request_batches
where buyer_id = '10000000-0000-0000-0000-000000000001';

select set_config(
  'test.offer22_base_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  true
);

select matches(
  current_setting('test.offer22_base_token'),
  '^[0-9a-f]{64}$',
  'the reviewed context is represented by a SHA-256 token'
);

insert into public.offer_fulfillment_modes (offer_id, mode) values
  ('10000000-0000-0000-0000-000000000022', 'pickup'),
  ('10000000-0000-0000-0000-000000000022', 'local_coverage');

select set_config(
  'test.offer22_ordered_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  true
);

delete from public.offer_fulfillment_modes
where offer_id = '10000000-0000-0000-0000-000000000022'
  and mode in ('pickup', 'local_coverage');

insert into public.offer_fulfillment_modes (offer_id, mode) values
  ('10000000-0000-0000-0000-000000000022', 'local_coverage'),
  ('10000000-0000-0000-0000-000000000022', 'pickup');

select is(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_ordered_token'),
  'fulfillment insertion order does not change the reviewed context'
);

select set_config(
  'test.offer22_full_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  true
);

update public.offers
set price_cents = price_cents + 1
where id = '10000000-0000-0000-0000-000000000022';
select isnt(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_full_token'),
  'a price change invalidates the reviewed context'
);
update public.offers
set price_cents = price_cents - 1
where id = '10000000-0000-0000-0000-000000000022';

update public.offers
set unit = 'paquete'
where id = '10000000-0000-0000-0000-000000000022';
select isnt(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_full_token'),
  'a commercial unit change invalidates the reviewed context'
);
update public.offers
set unit = 'bolsa'
where id = '10000000-0000-0000-0000-000000000022';

update public.offers
set availability_state = 'limited'
where id = '10000000-0000-0000-0000-000000000022';
select isnt(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_full_token'),
  'an availability change invalidates the reviewed context'
);
update public.offers
set availability_state = 'available'
where id = '10000000-0000-0000-0000-000000000022';

update public.seller_presences
set coverage_label = coverage_label || ' ampliada'
where id = '10000000-0000-0000-0000-000000000011';
select isnt(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_full_token'),
  'a coverage change invalidates the reviewed context'
);
update public.seller_presences
set coverage_label = 'Siguatepeque; confirmar cobertura con el vendedor'
where id = '10000000-0000-0000-0000-000000000011';

update public.seller_presences
set whatsapp_e164 = '+50499992223', status = 'draft'
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set whatsapp_verification_status = 'verified', whatsapp_verified_at = now()
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set status = 'published'
where id = '10000000-0000-0000-0000-000000000011';
select isnt(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_full_token'),
  'a handoff destination change invalidates the reviewed context'
);
update public.seller_presences
set whatsapp_e164 = '+50499992222', status = 'draft'
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set whatsapp_verification_status = 'verified', whatsapp_verified_at = now()
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set status = 'published'
where id = '10000000-0000-0000-0000-000000000011';

delete from public.offer_fulfillment_modes
where offer_id = '10000000-0000-0000-0000-000000000022'
  and mode = 'pickup';
select isnt(
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  current_setting('test.offer22_full_token'),
  'a fulfillment change invalidates the reviewed context'
);
insert into public.offer_fulfillment_modes (offer_id, mode)
values ('10000000-0000-0000-0000-000000000022', 'pickup');

select set_config(
  'test.offer22_stale_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  true
);
select set_config(
  'test.offer27_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000027'
  ),
  true
);

update public.seller_presences
set whatsapp_e164 = '+50499992224', status = 'draft'
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set whatsapp_verification_status = 'verified', whatsapp_verified_at = now()
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set status = 'published'
where id = '10000000-0000-0000-0000-000000000011';

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
  format(
    'select public.prepare_request_batch(%L::jsonb)',
    jsonb_build_array(
      jsonb_build_object(
        'offer_id', '10000000-0000-0000-0000-000000000022',
        'request', jsonb_build_object('quantity', 1),
        'context', jsonb_build_object(
          'request_context_token',
          current_setting('test.offer22_stale_token')
        )
      ),
      jsonb_build_object(
        'offer_id', '10000000-0000-0000-0000-000000000027',
        'request', jsonb_build_object('scope', 'Tarjeta para cumpleaños'),
        'context', jsonb_build_object(
          'request_context_token', current_setting('test.offer27_token')
        )
      )
    )::text
  ),
  'P0001',
  'offer_context_changed',
  'one stale item rejects the complete multi-seller batch'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.request_batches
    where buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  0,
  'a rejected context leaves no partial batch behind'
);

select set_config(
  'test.offer22_fresh_token',
  public.offer_request_context_token(
    '10000000-0000-0000-0000-000000000022'
  ),
  true
);

set local role authenticated;

select is(
  jsonb_array_length(
    public.prepare_request_batch(
      jsonb_build_array(
        jsonb_build_object(
          'offer_id', '10000000-0000-0000-0000-000000000022',
          'request', jsonb_build_object('quantity', 1),
          'context', jsonb_build_object(
            'request_context_token',
            current_setting('test.offer22_fresh_token')
          )
        ),
        jsonb_build_object(
          'offer_id', '10000000-0000-0000-0000-000000000027',
          'request', jsonb_build_object('scope', 'Tarjeta para cumpleaños'),
          'context', jsonb_build_object(
            'request_context_token', current_setting('test.offer27_token')
          )
        )
      )
    ) -> 'requests'
  ),
  2,
  'fresh reviewed contexts prepare every seller request atomically'
);

reset role;

select is(
  (
    select r.destination_e164
    from public.seller_requests r
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
      and r.presence_id = '10000000-0000-0000-0000-000000000011'
  ),
  '+50499992224',
  'the handoff stores the destination from the reviewed locked context'
);

update public.seller_presences
set
  name = 'Nombre posterior',
  slug = 'nombre-posterior',
  whatsapp_e164 = '+50499992225',
  status = 'draft'
where id = '10000000-0000-0000-0000-000000000011';
update public.seller_presences
set service_territory = 'Territorio posterior'
where id = '10000000-0000-0000-0000-000000000012';
update public.offers
set price_cents = 9900
where id = '10000000-0000-0000-0000-000000000022';

select ok(
  (
    select r.presence_name_snapshot = 'La Canasta Móvil'
      and r.presence_slug_snapshot = 'la-canasta-virtual'
      and r.destination_e164 = '+50499992224'
    from public.seller_requests r
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
      and r.presence_id = '10000000-0000-0000-0000-000000000011'
  ),
  'later presence edits do not rewrite the handoff snapshot'
);

select ok(
  (
    select bool_and(
      case i.offer_id
        when '10000000-0000-0000-0000-000000000022' then
          i.price_cents_snapshot = 3200
        when '10000000-0000-0000-0000-000000000027' then
          i.service_territory_snapshot =
            'Siguatepeque y atención digital en Honduras'
        else false
      end
    )
    from public.request_items i
    join public.seller_requests r on r.id = i.seller_request_id
    join public.request_batches b on b.id = r.batch_id
    where b.buyer_id = '10000000-0000-0000-0000-000000000001'
  ),
  'later offer and territory edits do not rewrite item snapshots'
);

select * from finish();
rollback;
