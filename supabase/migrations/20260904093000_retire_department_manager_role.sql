-- Retire the Department Manager role across persisted memberships and the
-- authorization surface. Existing members are retained as employees.

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

update public.organization_members
set role = 'EMPLOYEE'
where role = 'DEPARTMENT_MANAGER';

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('OWNER', 'ADMIN', 'HR', 'EMPLOYEE'));

comment on constraint organization_members_role_check on public.organization_members is
  'Organization roles: owner, administrator, HR manager, and employee.';

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
  if v_actor.id is null or p_role not in('ADMIN','HR','EMPLOYEE') or
     (v_actor.role='ADMIN' and p_role='ADMIN') or
     (v_actor.role='HR' and p_role<>'EMPLOYEE') or
     v_actor.role='EMPLOYEE'
  then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;

  select * into v_subscription from public.organization_subscriptions
   where organization_id=p_organization_id and status in('ACTIVE','GRACE_PERIOD')
   order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('ok',false,'code','NO_SUBSCRIPTION'); end if;

  v_count := public.organization_seats_consumed(p_organization_id);
  if v_count>=v_subscription.seat_limit then
    return jsonb_build_object('ok',false,'code','SEAT_LIMIT','seat_limit',v_subscription.seat_limit,'consumed',v_count);
  end if;

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
  v_actor_rank:=case v_actor.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
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
  v_actor_rank:=case v_actor.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
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
  select * into v_actor from public.organization_members where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_member.user_id=p_actor_user_id or v_member.role='OWNER' then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
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
       where user_id=v_member.user_id and organization_id=p_organization_id
         and card_status in ('ACTIVE','LOST');
      update public.physical_cards set status='DISABLED'
       where owner_user_id=v_member.user_id and organization_id=p_organization_id and status in ('ACTIVE','LOST');
    elsif p_status='ACTIVE' and v_member.status='SUSPENDED' then
      update public.card_profiles set card_status='ACTIVE'
       where user_id=v_member.user_id and organization_id=p_organization_id
         and card_status='SUSPENDED'
         and (service_expires_at is null or service_expires_at > now());
    end if;
  end if;
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
  if v_actor.id is null or v_member.user_id=p_actor_user_id or v_member.role='OWNER' or p_role='OWNER'
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if p_role not in('ADMIN','HR','EMPLOYEE') then return jsonb_build_object('ok',false,'code','INVALID_ROLE'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  v_new_rank:=case p_role when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  if v_actor_rank<=v_target_rank or v_actor_rank<=v_new_rank
   then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_member.role=p_role then return jsonb_build_object('ok',true,'unchanged',true); end if;
  update public.organization_members set role=p_role where id=v_member.id;
  insert into public.organization_member_role_history(organization_id,member_id,actor_user_id,from_role,to_role,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,v_member.role,p_role,nullif(trim(p_reason),''));
  return jsonb_build_object('ok',true,'member_id',v_member.id,'role',p_role);
end; $$;

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
  if v_new.role not in ('ADMIN','HR','EMPLOYEE') then return jsonb_build_object('ok',false,'code','INVALID_TARGET'); end if;

  update public.organization_members set role='ADMIN' where id=v_owner.id;
  update public.organization_members set role='OWNER' where id=v_new.id;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_new.id,p_actor_user_id,'ROLE:'||v_new.role,'ROLE:OWNER',coalesce(nullif(trim(p_reason),''),'Ownership transfer'));
  return jsonb_build_object('ok',true,'previous_owner_member_id',v_owner.id,'owner_member_id',v_new.id);
end; $$;

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
  v_normalized_email text;
  v_email_changed boolean;
begin
  select * into v_actor
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_actor_user_id
    and status = 'ACTIVE'
  for update;

  if not found or v_actor.role not in ('OWNER', 'ADMIN', 'HR') then
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
    when 'OWNER' then 4
    when 'ADMIN' then 3
    when 'HR' then 2
    else 1
  end;

  v_target_rank := case v_target.role
    when 'OWNER' then 4
    when 'ADMIN' then 3
    when 'HR' then 2
    else 1
  end;

  if v_actor.role = 'OWNER' then
    if v_target.user_id is distinct from p_actor_user_id and v_actor_rank <= v_target_rank then
      return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
    end if;
  elsif v_target.user_id = p_actor_user_id
    or v_target.role = 'OWNER'
    or v_actor_rank <= v_target_rank then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
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
     or length(coalesce(p_department, '')) > 120 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_FIELD');
  end if;

  v_email_changed := lower(v_target.email) is distinct from v_normalized_email;

  update public.organization_members
  set
    full_name = trim(p_full_name),
    email = v_normalized_email,
    title = nullif(trim(coalesce(p_title, '')), ''),
    department = nullif(trim(coalesce(p_department, '')), '')
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

drop policy if exists "Managers can read title requests" on public.member_title_requests;
create policy "Managers can read title requests" on public.member_title_requests
for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE' and m.role in('OWNER','ADMIN','HR')));

drop policy if exists "Managers can read identity change log" on public.member_identity_change_log;
create policy "Managers can read identity change log" on public.member_identity_change_log
for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE' and m.role in('OWNER','ADMIN','HR')));

create or replace function public.resolve_member_title_request(
  p_actor_user_id uuid, p_request_id uuid, p_approve boolean, p_note text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_request public.member_title_requests%rowtype;
  v_actor public.organization_members%rowtype;
  v_member public.organization_members%rowtype;
begin
  select * into v_request from public.member_title_requests where id=p_request_id for update;
  if not found or v_request.status<>'PENDING' then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  select * into v_actor from public.organization_members
    where organization_id=v_request.organization_id and user_id=p_actor_user_id and status='ACTIVE';
  if not found or v_actor.role not in('OWNER','ADMIN','HR') then
    return jsonb_build_object('ok',false,'code','FORBIDDEN');
  end if;
  select * into v_member from public.organization_members where id=v_request.member_id for update;

  if p_approve then
    insert into public.organization_job_titles(organization_id,title,created_by)
    values(v_request.organization_id,v_request.requested_title,p_actor_user_id)
    on conflict(organization_id,title) do nothing;
    update public.organization_members set title=v_request.requested_title where id=v_member.id;
    update public.card_profiles set role=v_request.requested_title
      where user_id=v_member.user_id and user_id is not null;
    update public.member_title_requests set status='APPROVED', resolved_at=now(), resolved_by=p_actor_user_id, note=p_note where id=p_request_id;
  else
    update public.member_title_requests set status='REJECTED', resolved_at=now(), resolved_by=p_actor_user_id, note=p_note where id=p_request_id;
  end if;
  return jsonb_build_object('ok',true);
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
revoke all on function public.transfer_organization_ownership(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.transfer_organization_ownership(uuid,uuid,uuid,text) to service_role;
revoke all on function public.resolve_member_title_request(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.resolve_member_title_request(uuid,uuid,boolean,text) to service_role;
revoke all on function public.update_organization_member_identity(uuid,uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.update_organization_member_identity(uuid,uuid,uuid,text,text,text,text) to service_role;
