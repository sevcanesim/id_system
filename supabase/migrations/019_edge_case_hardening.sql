-- v23.1.6: edge-case hardening for slugs and organization invite acceptance.

create or replace function public.reject_reserved_card_slug()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.slug is null then
    return new;
  end if;
  if lower(new.slug) = any(array[
    'api','admin','aktivasyon','checkout','giris','gizlilik','iade-iptal',
    'kartim','kartlarim','kayit','kurumsal','mesafeli-satis-sozlesmesi',
    'nfc-siparis','odeme','olustur','p','sepet','siparislerim','urunler',
    'ayarlar','destek','fiyatlar','sevcanesimkaradeniz','aliemrekaradeniz'
  ]::text[]) then
    raise exception using errcode = '23514', message = 'RESERVED_CARD_SLUG';
  end if;
  return new;
end;
$$;

drop trigger if exists card_profiles_reserved_slug_guard on public.card_profiles;
create trigger card_profiles_reserved_slug_guard
before insert or update of slug on public.card_profiles
for each row execute function public.reject_reserved_card_slug();

create or replace function public.accept_organization_invite(
  p_token_hash text,
  p_user_id uuid,
  p_user_email text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.organization_invites%rowtype;
  v_member public.organization_members%rowtype;
  v_now timestamptz := now();
begin
  select * into v_invite
  from public.organization_invites
  where token_hash = p_token_hash
  for update;

  if not found or v_invite.used_at is not null or v_invite.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_INVALID');
  end if;

  select * into v_member
  from public.organization_members
  where id = v_invite.member_id
  for update;

  if not found or v_member.status <> 'INVITED' then
    return jsonb_build_object('ok', false, 'code', 'MEMBER_UNAVAILABLE');
  end if;

  if lower(coalesce(v_member.email, '')) <> lower(coalesce(p_user_email, '')) then
    return jsonb_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  end if;

  update public.organization_members
  set user_id = p_user_id, status = 'ACTIVE'
  where id = v_member.id;

  update public.organization_invites
  set used_at = v_now
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'member_id', v_member.id, 'organization_id', v_invite.organization_id);
end;
$$;

revoke all on function public.accept_organization_invite(text, uuid, text) from public;
grant execute on function public.accept_organization_invite(text, uuid, text) to service_role;

-- Ensure the one-year service entitlement actually receives the configured
-- seven-day grace window when an order is claimed.
create or replace function public.claim_commerce_order_activation(
  p_token_hash text,
  p_user_id uuid,
  p_user_email text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.activation_tokens%rowtype;
  v_order public.commerce_orders%rowtype;
  v_now timestamptz := now();
  v_expires timestamptz := now() + interval '365 days';
  v_grace_ends timestamptz := now() + interval '372 days';
begin
  select * into v_token
  from public.activation_tokens
  where token_hash = p_token_hash
  for update;

  if not found or v_token.used_at is not null or v_token.invalidated_at is not null or v_token.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_INVALID');
  end if;

  select * into v_order
  from public.commerce_orders
  where id = v_token.order_id
  for update;

  if not found or v_order.status <> 'PAID' then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_PAID');
  end if;

  if v_order.activation_deadline_at is not null and v_order.activation_deadline_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATION_EXPIRED');
  end if;

  if v_order.user_id is not null then
    return jsonb_build_object('ok', false, 'code', 'ORDER_ALREADY_CLAIMED');
  end if;

  if lower(coalesce(v_order.guest_email, '')) <> lower(coalesce(p_user_email, '')) then
    return jsonb_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  end if;

  update public.commerce_orders
  set user_id = p_user_id,
      activation_claimed_at = v_now,
      updated_at = v_now
  where id = v_order.id;

  update public.entitlements e
  set user_id = p_user_id,
      status = 'ACTIVE',
      starts_at = coalesce(e.starts_at, v_now),
      expires_at = coalesce(e.expires_at, v_expires),
      grace_ends_at = coalesce(e.grace_ends_at, v_grace_ends)
  where e.order_item_id in (
    select i.id from public.commerce_order_items i where i.order_id = v_order.id
  );

  update public.activation_tokens
  set used_at = v_now
  where id = v_token.id;

  return jsonb_build_object('ok', true, 'order_id', v_order.id);
end;
$$;

revoke all on function public.claim_commerce_order_activation(text, uuid, text) from public;
grant execute on function public.claim_commerce_order_activation(text, uuid, text) to service_role;

-- Keep the public profile's service window in sync with its entitlement so
-- public routes can enforce expiry/grace without exposing entitlement rows.
create or replace function public.sync_card_profile_service_window()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_entitlement public.entitlements%rowtype;
begin
  if new.entitlement_id is null then
    return new;
  end if;

  select * into v_entitlement
  from public.entitlements
  where id = new.entitlement_id;

  if found then
    new.service_started_at := v_entitlement.starts_at;
    new.service_expires_at := v_entitlement.expires_at;
    new.grace_ends_at := v_entitlement.grace_ends_at;
  end if;
  return new;
end;
$$;

drop trigger if exists card_profiles_service_window_sync on public.card_profiles;
create trigger card_profiles_service_window_sync
before insert or update of entitlement_id on public.card_profiles
for each row execute function public.sync_card_profile_service_window();
