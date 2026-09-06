create or replace function public.save_own_card_profile_with_privacy(
  p_user_id uuid,
  p_profile_id uuid,
  p_organization_id uuid,
  p_patch jsonb,
  p_privacy jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_profile_id uuid;
  v_profile public.card_profiles%rowtype;
begin
  if p_privacy is null or jsonb_typeof(p_privacy) <> 'object' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PRIVACY_PATCH');
  end if;

  select public.save_own_card_profile(
    p_user_id,
    p_profile_id,
    p_organization_id,
    p_patch
  ) into v_result;

  if coalesce((v_result->>'ok')::boolean, false) is false then
    return v_result;
  end if;

  begin
    v_profile_id := (v_result->'profile'->>'id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'code', 'PROFILE_SAVE_RESULT_INVALID');
  end;

  update public.card_profiles
  set
    slug = case when coalesce((p_privacy->>'clearSlug')::boolean, false) then null else slug end,
    search_indexing_enabled = coalesce((p_privacy->>'searchIndexingEnabled')::boolean, search_indexing_enabled)
  where id = v_profile_id
    and user_id = p_user_id
  returning * into v_profile;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'profile', to_jsonb(v_profile));
end;
$$;

revoke all on function public.save_own_card_profile_with_privacy(uuid,uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.save_own_card_profile_with_privacy(uuid,uuid,uuid,jsonb,jsonb) to service_role;
