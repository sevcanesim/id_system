-- v23.5: invitation operations, role audit and owner continuity.

create table if not exists public.organization_member_role_history(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_role text not null,
  to_role text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.organization_member_role_history enable row level security;
drop policy if exists "Managers can read member role history" on public.organization_member_role_history;
create policy "Managers can read member role history"
on public.organization_member_role_history for select to authenticated
using(public.is_active_organization_member(organization_id,array['OWNER','ADMIN','HR']));

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
revoke all on function public.resend_organization_invitation(uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.resend_organization_invitation(uuid,uuid,uuid,text,timestamptz) to service_role;

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
revoke all on function public.revoke_organization_invitation(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.revoke_organization_invitation(uuid,uuid,uuid,text) to service_role;

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
revoke all on function public.change_organization_member_role(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_organization_member_role(uuid,uuid,uuid,text,text) to service_role;

-- Replaced to reject revoked invites and record acceptance time.
create or replace function public.accept_organization_invite(p_token_hash text,p_user_id uuid,p_user_email text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_invite public.organization_invites%rowtype; v_member public.organization_members%rowtype; v_now timestamptz:=now();
begin
  select * into v_invite from public.organization_invites where token_hash=p_token_hash for update;
  if not found or v_invite.used_at is not null or v_invite.revoked_at is not null or v_invite.expires_at<=v_now
   then return jsonb_build_object('ok',false,'code','TOKEN_INVALID'); end if;
  select * into v_member from public.organization_members where id=v_invite.member_id for update;
  if not found or v_member.status<>'INVITED' then return jsonb_build_object('ok',false,'code','MEMBER_UNAVAILABLE'); end if;
  if lower(coalesce(v_member.email,''))<>lower(coalesce(p_user_email,''))
   then return jsonb_build_object('ok',false,'code','EMAIL_MISMATCH'); end if;
  update public.organization_members set user_id=p_user_id,status='ACTIVE' where id=v_member.id;
  update public.organization_invites set used_at=v_now,accepted_at=v_now where id=v_invite.id;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(v_invite.organization_id,v_member.id,p_user_id,'INVITED','ACTIVE','Davet kabul edildi');
  return jsonb_build_object('ok',true,'member_id',v_member.id,'organization_id',v_invite.organization_id);
end; $$;
revoke all on function public.accept_organization_invite(text,uuid,text) from public;
grant execute on function public.accept_organization_invite(text,uuid,text) to service_role;
