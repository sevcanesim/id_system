-- P2 #22 — Give corporate member activity its own timestamp.
-- created_at answers "when was the member created?"; the overview activity feed
-- needs "when did this membership last change?". Keeping these concerns separate
-- prevents demo data with identical creation timestamps from producing a fake
-- activity feed.

alter table public.organization_members
  add column if not exists last_activity_at timestamptz;

update public.organization_members
set last_activity_at = coalesce(last_activity_at, created_at)
where last_activity_at is null;

alter table public.organization_members
  alter column last_activity_at set default now();

alter table public.organization_members
  alter column last_activity_at set not null;

create index if not exists organization_members_org_activity_idx
  on public.organization_members(organization_id, last_activity_at desc);
