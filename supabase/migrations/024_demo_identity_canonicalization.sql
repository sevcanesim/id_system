-- Phase 34 / P1-13: canonicalize the seeded Demo 5 corporate identity.
-- This is deliberately scoped to the deterministic demo fixture only.
UPDATE public.card_profiles cp
SET
  organization_id = o.id,
  slug = 'demo-5-tam-dolu',
  name = COALESCE(NULLIF(om.full_name, ''), 'Demo 5 Tam Dolu'),
  company = o.name,
  email = om.email,
  updated_at = now()
FROM public.organizations o
JOIN public.organization_members om
  ON om.organization_id = o.id
WHERE o.slug = 'demo-sirket-5-tam'
  AND om.email = 'demo.corp5.full@yenomi.test'
  AND cp.user_id = om.user_id;
