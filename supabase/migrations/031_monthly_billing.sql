-- v23.22: monthly billing option for corporate plans, alongside annual.
--
-- Root cause / decision: business_plans only ever had annual_price_kurus,
-- and provision_organization always billed a fixed 365-day term. There was
-- no monthly option for a corporate customer who wants to start smaller or
-- try the product before committing to a year.
--
-- Pricing model: monthly price = (annual price / 12) plus roughly a 15%
-- flexibility premium, rounded to a clean number — the standard SaaS
-- pattern of rewarding annual prepayment with a lower effective rate.
-- ENTERPRISE and the internal DEMO-* plans keep monthly_price_kurus null
-- (custom-quote / test-only, unchanged).
--
-- Explicitly NOT included: automated recurring charging. Both monthly and
-- annual subscriptions here are provisioned with a fixed expires_at set once
-- at creation time — there is no iyzico recurring-payment integration yet,
-- so a monthly plan still requires an admin to manually renew it every
-- month. This migration adds the billing *cadence* and *price*, not
-- automated billing; that remains a separate, larger integration.

alter table public.business_plans
  add column if not exists monthly_price_kurus integer;

alter table public.organization_subscriptions
  add column if not exists billing_period text not null default 'YEARLY'
    check (billing_period in ('MONTHLY', 'YEARLY'));

update public.business_plans set monthly_price_kurus = 80000 where code = 'STARTER';
update public.business_plans set monthly_price_kurus = 180000 where code = 'GROWTH';
update public.business_plans set monthly_price_kurus = 330000 where code = 'BUSINESS';

create or replace function public.provision_organization(
  p_actor_user_id uuid,
  p_name text,
  p_slug text,
  p_owner_email text,
  p_owner_full_name text,
  p_plan_code text,
  p_seat_limit_override integer,
  p_billing_period text,
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

  if p_billing_period not in ('MONTHLY', 'YEARLY') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_BILLING_PERIOD');
  end if;

  select * into v_plan from public.business_plans where code = p_plan_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND');
  end if;

  if p_billing_period = 'MONTHLY' and v_plan.monthly_price_kurus is null and p_plan_code not like 'DEMO-%' then
    return jsonb_build_object('ok', false, 'code', 'MONTHLY_NOT_AVAILABLE_FOR_PLAN');
  end if;

  v_seat_limit := coalesce(p_seat_limit_override, v_plan.seat_limit);
  if v_seat_limit is null or v_seat_limit <= 0 then
    return jsonb_build_object('ok', false, 'code', 'SEAT_LIMIT_REQUIRED');
  end if;

  insert into public.organizations(name, slug, status)
  values (trim(p_name), trim(p_slug), 'ACTIVE')
  returning * into v_organization;

  insert into public.organization_subscriptions(organization_id, plan_id, status, starts_at, expires_at, seat_limit, billing_period)
  values (v_organization.id, v_plan.id, 'ACTIVE', now(), p_expires_at, v_seat_limit, p_billing_period)
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
      'billing_period', p_billing_period,
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

-- Old 10-arg signature is replaced by the 11-arg version above; drop it so
-- there is exactly one provision_organization function.
drop function if exists public.provision_organization(uuid,text,text,text,text,text,integer,timestamptz,text,timestamptz);

revoke all on function public.provision_organization(uuid,text,text,text,text,text,integer,text,timestamptz,text,timestamptz) from public, anon, authenticated;
grant execute on function public.provision_organization(uuid,text,text,text,text,text,integer,text,timestamptz,text,timestamptz) to service_role;
