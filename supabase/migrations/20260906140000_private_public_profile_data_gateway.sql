drop policy if exists "Public can resolve slug redirects" on public.card_profile_slug_redirects;
drop policy if exists "Public can read published locales" on public.card_profile_locales;

revoke select on public.card_profiles from public, anon;
revoke select on public.card_profile_slug_redirects from public, anon;
revoke select on public.card_profile_locales from public, anon;

revoke all on function public.get_public_card_profile(text,text) from public, anon, authenticated;
revoke all on function public.get_public_profile_physical_state(uuid) from public, anon, authenticated;
revoke all on function public.resolve_public_networking_event_link(text) from public, anon, authenticated;
grant execute on function public.get_public_card_profile(text,text) to service_role;
grant execute on function public.get_public_profile_physical_state(uuid) to service_role;
grant execute on function public.resolve_public_networking_event_link(text) to service_role;
