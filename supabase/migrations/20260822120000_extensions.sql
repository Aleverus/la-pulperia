-- Search, geography, and case-insensitive slugs. pgTAP is installed only in tests.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.immutable_unaccent(input text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent(input);
$$;

-- Approximate operating box for Siguatepeque. Not a cadastral boundary.
create or replace function public.within_siguatepeque(loc extensions.geography)
returns boolean
language sql
immutable
parallel safe
as $$
  select loc is not null
    and extensions.ST_Covers(
      extensions.ST_MakeEnvelope(-87.95, 14.50, -87.70, 14.72, 4326)::extensions.geography,
      loc
    );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
