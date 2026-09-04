-- Every account receives one permanent, human-readable Yenomi ID. It is an
-- account identifier (not a public card URL) and is readable only through the
-- existing "Users can read own account" RLS policy.

create sequence if not exists public.user_account_yenomi_id_seq;

create or replace function public.allocate_user_yenomi_id()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return 'YEN-IND-' || lpad(nextval('public.user_account_yenomi_id_seq')::text, 8, '0');
end;
$$;

alter table public.user_accounts
  add column if not exists yenomi_id text;

update public.user_accounts
set yenomi_id = public.allocate_user_yenomi_id()
where yenomi_id is null or btrim(yenomi_id) = '';

alter table public.user_accounts
  alter column yenomi_id set default public.allocate_user_yenomi_id(),
  alter column yenomi_id set not null;

create unique index if not exists user_accounts_yenomi_id_uidx
  on public.user_accounts(yenomi_id);

create or replace function public.prevent_user_account_yenomi_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.yenomi_id is distinct from new.yenomi_id then
    raise exception using
      errcode = '42501',
      message = 'Yenomi ID değiştirilemez.';
  end if;
  return new;
end;
$$;

drop trigger if exists user_accounts_yenomi_id_immutable on public.user_accounts;
create trigger user_accounts_yenomi_id_immutable
  before update on public.user_accounts
  for each row
  execute function public.prevent_user_account_yenomi_id_change();

revoke all on function public.allocate_user_yenomi_id() from public, anon, authenticated;
grant execute on function public.allocate_user_yenomi_id() to service_role;

comment on column public.user_accounts.yenomi_id is
  'Permanent, private account identifier. Users may read only their own value via RLS.';
