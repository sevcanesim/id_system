-- Company-facing audit trail for sensitive corporate-panel operations.
-- The platform-level admin_audit_log remains separate: this table is tenant
-- scoped and can be safely shown to authorized company managers.

create table if not exists public.organization_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('OWNER', 'ADMIN', 'HR', 'SYSTEM')),
  action text not null check (char_length(action) between 3 and 80),
  subject_type text not null check (char_length(subject_type) between 3 and 80),
  subject_id text,
  summary text not null check (char_length(summary) between 3 and 240),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists organization_audit_events_org_occurred_idx
  on public.organization_audit_events (organization_id, occurred_at desc);

create index if not exists organization_audit_events_actor_idx
  on public.organization_audit_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

alter table public.organization_audit_events enable row level security;

-- Only active corporate managers may read their own organization trail. The
-- table is never writable through PostgREST; server routes use service_role.
drop policy if exists "Corporate managers can read organization audit events" on public.organization_audit_events;
create policy "Corporate managers can read organization audit events"
on public.organization_audit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members member
    where member.organization_id = organization_audit_events.organization_id
      and member.user_id = auth.uid()
      and member.status = 'ACTIVE'
      and member.role in ('OWNER', 'ADMIN', 'HR')
  )
);

revoke all on public.organization_audit_events from anon, authenticated, public;
grant select on public.organization_audit_events to authenticated;
grant all on public.organization_audit_events to service_role;

-- An audit record may be appended but can never be revised or deleted. This
-- remains true even for service-role SQL so the trail is evidentially useful.
create or replace function public.reject_organization_audit_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'organization_audit_events kayıtları değiştirilemez';
end;
$$;

drop trigger if exists organization_audit_events_immutable on public.organization_audit_events;
create trigger organization_audit_events_immutable
before update or delete on public.organization_audit_events
for each row execute function public.reject_organization_audit_event_mutation();
