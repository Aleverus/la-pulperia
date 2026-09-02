-- WhatsApp does not provide the app a callback for a wa.me handoff. Let the
-- authenticated owner explicitly attest that the saved destination received
-- the test message, without granting direct table updates or cross-owner access.

create function public.confirm_owned_whatsapp(p_presence_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  update public.seller_presences
  set
    whatsapp_verification_status = 'verified',
    whatsapp_verified_at = now()
  where id = p_presence_id
    and owner_id = (select auth.uid())
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;

revoke all on function public.confirm_owned_whatsapp(uuid) from public;
grant execute on function public.confirm_owned_whatsapp(uuid) to authenticated;
