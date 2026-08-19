-- v23.6: application-visible user directory synchronized from Supabase Auth.

create table if not exists public.user_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  auth_provider text,
  status text not null default 'ACTIVE' check(status in('ACTIVE','SUSPENDED','DELETED')),
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_accounts_email_ci_uidx
on public.user_accounts(lower(email));

alter table public.user_accounts enable row level security;
drop policy if exists "Users can read own account" on public.user_accounts;
create policy "Users can read own account" on public.user_accounts
for select to authenticated using(auth.uid()=id);
-- Mutations stay server-side so a client cannot change email/provider/status.
drop policy if exists "Users can update own account profile" on public.user_accounts;

create or replace function public.sync_auth_user_account()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.user_accounts(
    id,email,display_name,avatar_url,auth_provider,email_confirmed_at,last_sign_in_at,created_at,updated_at
  ) values(
    new.id,
    lower(coalesce(new.email,'')),
    nullif(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),''),
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture'),''),
    coalesce(new.raw_app_meta_data->>'provider','email'),
    new.email_confirmed_at,
    new.last_sign_in_at,
    coalesce(new.created_at,now()),
    now()
  )
  on conflict(id) do update set
    email=excluded.email,
    display_name=coalesce(excluded.display_name,public.user_accounts.display_name),
    avatar_url=coalesce(excluded.avatar_url,public.user_accounts.avatar_url),
    auth_provider=excluded.auth_provider,
    email_confirmed_at=excluded.email_confirmed_at,
    last_sign_in_at=excluded.last_sign_in_at,
    updated_at=now();
  return new;
end; $$;

drop trigger if exists auth_users_sync_public_account on auth.users;
create trigger auth_users_sync_public_account
after insert or update of email,email_confirmed_at,last_sign_in_at,raw_user_meta_data,raw_app_meta_data
on auth.users for each row execute function public.sync_auth_user_account();

insert into public.user_accounts(
  id,email,display_name,avatar_url,auth_provider,email_confirmed_at,last_sign_in_at,created_at,updated_at
)
select u.id,lower(coalesce(u.email,'')),
  nullif(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name'),''),
  nullif(coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture'),''),
  coalesce(u.raw_app_meta_data->>'provider','email'),u.email_confirmed_at,u.last_sign_in_at,u.created_at,now()
from auth.users u where coalesce(u.email,'')<>''
on conflict(id) do update set email=excluded.email,email_confirmed_at=excluded.email_confirmed_at,
  last_sign_in_at=excluded.last_sign_in_at,updated_at=now();
