create table public.seller_maintenance_events (
  id bigint generated always as identity primary key,
  action_kind text not null check (action_kind in ('create', 'update')),
  offer_class public.offer_class not null,
  duration_seconds integer check (
    duration_seconds is null or duration_seconds between 0 and 7200
  ),
  created_at timestamptz not null default now()
);

comment on table public.seller_maintenance_events is
  'Anonymous duration samples for seller offer maintenance. Stores no seller, offer, text, contact, or location identifier.';

alter table public.seller_maintenance_events enable row level security;
revoke all on table public.seller_maintenance_events from anon, authenticated;

create function public.upsert_offer_maintained(
  p_presence_id uuid,
  p_offer_class public.offer_class,
  p_title text,
  p_description text,
  p_price_cents integer,
  p_price_mode public.price_mode,
  p_unit text,
  p_availability_model public.availability_model,
  p_availability_state public.availability_state,
  p_availability_details jsonb,
  p_fulfillment_modes public.fulfillment_mode[],
  p_status public.offer_status,
  p_id uuid default null,
  p_confirm boolean default false,
  p_duration_seconds integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_action text := case when p_id is null then 'create' else 'update' end;
  v_duration integer := case
    when p_duration_seconds between 0 and 7200 then p_duration_seconds
    else null
  end;
begin
  v_id := public.upsert_offer(
    p_presence_id,
    p_offer_class,
    p_title,
    p_description,
    p_price_cents,
    p_price_mode,
    p_unit,
    p_availability_model,
    p_availability_state,
    p_availability_details,
    p_fulfillment_modes,
    p_status,
    p_id,
    p_confirm
  );

  insert into public.seller_maintenance_events (
    action_kind,
    offer_class,
    duration_seconds
  ) values (
    v_action,
    p_offer_class,
    v_duration
  );

  return v_id;
end;
$$;

revoke all on function public.upsert_offer_maintained(
  uuid, public.offer_class, text, text, integer, public.price_mode, text,
  public.availability_model, public.availability_state, jsonb,
  public.fulfillment_mode[], public.offer_status, uuid, boolean, integer
) from public;

grant execute on function public.upsert_offer_maintained(
  uuid, public.offer_class, text, text, integer, public.price_mode, text,
  public.availability_model, public.availability_state, jsonb,
  public.fulfillment_mode[], public.offer_status, uuid, boolean, integer
) to authenticated;
