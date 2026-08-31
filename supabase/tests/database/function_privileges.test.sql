begin;
select plan(8);

select is(
  (
    select string_agg(p.proname, ',' order by p.proname)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')
  ),
  'offer_request_context_token,record_public_event,search_offers',
  'anonymous role can execute only the three audited public SECURITY DEFINER RPCs'
);

select ok(
  not has_function_privilege(
    'anon', 'public.prepare_request_batch(jsonb)', 'execute'
  ),
  'anonymous role cannot prepare private request batches'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.prepare_request_batch(jsonb)', 'execute'
  ),
  'authenticated role can prepare its request batch'
);

select ok(
  not has_function_privilege(
    'anon', 'public.upsert_seller_presence(text,text,public.presence_mode,text,text,text,double precision,double precision,boolean,public.presence_status,uuid)', 'execute'
  ),
  'anonymous role cannot mutate seller presences'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.upsert_seller_presence(text,text,public.presence_mode,text,text,text,double precision,double precision,boolean,public.presence_status,uuid)', 'execute'
  ),
  'authenticated role can reach the ownership-checked seller RPC'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.handle_new_user()', 'execute'
  ),
  'authenticated role cannot invoke the auth trigger directly'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.enforce_offer_publish_contract()', 'execute'
  ),
  'authenticated role cannot invoke integrity triggers directly'
);

select ok(
  has_function_privilege(
    'anon',
    'public.search_offers(text,double precision,double precision,integer,integer,public.offer_class,public.presence_mode,public.availability_state,text)',
    'execute'
  ),
  'anonymous discovery remains available'
);

select * from finish();
rollback;
