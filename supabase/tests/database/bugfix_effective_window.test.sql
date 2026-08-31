begin;
select plan(10);

select ok(
  public.offer_effectively_available(
    'scheduled_food', 'available',
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00","cutoff_at":"2030-01-10T12:00:00-06:00"}'::jsonb,
    '2030-01-10T11:59:59-06:00'::timestamptz
  ),
  'a scheduled offer is open immediately before cutoff'
);

select is(
  public.offer_effectively_available(
    'scheduled_food', 'available',
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00","cutoff_at":"2030-01-10T12:00:00-06:00"}'::jsonb,
    '2030-01-10T12:00:00-06:00'::timestamptz
  ),
  false,
  'cutoff equality closes the offer'
);

select is(
  public.offer_effectively_available(
    'scheduled_food', 'available',
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00"}'::jsonb,
    '2030-01-10T17:00:00-06:00'::timestamptz
  ),
  false,
  'window-end equality closes the offer'
);

select ok(
  public.valid_requested_window(
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00","cutoff_at":"2030-01-10T12:00:00-06:00"}'::jsonb,
    '{"requested_window_start":"2030-01-10T15:00:00-06:00","requested_window_end":"2030-01-10T16:00:00-06:00"}'::jsonb,
    '2030-01-10T11:00:00-06:00'::timestamptz
  ),
  'a real subwindow is valid before cutoff'
);

select is(
  public.valid_requested_window(
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00"}'::jsonb,
    '{"requested_window_start":"2030-01-10T13:00:00-06:00","requested_window_end":"2030-01-10T16:00:00-06:00"}'::jsonb,
    '2030-01-10T11:00:00-06:00'::timestamptz
  ), false,
  'a requested start before the published window is rejected'
);

select is(
  public.valid_requested_window(
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00"}'::jsonb,
    '{"requested_window_start":"2030-01-10T15:00:00-06:00","requested_window_end":"2030-01-10T18:00:00-06:00"}'::jsonb,
    '2030-01-10T11:00:00-06:00'::timestamptz
  ), false,
  'a requested end after the published window is rejected'
);

select is(
  public.valid_requested_window(
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00"}'::jsonb,
    '{"requested_window_start":"2030-01-10T16:00:00-06:00","requested_window_end":"2030-01-10T15:00:00-06:00"}'::jsonb,
    '2030-01-10T11:00:00-06:00'::timestamptz
  ), false,
  'a reversed requested window is rejected'
);

select is(
  public.valid_requested_window(
    '{"starts_at":"2030-01-10T14:00:00-06:00","ends_at":"2030-01-10T17:00:00-06:00","cutoff_at":"2030-01-10T12:00:00-06:00"}'::jsonb,
    '{"requested_window_start":"2030-01-10T15:00:00-06:00","requested_window_end":"2030-01-10T16:00:00-06:00"}'::jsonb,
    '2030-01-10T12:00:00-06:00'::timestamptz
  ), false,
  'a valid-looking subwindow is rejected at exact cutoff'
);

update public.offers
set availability_details = jsonb_build_object(
  'starts_at', now() - interval '2 hours',
  'ends_at', now() + interval '2 hours',
  'cutoff_at', now() - interval '1 second'
)
where id = '10000000-0000-0000-0000-000000000025';

select is(
  (
    select count(*)::integer
    from public.search_offers(p_offer_class => 'scheduled_food')
  ),
  0,
  'discovery excludes a window whose cutoff passed'
);

select is(
  (
    select count(*)::integer
    from public.catalog_offers
    where id = '10000000-0000-0000-0000-000000000025'
  ),
  1,
  'the closed offer remains visible on its profile for honest history'
);

select * from finish();
rollback;
