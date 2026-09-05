-- Public-card privacy model
--
-- `id` remains the internal UUID. `public_id` is the one immutable address
-- written to NFC cards and QR codes. Existing public ids are intentionally
-- left untouched: replacing one would break a card already in the field.

create extension if not exists pgcrypto;

-- A human-readable address is an optional alias, never a requirement for a
-- public profile. PostgreSQL unique constraints allow multiple NULL values,
-- which is exactly what we need for profiles without an alias.
alter table public.card_profiles
  alter column slug drop not null;

-- Search visibility is opt-in. Public cards still work when this is false;
-- they simply instruct crawlers not to index the profile.
alter table public.card_profiles
  add column if not exists search_indexing_enabled boolean not null default false;

-- 9 random bytes become exactly 12 base64 characters. The two base64
-- punctuation characters are mapped into the alphanumeric alphabet so every
-- new value is compact and URL-safe for `/p/{public_id}`. This has 72 bits of
-- entropy and is not derived from identity data.
create or replace function public.generate_profile_public_id()
returns text
language sql
volatile
as $$
  select replace(replace(encode(gen_random_bytes(9), 'base64'), '+', 'A'), '/', 'a');
$$;

alter table public.card_profiles
  alter column public_id set default public.generate_profile_public_id();

-- A physical card may remain in the field for years, so an address once
-- assigned must never be replaced during an ordinary profile edit. Aliases
-- remain mutable and redirect separately; this guard protects the NFC/QR
-- destination itself, including writes that bypass the application layer.
create or replace function public.prevent_card_profile_public_id_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.public_id is distinct from old.public_id then
    raise exception 'card_profiles.public_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists card_profiles_public_id_immutable on public.card_profiles;
create trigger card_profiles_public_id_immutable
before update of public_id on public.card_profiles
for each row execute function public.prevent_card_profile_public_id_change();

comment on column public.card_profiles.public_id is
  'Immutable, opaque public card identifier used by NFC, QR and /p/{public_id}. Never derive it from name, email, phone or UUID.';

comment on column public.card_profiles.slug is
  'Optional custom vanity alias. It redirects to /p/{public_id} and is never the NFC or QR target.';

comment on column public.card_profiles.search_indexing_enabled is
  'Explicit owner opt-in for search-engine indexing. Defaults to false (noindex,nofollow).';

-- The public RPC is the only profile read exposed to unauthenticated callers.
-- Recreate its row type to include the visibility preference used by Next.js
-- metadata, while retaining slug lookup solely for optional aliases and
-- legacy redirect compatibility.
drop function if exists public.get_public_card_profile(text,text);

create function public.get_public_card_profile(
  p_slug text default null,
  p_public_id text default null
) returns table(
  id uuid, slug text, public_id text, name text, role text, company text,
  phone text, whatsapp text, email text, website text, linkedin text,
  instagram text, location text, image_url text, bio text, is_published boolean,
  card_status text, service_started_at timestamptz,
  service_expires_at timestamptz, grace_ends_at timestamptz,
  search_indexing_enabled boolean
)
language sql stable security definer set search_path=public,pg_temp
as $$
  select cp.id,cp.slug,cp.public_id,cp.name,cp.role,cp.company,
         cp.phone,cp.whatsapp,cp.email,cp.website,cp.linkedin,
         cp.instagram,cp.location,cp.image_url,cp.bio,cp.is_published,
         cp.card_status,cp.service_started_at,cp.service_expires_at,cp.grace_ends_at,
         coalesce(cp.search_indexing_enabled,false)
  from public.card_profiles cp
  where cp.is_published=true
    and ((p_public_id is not null and cp.public_id=p_public_id)
      or (p_public_id is null and p_slug is not null and cp.slug=p_slug))
  limit 1;
$$;

revoke all on function public.get_public_card_profile(text,text) from public;
grant execute on function public.get_public_card_profile(text,text) to anon,authenticated,service_role;
