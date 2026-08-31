-- PostgreSQL classifies text-to-timestamptz parsing as STABLE because session
-- settings can affect generic inputs. These functions first require an
-- explicit RFC 3339 offset, but declaring the conservative database contract
-- avoids promising the optimizer more than the underlying cast guarantees.

alter function public.is_rfc3339(text) stable;

alter function public.valid_offer_contract(
  public.offer_class,
  public.price_mode,
  integer,
  public.availability_model,
  public.availability_state,
  jsonb
) stable;

alter function public.valid_request_payload(public.offer_class, jsonb) stable;

alter function public.offer_effectively_available(
  public.offer_class,
  public.availability_state,
  jsonb,
  timestamptz
) stable;

alter function public.valid_requested_window(jsonb, jsonb, timestamptz) stable;
