-- Enforce paid organization capacity at the database boundary.
-- The subscription row is locked so concurrent invite acceptances cannot both
-- observe the same free seat and oversubscribe the organization.

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
  v_active_count integer:=0;
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

  select count(*)::integer into v_active_count
  from public.organization_members
  where organization_id=v_invite.organization_id
    and status='ACTIVE';

  if v_active_count>=v_subscription.seat_limit then
    return jsonb_build_object(
      'ok',false,
      'code','SEAT_LIMIT_REACHED',
      'seat_limit',v_subscription.seat_limit,
      'active_count',v_active_count
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
    'active_count',v_active_count+1
  );
end;
$$;

revoke all on function public.accept_organization_invite(text,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_organization_invite(text,uuid,text) to service_role;
