create extension if not exists pgcrypto;

create table if not exists public.card_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  role text not null,
  company text,
  phone text,
  whatsapp text,
  email text,
  website text,
  linkedin text,
  instagram text,
  location text,
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.card_profiles enable row level security;

-- Policies are dropped first so this migration can be run repeatedly.
drop policy if exists "Profiles are publicly readable when published"
on public.card_profiles;

create policy "Profiles are publicly readable when published"
on public.card_profiles
for select
using (
  is_published = true
  or auth.uid() = user_id
);

drop policy if exists "Users can insert their own profile"
on public.card_profiles;

create policy "Users can insert their own profile"
on public.card_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile"
on public.card_profiles;

create policy "Users can update their own profile"
on public.card_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own profile"
on public.card_profiles;

create policy "Users can delete their own profile"
on public.card_profiles
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists card_profiles_set_updated_at
on public.card_profiles;

create trigger card_profiles_set_updated_at
before update on public.card_profiles
for each row
execute function public.set_updated_at();

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile images are public"
on storage.objects;

create policy "Profile images are public"
on storage.objects
for select
using (bucket_id = 'profile-images');

drop policy if exists "Users upload profile images to own folder"
on storage.objects;

create policy "Users upload profile images to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own profile images"
on storage.objects;

create policy "Users update own profile images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own profile images"
on storage.objects;

create policy "Users delete own profile images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
