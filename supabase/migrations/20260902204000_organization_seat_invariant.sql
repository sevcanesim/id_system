-- Keep organization capacity accounting identical at invite reservation and acceptance.
-- ACTIVE, INVITED and SUSPENDED all consume a paid seat; only LEFT releases one.

create or replace function public.organization_seats_consumed(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select count(*)::integer
  from public.organization_members
  where organization_id=p_organization_id
    and status <> 'LEFT';
$$;

revoke all on function public.organization_seats_consumed(uuid) from public,anon,authenticated;
grant execute on function public.organization_seats_consumed(uuid) to service_role;

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

revoke all on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) to service_role;

create or replace function public.accept_organization_invite(
  p_token_hash text,
  p_user_id uuid,
  p_user_email text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_invite public.organization_invites%rowtype;
  v_member public.organization_members%rowtype;
  v_subscription public.organization_subscriptions%rowtype;
  v_consumed integer:=0;
  v_now timestamptz:=now();
begin
  select * into v_invite
  from public.organization_invites
  where token_hash=p_token_hash
  for update;

  if not found
    or v_invite.used_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at<=v_now
  then
    return jsonb_build_object('ok',false,'code','TOKEN_INVALID');
  end if;

  select * into v_member
  from public.organization_members
  where id=v_invite.member_id
  for update;

  if not found or v_member.status<>'INVITED' then
    return jsonb_build_object('ok',false,'code','MEMBER_UNAVAILABLE');
  end if;

  if lower(coalesce(v_member.email,''))<>lower(coalesce(p_user_email,'')) then
    return jsonb_build_object('ok',false,'code','EMAIL_MISMATCH');
  end if;

  select * into v_subscription
  from public.organization_subscriptions
  where organization_id=v_invite.organization_id
    and status in ('ACTIVE','GRACE_PERIOD')
    and (expires_at is null or expires_at>v_now)
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok',false,'code','SUBSCRIPTION_INACTIVE');
  end if;

  v_consumed := public.organization_seats_consumed(v_invite.organization_id);

  -- This invitation already consumes one seat while it is INVITED. Converting
  -- it to ACTIVE is capacity-neutral, so only reject an already-oversubscribed
  -- organization. This also prevents legacy data with SUSPENDED seats from
  -- bypassing the paid capacity limit during acceptance.
  if v_consumed>v_subscription.seat_limit then
    return jsonb_build_object(
      'ok',false,
      'code','SEAT_LIMIT_REACHED',
      'seat_limit',v_subscription.seat_limit,
      'consumed',v_consumed
    );
  end if;

  update public.organization_members
  set user_id=p_user_id,status='ACTIVE'
  where id=v_member.id;

  update public.organization_invites
  set used_at=v_now,accepted_at=v_now
  where id=v_invite.id;

  insert into public.organization_member_status_history(
    organization_id,member_id,actor_user_id,from_status,to_status,reason
  ) values(
    v_invite.organization_id,v_member.id,p_user_id,'INVITED','ACTIVE','Davet kabul edildi'
  );

  return jsonb_build_object(
    'ok',true,
    'member_id',v_member.id,
    'organization_id',v_invite.organization_id,
    'seat_limit',v_subscription.seat_limit,
    'consumed',v_consumed
  );
end;
$$;

revoke all on function public.accept_organization_invite(text,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_organization_invite(text,uuid,text) to service_role;
