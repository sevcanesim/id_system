-- v23.1.1: Public profiles use non-identifying, non-sequential identifiers.
-- Uses PostgreSQL's built-in gen_random_uuid() so the migration does not depend
-- on pgcrypto's gen_random_bytes() being exposed in public/search_path.

alter table public.card_profiles
  add column if not exists public_id text;

update public.card_profiles
set public_id = left(replace(gen_random_uuid()::text, '-', ''), 20)
where public_id is null or btrim(public_id) = '';

-- Normalize any previously generated base64 identifiers if this migration was
-- partially executed on another environment.
update public.card_profiles
set public_id = replace(replace(replace(public_id, '/', ''), '+', ''), '=', '')
where public_id is not null;

alter table public.card_profiles
  alter column public_id set default left(replace(gen_random_uuid()::text, '-', ''), 20);

alter table public.card_profiles
  alter column public_id set not null;

create unique index if not exists card_profiles_public_id_uidx
  on public.card_profiles(public_id);

comment on column public.card_profiles.public_id is
  'Non-identifying random public profile identifier used by /p/{public_id}. Never derive it from name, email or phone.';
