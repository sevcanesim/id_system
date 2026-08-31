create or replace function public.update_organization_member_identity(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_member_id uuid,
  p_full_name text,
  p_email text,
  p_title text default null,
  p_department text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.organization_members%rowtype;
  v_target public.organization_members%rowtype;
  v_updated public.organization_members%rowtype;
  v_actor_rank integer;
  v_target_rank integer;
  v_effective_department text;
  v_normalized_email text;
  v_email_changed boolean;
begin
  select * into v_actor
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_actor_user_id
    and status = 'ACTIVE'
  for update;

  if not found or v_actor.role not in ('OWNER', 'ADMIN', 'HR', 'DEPARTMENT_MANAGER') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select * into v_target
  from public.organization_members
  where id = p_member_id
    and organization_id = p_organization_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  v_actor_rank := case v_actor.role
    when 'OWNER' then 5
    when 'ADMIN' then 4
    when 'HR' then 3
    when 'DEPARTMENT_MANAGER' then 2
    else 1
  end;

  v_target_rank := case v_target.role
    when 'OWNER' then 5
    when 'ADMIN' then 4
    when 'HR' then 3
    when 'DEPARTMENT_MANAGER' then 2
    else 1
  end;

  if v_actor.role = 'OWNER' then
    if v_target.user_id is distinct from p_actor_user_id and v_actor_rank <= v_target_rank then
      return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
    end if;
  else
    if v_target.user_id = p_actor_user_id
       or v_target.role = 'OWNER'
       or v_actor_rank <= v_target_rank then
      return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
    end if;
  end if;

  if v_actor.role = 'DEPARTMENT_MANAGER' then
    if v_actor.department is null
       or v_target.role <> 'EMPLOYEE'
       or v_target.department is distinct from v_actor.department then
      return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
    end if;
    v_effective_department := v_actor.department;
  else
    v_effective_department := nullif(trim(coalesce(p_department, '')), '');
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 2
     or length(trim(p_full_name)) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_NAME');
  end if;

  v_normalized_email := lower(trim(coalesce(p_email, '')));
  if v_normalized_email = '' or position('@' in v_normalized_email) <= 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_EMAIL');
  end if;

  if length(coalesce(p_title, '')) > 120
     or length(coalesce(v_effective_department, '')) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_FIELD');
  end if;

  v_email_changed := lower(v_target.email) is distinct from v_normalized_email;

  update public.organization_members
  set
    full_name = trim(p_full_name),
    email = v_normalized_email,
    title = nullif(trim(coalesce(p_title, '')), ''),
    department = v_effective_department
  where id = v_target.id
    and organization_id = p_organization_id
  returning * into v_updated;

  if v_target.user_id is not null then
    update public.card_profiles
    set
      name = trim(p_full_name),
      role = coalesce(nullif(trim(coalesce(p_title, '')), ''), v_target.role),
      email = v_normalized_email
    where user_id = v_target.user_id
      and organization_id = p_organization_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'member', to_jsonb(v_updated),
    'email_changed', v_email_changed,
    'previous_status', v_target.status
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE');
end;
$$;

revoke all on function public.update_organization_member_identity(uuid, uuid, uuid, text, text, text, text)
from public, anon, authenticated;

grant execute on function public.update_organization_member_identity(uuid, uuid, uuid, text, text, text, text)
to service_role;
