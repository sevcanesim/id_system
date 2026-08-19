-- Phase 24 / P0-04: make corporate card profiles explicitly organization-scoped.
-- Existing rows are repaired only where the relationship is unambiguous.

create index if not exists card_profiles_user_organization_idx
  on public.card_profiles(user_id, organization_id);

with mapped as (
  select cp.id as profile_id, om.organization_id
  from public.card_profiles cp
  join public.organization_members om
    on om.user_id = cp.user_id
   and om.status = 'ACTIVE'
   and lower(btrim(coalesce(om.full_name, ''))) = lower(btrim(coalesce(cp.name, '')))
   and lower(btrim(coalesce(cp.company, ''))) = lower(btrim((select o.name from public.organizations o where o.id = om.organization_id)))
  where cp.organization_id is null
  group by cp.id, om.organization_id
  having count(*) = 1
)
update public.card_profiles cp
set organization_id = mapped.organization_id
from mapped
where cp.id = mapped.profile_id
  and cp.organization_id is null;

comment on column public.card_profiles.organization_id is
  'Corporate card profiles are explicitly scoped to the owning organization; null is reserved for personal profiles.';
