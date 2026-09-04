-- Per-organization security controls. Writes remain service-role only so
-- authorization always runs through the server API, never browser-side RLS.
create table if not exists public.organization_security_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  require_mfa_for_critical_actions boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.organization_security_policies enable row level security;

drop policy if exists "Corporate managers can read security policies" on public.organization_security_policies;
create policy "Corporate managers can read security policies"
on public.organization_security_policies
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members member
    where member.organization_id = organization_security_policies.organization_id
      and member.user_id = auth.uid()
      and member.status = 'ACTIVE'
      and member.role in ('OWNER', 'ADMIN', 'HR')
  )
);

revoke all on public.organization_security_policies from anon, authenticated, public;
grant select on public.organization_security_policies to authenticated;
grant all on public.organization_security_policies to service_role;
