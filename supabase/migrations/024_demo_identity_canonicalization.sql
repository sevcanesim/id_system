-- Phase 34 / P1-13: canonicalize the seeded Demo 5 corporate identity.
-- This is deliberately scoped to the deterministic demo fixture only.
-- Fresh databases apply this file before 20260815100000, which adds
-- card_profiles.organization_id. Skip until that column exists; the
-- demo seed recreates the fixture after migrations anyway.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'card_profiles'
      and column_name = 'organization_id'
  ) then
    update public.card_profiles cp
    set
      organization_id = o.id,
      slug = 'demo-5-tam-dolu',
      name = coalesce(nullif(om.full_name, ''), 'Demo 5 Tam Dolu'),
      company = o.name,
      email = om.email,
      updated_at = now()
    from public.organizations o
    join public.organization_members om
      on om.organization_id = o.id
    where o.slug = 'demo-sirket-5-tam'
      and om.email = 'demo.corp5.full@yenomi.test'
      and cp.user_id = om.user_id;
  end if;
end $$;
