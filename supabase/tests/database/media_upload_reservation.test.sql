begin;
select plan(9);

insert into public.offer_media (
  id, offer_id, storage_path, alt_text, sort_order
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000002/offer/existing-0.webp',
    '',
    0
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000002/offer/existing-2.webp',
    '',
    2
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

select set_config(
  'test.media_reservation',
  public.reserve_offer_media_upload(
    '10000000-0000-0000-0000-000000000020'
  )::text,
  true
);

select is(
  (current_setting('test.media_reservation')::jsonb->>'sort_order')::integer,
  1,
  'reservation fills the first free slot instead of using row count'
);

select ok(
  (current_setting('test.media_reservation')::jsonb->>'storage_path') like
    '10000000-0000-0000-0000-000000000002/10000000-0000-0000-0000-000000000020/%.webp',
  'reservation allocates a unique owner and offer scoped object path'
);

select is(
  (
    select deletion_pending
    from public.offer_media
    where id = (
      current_setting('test.media_reservation')::jsonb->>'media_id'
    )::uuid
  ),
  true,
  'reserved metadata stays out of the catalog until Storage exists'
);

select throws_ok(
  format(
    'select public.complete_offer_media_upload(%L::uuid)',
    current_setting('test.media_reservation')::jsonb->>'media_id'
  ),
  'P0001',
  'storage_object_missing',
  'completion refuses to publish metadata before Storage upload'
);

select throws_ok(
  $$
    insert into public.offer_media (offer_id, storage_path, sort_order)
    values (
      '10000000-0000-0000-0000-000000000020',
      'direct-write.webp',
      3
    )
  $$,
  '42501',
  null,
  'authenticated callers cannot bypass upload reservation'
);

reset role;

insert into storage.objects (bucket_id, name)
values (
  'offer-media',
  current_setting('test.media_reservation')::jsonb->>'storage_path'
);

set local role authenticated;

select is(
  public.complete_offer_media_upload(
    (current_setting('test.media_reservation')::jsonb->>'media_id')::uuid
  ),
  true,
  'the owner completes metadata after Storage upload'
);

select is(
  (
    select deletion_pending
    from public.offer_media
    where id = (
      current_setting('test.media_reservation')::jsonb->>'media_id'
    )::uuid
  ),
  false,
  'completed media becomes catalog eligible'
);

select is(
  (
    public.reserve_offer_media_upload(
      '10000000-0000-0000-0000-000000000020'
    )->>'sort_order'
  )::integer,
  3,
  'the next reservation uses the remaining free slot'
);

select throws_ok(
  $$
    select public.reserve_offer_media_upload(
      '10000000-0000-0000-0000-000000000020'
    )
  $$,
  'P0001',
  'offer_media_limit',
  'a fifth reservation is rejected without overwriting an existing object'
);

select * from finish();
rollback;
