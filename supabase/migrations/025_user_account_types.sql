alter table public.user_accounts
  add column if not exists account_type text not null default 'INDIVIDUAL';

alter table public.user_accounts drop constraint if exists user_accounts_account_type_check;
alter table public.user_accounts add constraint user_accounts_account_type_check
  check (account_type in ('TEST', 'INDIVIDUAL', 'CORPORATE'));

create index if not exists user_accounts_account_type_idx on public.user_accounts(account_type);

update public.user_accounts set account_type = 'TEST', updated_at = now()
where lower(email) like '%@yenomi.test';

update public.user_accounts ua set account_type = 'CORPORATE', updated_at = now()
where ua.account_type <> 'TEST' and exists (
  select 1 from public.organization_members om
  where om.user_id = ua.id and om.status = 'ACTIVE'
);

create or replace function public.sync_organization_member_account_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and new.status = 'ACTIVE' then
    update public.user_accounts set account_type = 'CORPORATE', updated_at = now()
    where id = new.user_id and account_type <> 'TEST';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_member_account_type_sync on public.organization_members;
create trigger organization_member_account_type_sync
after insert or update of user_id, status on public.organization_members
for each row execute function public.sync_organization_member_account_type();

revoke all on function public.sync_organization_member_account_type() from public;
grant execute on function public.sync_organization_member_account_type() to service_role;
