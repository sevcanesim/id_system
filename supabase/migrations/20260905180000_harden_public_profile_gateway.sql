-- Public profile PII must only leave the database through an active, live
-- card. The Next.js page has an unavailable state too, but that is too late:
-- unauthenticated callers can invoke this SECURITY DEFINER RPC directly.

drop function if exists public.get_public_card_profile(text,text);

create function public.get_public_card_profile(
  p_slug text default null,
  p_public_id text default null
) returns table(
  id uuid, slug text, public_id text, name text, role text, company text,
  phone text, whatsapp text, email text, website text, linkedin text,
  instagram text, location text, image_url text, bio text, is_published boolean,
  card_status text, service_started_at timestamptz,
  service_expires_at timestamptz, grace_ends_at timestamptz,
  search_indexing_enabled boolean
)
language sql stable security definer set search_path=public,pg_temp
as $$
  select cp.id,cp.slug,cp.public_id,cp.name,cp.role,cp.company,
         cp.phone,cp.whatsapp,cp.email,cp.website,cp.linkedin,
         cp.instagram,cp.location,cp.image_url,cp.bio,cp.is_published,
         cp.card_status,cp.service_started_at,cp.service_expires_at,cp.grace_ends_at,
         coalesce(cp.search_indexing_enabled,false)
  from public.card_profiles cp
  where cp.is_published = true
    and cp.card_status = 'ACTIVE'
    and (
      cp.service_expires_at is null
      or cp.service_expires_at > now()
      or cp.grace_ends_at > now()
    )
    and ((p_public_id is not null and cp.public_id = p_public_id)
      or (p_public_id is null and p_slug is not null and cp.slug = p_slug))
  limit 1;
$$;

revoke all on function public.get_public_card_profile(text,text) from public;
grant execute on function public.get_public_card_profile(text,text) to anon,authenticated,service_role;
