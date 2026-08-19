-- v23.20: platform admin can provision a new corporate customer atomically.
--
-- Root cause fixed: there was no application code path that created an
-- organization + its initial organization_subscriptions.seat_limit for a real
-- paying customer. Only supabase/migrations demo inserts and the demo seed
-- script ever wrote to organizations/organization_subscriptions. The seat-pack
-- top-up flow (v23.19) already requires an existing ACTIVE/GRACE_PERIOD
-- subscription, so without this function there was no way to reach that
-- starting point outside of a manual SQL statement.
--
-- This function is intentionally admin-only (called from
-- app/api/admin/organizations/route.ts after verifying admin_users
-- membership). It creates the organization, its first subscription row, and
-- an OWNER member in INVITED status in one transaction, so a corporate
-- customer is either fully provisioned or not created at all.

create or replace function public.provision_organization(
  p_actor_user_id uuid,
  p_name text,
  p_slug text,
  p_owner_email text,
  p_owner_full_name text,
  p_plan_code text,
  p_seat_limit_override integer,
  p_expires_at timestamptz,
  p_token_hash text,
  p_invite_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.business_plans%rowtype;
  v_seat_limit integer;
  v_organization public.organizations%rowtype;
  v_subscription public.organization_subscriptions%rowtype;
  v_member public.organization_members%rowtype;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_slug), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;

  select * into v_plan from public.business_plans where code = p_plan_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND');
  end if;

  -- Plans with no fixed seat_limit (e.g. ENTERPRISE) require an explicit
  -- override; fixed plans use their catalog value unless an admin overrides
  -- it for a negotiated deal.
  v_seat_limit := coalesce(p_seat_limit_override, v_plan.seat_limit);
  if v_seat_limit is null or v_seat_limit <= 0 then
    return jsonb_build_object('ok', false, 'code', 'SEAT_LIMIT_REQUIRED');
  end if;

  insert into public.organizations(name, slug, status)
  values (trim(p_name), trim(p_slug), 'ACTIVE')
  returning * into v_organization;

  insert into public.organization_subscriptions(organization_id, plan_id, status, starts_at, expires_at, seat_limit)
  values (v_organization.id, v_plan.id, 'ACTIVE', now(), p_expires_at, v_seat_limit)
  returning * into v_subscription;

  insert into public.organization_members(organization_id, email, full_name, role, status)
  values (v_organization.id, lower(trim(p_owner_email)), nullif(p_owner_full_name, ''), 'OWNER', 'INVITED')
  returning * into v_member;

  insert into public.organization_invites(organization_id, member_id, token_hash, expires_at, last_sent_at, invited_by_user_id)
  values (v_organization.id, v_member.id, p_token_hash, p_invite_expires_at, now(), p_actor_user_id);

  insert into public.admin_audit_log(actor_user_id, action, target_table, target_id, before_value, after_value)
  values (
    p_actor_user_id,
    'ORGANIZATION_PROVISIONED',
    'organizations',
    v_organization.id::text,
    null,
    jsonb_build_object(
      'name', v_organization.name,
      'slug', v_organization.slug,
      'plan_code', p_plan_code,
      'seat_limit', v_seat_limit,
      'owner_email', v_member.email
    )
  );

  return jsonb_build_object(
    'ok', true,
    'organization', to_jsonb(v_organization),
    'subscription', to_jsonb(v_subscription),
    'member', to_jsonb(v_member)
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_SLUG_OR_MEMBER');
end;
$$;

revoke all on function public.provision_organization(uuid,text,text,text,text,text,integer,timestamptz,text,timestamptz) from public, anon, authenticated;
grant execute on function public.provision_organization(uuid,text,text,text,text,text,integer,timestamptz,text,timestamptz) to service_role;
