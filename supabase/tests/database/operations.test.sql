begin;
select plan(20);

select ok(
  exists (
    select 1 from cron.job
    where jobname = 'pulperia-purge-expired-requests'
      and schedule = '15 3 * * *'
  ),
  'expired requests have a daily database job'
);

insert into public.search_events (query_normalized, result_count, event_kind)
values ('persona@example.com', 0, 'search');

select is(
  (select query_normalized from public.search_events order by id desc limit 1),
  '',
  'metric events discard query text and possible PII'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_query => 'zambos picantes')
  ),
  2,
  'a search with alternatives records a resolved result'
);

select is(
  (
    select count(*)::integer
    from public.search_offers(p_query => 'consulta privada inexistente')
  ),
  0,
  'a search without alternatives records an empty result'
);

select is(
  (
    select count(*)::integer
    from public.search_events
    where event_kind = 'search' and query_normalized <> ''
  ),
  0,
  'resolved and empty searches retain no query text'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000001"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$ select public.submit_report(
    '10000000-0000-0000-0000-000000000020',
    null,
    'outdated',
    'El precio publicado parece necesitar confirmación.'
  ) $$,
  'an authenticated neighbor can submit a private report'
);

select throws_ok(
  $$ select * from public.get_operator_reports() $$,
  '42501',
  'operator_required',
  'a normal account cannot read the report inbox'
);

select throws_ok(
  $$ select public.record_public_event('handoff_opened') $$,
  '22023',
  'public_event_invalid',
  'the public metrics endpoint accepts only public UI events'
);

reset role;

select is(
  (select count(*)::integer from public.public_context_notes
   where body like '%precio publicado parece%'),
  0,
  'raw report text is not public context'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000004"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
set local role authenticated;

select is(public.is_operator(), true, 'membership grants operator access');

select is(
  (select explanation from public.get_operator_reports()
   where explanation = 'El precio publicado parece necesitar confirmación.'),
  'El precio publicado parece necesitar confirmación.',
  'the operator inbox contains the private explanation'
);

select is(
  public.review_report(
    (select report_id from public.get_operator_reports()
     where explanation = 'El precio publicado parece necesitar confirmación.'),
    'publish_note',
    'Precio pendiente de nueva confirmación por el vendedor.'
  ),
  'noted'::public.report_status,
  'an operator can publish a neutral note'
);

select is(
  (select body from public.public_context_notes
   where body = 'Precio pendiente de nueva confirmación por el vendedor.'),
  'Precio pendiente de nueva confirmación por el vendedor.',
  'only the operator-authored neutral note becomes public'
);

reset role;

select is(
  (select count(*)::integer from public.operator_actions
   where action_kind = 'publish_note'),
  1,
  'report review creates an operator audit record'
);

select lives_ok(
  $$ select public.record_public_event('offer_open') $$,
  'allowed public events can be recorded without identity'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000004"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
set local role authenticated;

select is(
  (public.get_metrics_summary()->'events'->>'offer_open')::integer,
  1,
  'operator metrics expose aggregate event counts'
);

select is(
  jsonb_build_array(
    (public.get_metrics_summary()->>'useful_searches')::integer,
    (public.get_metrics_summary()->>'empty_searches')::integer
  ),
  '[1, 2]'::jsonb,
  'operator metrics separate resolved and empty searches without PII'
);

reset role;

insert into public.request_batches (id, buyer_id, expires_at)
values (
  '10000000-0000-0000-0000-000000000099',
  '10000000-0000-0000-0000-000000000001',
  now() - interval '1 day'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000004"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
set local role authenticated;

select is(
  public.purge_expired_requests(),
  1::bigint,
  'an operator can demonstrate the expired-request purge'
);

reset role;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000090',
  'authenticated',
  'authenticated',
  'borrame@local.test',
  extensions.crypt('pulperia-local', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Cuenta descartable"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000090"}',
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000090', true);
set local role authenticated;

select is(
  (
    with prepared as materialized (
      select public.begin_account_deletion()
    )
    select public.delete_my_account() from prepared
  ),
  true,
  'a prepared user can delete their own account'
);

reset role;

select is(
  (select count(*)::integer from auth.users
   where id = '10000000-0000-0000-0000-000000000090'),
  0,
  'account deletion removes the auth identity'
);

select * from finish();
rollback;
