create or replace function public.reserve_organization_invitation(
  p_actor_user_id uuid,p_organization_id uuid,p_email text,p_full_name text,
  p_title text,p_department text,p_role text,p_token_hash text,p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype;
        v_subscription public.organization_subscriptions%rowtype;
        v_count integer; v_member public.organization_members%rowtype;
begin
  select * into v_actor from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  if v_actor.id is null or p_role='OWNER' or
     (v_actor.role='ADMIN' and p_role='ADMIN') or
     (v_actor.role='HR' and p_role<>'EMPLOYEE') or
     (v_actor.role='DEPARTMENT_MANAGER' and (p_role<>'EMPLOYEE' or v_actor.department is null or v_actor.department is distinct from nullif(p_department,''))) or
     v_actor.role='EMPLOYEE'
  then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select * into v_subscription from public.organization_subscriptions
   where organization_id=p_organization_id and status in('ACTIVE','GRACE_PERIOD')
   order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('ok',false,'code','NO_SUBSCRIPTION'); end if;
  select count(*) into v_count from public.organization_members
   where organization_id=p_organization_id and status <> 'LEFT';
  if v_count>=v_subscription.seat_limit then return jsonb_build_object('ok',false,'code','SEAT_LIMIT'); end if;
  insert into public.organization_members(organization_id,email,full_name,title,department,role,status)
  values(p_organization_id,lower(trim(p_email)),p_full_name,nullif(p_title,''),nullif(p_department,''),p_role,'INVITED')
  returning * into v_member;
  insert into public.organization_invites(organization_id,member_id,token_hash,expires_at,last_sent_at,invited_by_user_id)
  values(p_organization_id,v_member.id,p_token_hash,p_expires_at,now(),p_actor_user_id);
  return jsonb_build_object('ok',true,'member',to_jsonb(v_member));
exception when unique_violation then return jsonb_build_object('ok',false,'code','DUPLICATE');
end; $$;
revoke all on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) to service_role;
