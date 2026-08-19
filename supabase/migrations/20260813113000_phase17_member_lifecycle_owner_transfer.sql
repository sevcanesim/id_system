-- Phase 17: atomic organization lifecycle and owner continuity.
create or replace function public.change_organization_member_status(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,p_status text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_actor_rank integer; v_target_rank integer;
begin
  select * into v_actor from public.organization_members where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_member.user_id=p_actor_user_id or v_member.role='OWNER' then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  if v_actor_rank<=v_target_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if p_status not in('ACTIVE','SUSPENDED','LEFT') then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status='LEFT' or (v_member.status='INVITED' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='ACTIVE' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='SUSPENDED' and p_status not in('ACTIVE','LEFT'))
  then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status=p_status then return jsonb_build_object('ok',true,'unchanged',true); end if;

  update public.organization_members set status=p_status where id=v_member.id;
  if v_member.user_id is not null then
    if p_status in ('SUSPENDED','LEFT') then
      update public.card_profiles set card_status='SUSPENDED'
       where user_id=v_member.user_id and card_status in ('ACTIVE','LOST');
      update public.physical_cards set status='DISABLED'
       where owner_user_id=v_member.user_id and organization_id=p_organization_id and status in ('ACTIVE','LOST');
    elsif p_status='ACTIVE' and v_member.status='SUSPENDED' then
      update public.card_profiles set card_status='ACTIVE'
       where user_id=v_member.user_id and card_status='SUSPENDED'
         and (service_expires_at is null or service_expires_at > now());
      -- Physical cards intentionally stay disabled: a manager must explicitly reactivate them.
    end if;
  end if;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,v_member.status,p_status,nullif(trim(p_reason),''));
  return jsonb_build_object('ok',true,'member_id',v_member.id,'status',p_status);
end; $$;
revoke all on function public.change_organization_member_status(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_organization_member_status(uuid,uuid,uuid,text,text) to service_role;

create or replace function public.transfer_organization_ownership(
  p_actor_user_id uuid,p_organization_id uuid,p_new_owner_member_id uuid,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner public.organization_members%rowtype; v_new public.organization_members%rowtype;
begin
  select * into v_owner from public.organization_members where organization_id=p_organization_id and user_id=p_actor_user_id and role='OWNER' and status='ACTIVE' for update;
  if v_owner.id is null then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select * into v_new from public.organization_members where id=p_new_owner_member_id and organization_id=p_organization_id for update;
  if v_new.id is null then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_new.id=v_owner.id or v_new.user_id is null or v_new.status<>'ACTIVE' then return jsonb_build_object('ok',false,'code','INVALID_TARGET'); end if;
  if v_new.role not in ('ADMIN','HR','DEPARTMENT_MANAGER','EMPLOYEE') then return jsonb_build_object('ok',false,'code','INVALID_TARGET'); end if;

  update public.organization_members set role='ADMIN' where id=v_owner.id;
  update public.organization_members set role='OWNER' where id=v_new.id;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_new.id,p_actor_user_id,'ROLE:'||v_new.role,'ROLE:OWNER',coalesce(nullif(trim(p_reason),''),'Ownership transfer'));
  return jsonb_build_object('ok',true,'previous_owner_member_id',v_owner.id,'owner_member_id',v_new.id);
end; $$;
revoke all on function public.transfer_organization_ownership(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.transfer_organization_ownership(uuid,uuid,uuid,text) to service_role;
