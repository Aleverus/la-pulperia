-- Corte 4: private reports, explicit operators, aggregate metrics and retention.

alter table public.reports
  drop constraint report_has_target,
  add constraint report_has_one_target
    check (num_nonnulls(offer_id, presence_id) = 1);

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.operator_members m
      where m.user_id = auth.uid()
    );
$$;

create or replace function public.submit_report(
  p_offer_id uuid default null,
  p_presence_id uuid default null,
  p_category text default null,
  p_explanation text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  category_clean text := lower(btrim(coalesce(p_category, '')));
  explanation_clean text := btrim(coalesce(p_explanation, ''));
  report_id uuid;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if num_nonnulls(p_offer_id, p_presence_id) <> 1 then
    raise exception 'report_target_invalid' using errcode = '22023';
  end if;
  if category_clean not in ('outdated', 'misleading', 'abuse', 'other') then
    raise exception 'report_category_invalid' using errcode = '22023';
  end if;
  if char_length(explanation_clean) < 10 or char_length(explanation_clean) > 2000 then
    raise exception 'report_explanation_invalid' using errcode = '22023';
  end if;
  if p_offer_id is not null and not exists (
    select 1
    from public.offers o
    join public.seller_presences p on p.id = o.presence_id
    where o.id = p_offer_id
      and o.status = 'published'
      and p.status = 'published'
  ) then
    raise exception 'report_target_not_public' using errcode = 'P0001';
  end if;
  if p_presence_id is not null and not exists (
    select 1
    from public.seller_presences p
    where p.id = p_presence_id and p.status = 'published'
  ) then
    raise exception 'report_target_not_public' using errcode = 'P0001';
  end if;

  insert into public.reports (
    author_id, offer_id, presence_id, category, explanation
  ) values (
    uid, p_offer_id, p_presence_id, category_clean, explanation_clean
  )
  returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.get_operator_reports()
returns table (
  report_id uuid,
  report_status public.report_status,
  category text,
  explanation text,
  created_at timestamptz,
  target_kind text,
  target_id uuid,
  target_name text,
  target_slug text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_operator() then
    raise exception 'operator_required' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.status,
    r.category,
    r.explanation,
    r.created_at,
    case when r.offer_id is not null then 'offer' else 'presence' end,
    coalesce(r.offer_id, r.presence_id),
    coalesce(o.title, p.name),
    coalesce(o.slug::text, p.slug::text)
  from public.reports r
  left join public.offers o on o.id = r.offer_id
  left join public.seller_presences p on p.id = r.presence_id
  order by
    case when r.status = 'open' then 0 else 1 end,
    r.created_at desc;
end;
$$;

create or replace function public.review_report(
  p_report_id uuid,
  p_action text,
  p_public_note text default null
)
returns public.report_status
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  action_clean text := lower(btrim(coalesce(p_action, '')));
  note_clean text := btrim(coalesce(p_public_note, ''));
  current_report public.reports%rowtype;
  new_status public.report_status;
begin
  if not public.is_operator() then
    raise exception 'operator_required' using errcode = '42501';
  end if;

  select * into current_report
  from public.reports
  where id = p_report_id
  for update;

  if current_report.id is null then
    raise exception 'report_not_found' using errcode = 'P0001';
  end if;
  if current_report.status <> 'open' then
    raise exception 'report_already_reviewed' using errcode = 'P0001';
  end if;

  case action_clean
    when 'dismiss' then
      new_status := 'dismissed';
    when 'publish_note' then
      if char_length(note_clean) < 8 or char_length(note_clean) > 500 then
        raise exception 'public_note_invalid' using errcode = '22023';
      end if;
      insert into public.public_context_notes (
        offer_id, presence_id, body, published_by
      ) values (
        current_report.offer_id,
        current_report.presence_id,
        note_clean,
        uid
      );
      new_status := 'noted';
    when 'remove_content' then
      if current_report.offer_id is not null then
        update public.offers
        set status = 'archived'
        where id = current_report.offer_id;
      else
        update public.seller_presences
        set status = 'archived'
        where id = current_report.presence_id;
      end if;
      new_status := 'content_removed';
    else
      raise exception 'report_action_invalid' using errcode = '22023';
  end case;

  update public.reports
  set status = new_status
  where id = current_report.id;

  insert into public.operator_actions (
    operator_id, action_kind, report_id, note
  ) values (
    uid, action_clean, current_report.id,
    case when action_clean = 'publish_note' then note_clean else null end
  );

  return new_status;
end;
$$;

create or replace function public.scrub_search_event()
returns trigger
language plpgsql
as $$
begin
  -- Metrics need the outcome, never the query, UUID, account or destination.
  new.query_normalized := '';
  return new;
end;
$$;

update public.search_events set query_normalized = '' where query_normalized <> '';

create trigger scrub_search_event_trg
  before insert or update of query_normalized, event_kind
  on public.search_events
  for each row
  execute function public.scrub_search_event();

create or replace function public.record_public_event(p_event_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_kind not in ('offer_open', 'cart_add') then
    raise exception 'public_event_invalid' using errcode = '22023';
  end if;
  insert into public.search_events (query_normalized, result_count, event_kind)
  values ('', 1, p_event_kind);
end;
$$;

create or replace function public.get_metrics_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_operator() then
    raise exception 'operator_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'events', jsonb_build_object(
      'search', count(*) filter (where event_kind = 'search'),
      'offer_open', count(*) filter (where event_kind = 'offer_open'),
      'cart_add', count(*) filter (where event_kind = 'cart_add'),
      'request_prepared', count(*) filter (where event_kind = 'request_prepared'),
      'handoff_opened', count(*) filter (where event_kind = 'handoff_opened'),
      'seller_update', count(*) filter (where event_kind = 'seller_update')
    ),
    'useful_searches', count(*) filter (
      where event_kind = 'search' and result_count > 0
    ),
    'empty_searches', count(*) filter (
      where event_kind = 'search' and result_count = 0
    ),
    'published_presences', (
      select jsonb_build_object(
        'physical', count(*) filter (where kind = 'physical'),
        'virtual', count(*) filter (where kind = 'virtual')
      )
      from public.seller_presences
      where status = 'published'
    )
  ) into result
  from public.search_events;

  return result;
end;
$$;

create or replace function public.purge_expired_requests()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if auth.uid() is not null and not public.is_operator() then
    raise exception 'operator_required' using errcode = '42501';
  end if;

  delete from public.request_batches
  where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  -- Requests retain seller references, so remove batches touching this seller
  -- before deleting the commercial surface. Buyer-owned batches are removed too.
  delete from public.request_batches b
  where b.buyer_id = uid
    or exists (
      select 1
      from public.seller_requests r
      join public.seller_presences p on p.id = r.presence_id
      where r.batch_id = b.id and p.owner_id = uid
    );

  update public.operator_actions a
  set report_id = null
  where a.report_id in (
    select r.id from public.reports r where r.author_id = uid
  );
  delete from public.operator_actions where operator_id = uid;
  delete from public.public_context_notes where published_by = uid;
  update public.operator_members set granted_by = null where granted_by = uid;
  delete from public.operator_members where user_id = uid;
  delete from public.seller_presences where owner_id = uid;
  delete from auth.users where id = uid;

  return found;
end;
$$;

revoke all on function public.is_operator() from public;
revoke all on function public.submit_report(uuid, uuid, text, text) from public;
revoke all on function public.get_operator_reports() from public;
revoke all on function public.review_report(uuid, text, text) from public;
revoke all on function public.record_public_event(text) from public;
revoke all on function public.get_metrics_summary() from public;
revoke all on function public.purge_expired_requests() from public;
revoke all on function public.delete_my_account() from public;

grant execute on function public.is_operator() to authenticated;
grant execute on function public.submit_report(uuid, uuid, text, text) to authenticated;
grant execute on function public.get_operator_reports() to authenticated;
grant execute on function public.review_report(uuid, text, text) to authenticated;
grant execute on function public.record_public_event(text) to anon, authenticated;
grant execute on function public.get_metrics_summary() to authenticated;
grant execute on function public.purge_expired_requests() to authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'pulperia-purge-expired-requests',
  '15 3 * * *',
  'select public.purge_expired_requests();'
);
