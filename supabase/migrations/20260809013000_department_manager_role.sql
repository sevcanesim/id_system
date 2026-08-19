-- v25.6: department-scoped manager role.
alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('OWNER','ADMIN','HR','DEPARTMENT_MANAGER','EMPLOYEE'));

comment on constraint organization_members_role_check on public.organization_members is
  'Organization roles including department-scoped managers.';

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
   where organization_id=p_organization_id and status in('INVITED','ACTIVE');
  if v_count>=v_subscription.seat_limit then return jsonb_build_object('ok',false,'code','SEAT_LIMIT'); end if;
  insert into public.organization_members(organization_id,email,full_name,title,department,role,status)
  values(p_organization_id,lower(trim(p_email)),p_full_name,nullif(p_title,''),nullif(p_department,''),p_role,'INVITED')
  returning * into v_member;
  insert into public.organization_invites(organization_id,member_id,token_hash,expires_at,last_sent_at,invited_by_user_id)
  values(p_organization_id,v_member.id,p_token_hash,p_expires_at,now(),p_actor_user_id);
  return jsonb_build_object('ok',true,'member',to_jsonb(v_member));
exception when unique_violation then return jsonb_build_object('ok',false,'code','DUPLICATE');
end; $$;

create or replace function public.resend_organization_invitation(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,
  p_token_hash text,p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_invite public.organization_invites%rowtype; v_actor_rank integer; v_target_rank integer;
begin
  select * into v_actor from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members
   where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null or v_member.status<>'INVITED' then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_actor.role='DEPARTMENT_MANAGER' and
     (v_actor.department is null or v_member.role<>'EMPLOYEE' or v_member.department is distinct from v_actor.department)
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  if v_actor_rank<=v_target_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select * into v_invite from public.organization_invites
   where member_id=v_member.id and used_at is null and revoked_at is null
   order by created_at desc limit 1 for update;
  if found then
    update public.organization_invites set token_hash=p_token_hash,expires_at=p_expires_at,
      last_sent_at=now(),send_count=send_count+1 where id=v_invite.id;
  else
    insert into public.organization_invites(organization_id,member_id,token_hash,expires_at,last_sent_at,invited_by_user_id)
    values(p_organization_id,v_member.id,p_token_hash,p_expires_at,now(),p_actor_user_id);
  end if;
  return jsonb_build_object('ok',true,'email',v_member.email,'member_id',v_member.id);
end; $$;

create or replace function public.revoke_organization_invitation(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_actor_rank integer; v_target_rank integer;
begin
  select * into v_actor from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members
   where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null or v_member.status<>'INVITED' then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_actor.role='DEPARTMENT_MANAGER' and
     (v_actor.department is null or v_member.role<>'EMPLOYEE' or v_member.department is distinct from v_actor.department)
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  if v_actor_rank<=v_target_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  update public.organization_invites set revoked_at=coalesce(revoked_at,now())
   where member_id=v_member.id and used_at is null and revoked_at is null;
  update public.organization_members set status='LEFT' where id=v_member.id;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,'INVITED','LEFT',coalesce(nullif(trim(p_reason),''),'Davet iptal edildi'));
  return jsonb_build_object('ok',true,'member_id',v_member.id);
end; $$;

create or replace function public.change_organization_member_status(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,p_status text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_actor_rank integer; v_target_rank integer;
begin
  select * into v_actor from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members
   where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null or v_member.user_id=p_actor_user_id or v_member.role='OWNER'
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_actor.role='DEPARTMENT_MANAGER' and
     (v_actor.department is null or v_member.role<>'EMPLOYEE' or v_member.department is distinct from v_actor.department)
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  if v_actor_rank<=v_target_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if p_status not in('ACTIVE','SUSPENDED','LEFT') then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status='LEFT' or
     (v_member.status='INVITED' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='ACTIVE' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='SUSPENDED' and p_status not in('ACTIVE','LEFT'))
  then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status=p_status then return jsonb_build_object('ok',true,'unchanged',true); end if;
  update public.organization_members set status=p_status where id=v_member.id;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,v_member.status,p_status,nullif(trim(p_reason),''));
  return jsonb_build_object('ok',true,'member_id',v_member.id,'status',p_status);
end; $$;

create or replace function public.change_organization_member_role(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,p_role text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_actor_rank integer; v_target_rank integer; v_new_rank integer;
begin
  select * into v_actor from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members
   where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null or v_actor.role='DEPARTMENT_MANAGER' or v_member.user_id=p_actor_user_id or v_member.role='OWNER' or p_role='OWNER'
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if p_role not in('ADMIN','HR','DEPARTMENT_MANAGER','EMPLOYEE') then return jsonb_build_object('ok',false,'code','INVALID_ROLE'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_new_rank:=case p_role when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  if v_actor_rank<=v_target_rank or v_actor_rank<=v_new_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_member.role=p_role then return jsonb_build_object('ok',true,'unchanged',true); end if;
  update public.organization_members set role=p_role where id=v_member.id;
  insert into public.organization_member_role_history(organization_id,member_id,actor_user_id,from_role,to_role,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,v_member.role,p_role,nullif(trim(p_reason),''));
  return jsonb_build_object('ok',true,'member_id',v_member.id,'role',p_role);
end; $$;

revoke all on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) to service_role;
revoke all on function public.change_organization_member_status(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_organization_member_status(uuid,uuid,uuid,text,text) to service_role;
revoke all on function public.change_organization_member_role(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_organization_member_role(uuid,uuid,uuid,text,text) to service_role;
revoke all on function public.resend_organization_invitation(uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.resend_organization_invitation(uuid,uuid,uuid,text,timestamptz) to service_role;
revoke all on function public.revoke_organization_invitation(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.revoke_organization_invitation(uuid,uuid,uuid,text) to service_role;
