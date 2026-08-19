alter table public.user_accounts
  add column if not exists test_login_scope text;

update public.user_accounts
set test_login_scope = case
  when lower(email) = 'demo.superadmin@yenomi.test' then 'BOTH'
  when lower(email) in ('demo.card.pending@yenomi.test', 'demo.card.complete@yenomi.test') then 'INDIVIDUAL'
  when lower(email) like 'demo.corp%@yenomi.test' then 'CORPORATE'
  else 'INDIVIDUAL'
end,
updated_at = now()
where account_type = 'TEST';

alter table public.user_accounts drop constraint if exists user_accounts_test_login_scope_check;
alter table public.user_accounts add constraint user_accounts_test_login_scope_check
  check (
    (account_type = 'TEST' and test_login_scope in ('BOTH', 'INDIVIDUAL', 'CORPORATE'))
    or (account_type <> 'TEST' and test_login_scope is null)
  );
