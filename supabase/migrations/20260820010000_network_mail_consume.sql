-- Network Mail spend must debit before send. A charged-then-failed callback
-- can refund; a sent-then-failed debit cannot unsend. Both organization and
-- Individual Premium ledgers expose the same consume/refund pair to service_role.

create or replace function public.consume_organization_network_mail(p_organization_id uuid, p_debit integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
begin
  if p_debit is null or p_debit < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DEBIT');
  end if;

  update public.organization_entitlements
  set mail_credits_remaining = mail_credits_remaining - p_debit,
      updated_at = now()
  where organization_id = p_organization_id
    and mail_credits_remaining >= p_debit
  returning mail_credits_remaining into v_remaining;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_NETWORK_MAIL');
  end if;

  return jsonb_build_object('ok', true, 'remaining', v_remaining, 'debit', p_debit);
end;
$$;

create or replace function public.refund_organization_network_mail(p_organization_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
begin
  if p_amount is null or p_amount < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  update public.organization_entitlements
  set mail_credits_remaining = mail_credits_remaining + p_amount,
      updated_at = now()
  where organization_id = p_organization_id
  returning mail_credits_remaining into v_remaining;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'ENTITLEMENT_NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'remaining', v_remaining);
end;
$$;

create or replace function public.consume_individual_network_mail(p_user_id uuid, p_debit integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_remaining integer;
begin
  if p_debit is null or p_debit < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DEBIT');
  end if;

  select id into v_id
  from public.entitlements
  where user_id = p_user_id
    and status = 'ACTIVE'
    and coalesce(package_code, '') = 'INDIVIDUAL_PREMIUM'
    and network_mail_remaining >= p_debit
  order by expires_at desc nulls last
  for update
  limit 1;

  if v_id is null then
    return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_NETWORK_MAIL');
  end if;

  update public.entitlements
  set network_mail_remaining = network_mail_remaining - p_debit,
      updated_at = now()
  where id = v_id
  returning network_mail_remaining into v_remaining;

  return jsonb_build_object('ok', true, 'remaining', v_remaining, 'debit', p_debit, 'entitlement_id', v_id);
end;
$$;

create or replace function public.refund_individual_network_mail(p_entitlement_id uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
begin
  if p_amount is null or p_amount < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  update public.entitlements
  set network_mail_remaining = network_mail_remaining + p_amount,
      updated_at = now()
  where id = p_entitlement_id
  returning network_mail_remaining into v_remaining;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'ENTITLEMENT_NOT_FOUND');
  end if;

  return jsonb_build_object('ok', true, 'remaining', v_remaining);
end;
$$;

revoke all on function public.consume_organization_network_mail(uuid, integer) from public, anon, authenticated;
revoke all on function public.refund_organization_network_mail(uuid, integer) from public, anon, authenticated;
revoke all on function public.consume_individual_network_mail(uuid, integer) from public, anon, authenticated;
revoke all on function public.refund_individual_network_mail(uuid, integer) from public, anon, authenticated;

grant execute on function public.consume_organization_network_mail(uuid, integer) to service_role;
grant execute on function public.refund_organization_network_mail(uuid, integer) to service_role;
grant execute on function public.consume_individual_network_mail(uuid, integer) to service_role;
grant execute on function public.refund_individual_network_mail(uuid, integer) to service_role;
