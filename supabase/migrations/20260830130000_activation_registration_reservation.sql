-- Guest activation crosses two transaction boundaries: Postgres and Supabase Auth.
-- Reserve the paid order before creating an Auth user so business-rule failures
-- cannot leave an account that has no claimable order. Finalization remains
-- idempotent for ambiguous network retries.

alter table public.activation_tokens
  add column if not exists registration_reservation_id uuid,
  add column if not exists registration_reserved_at timestamptz,
  add column if not exists registration_reservation_expires_at timestamptz;

create index if not exists activation_tokens_registration_reservation_idx
  on public.activation_tokens (registration_reservation_id)
  where registration_reservation_id is not null;

create or replace function public.reserve_commerce_order_activation(
  p_token_hash text,
  p_user_email text,
  p_reservation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.activation_tokens%rowtype;
  v_order public.commerce_orders%rowtype;
  v_now timestamptz := now();
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

  if v_token.registration_reservation_id is not null
     and v_token.registration_reservation_id <> p_reservation_id
     and coalesce(v_token.registration_reservation_expires_at, '-infinity'::timestamptz) > v_now then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATION_IN_PROGRESS');
  end if;

  update public.activation_tokens
  set registration_reservation_id = p_reservation_id,
      registration_reserved_at = v_now,
      registration_reservation_expires_at = v_now + interval '10 minutes'
  where id = v_token.id;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'reservation_expires_at', v_now + interval '10 minutes'
  );
end;
$$;

create or replace function public.finalize_commerce_order_activation_registration(
  p_token_hash text,
  p_reservation_id uuid,
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
begin
  select * into v_token
  from public.activation_tokens
  where token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_INVALID');
  end if;

  select * into v_order
  from public.commerce_orders
  where id = v_token.order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_PAID');
  end if;

  -- A retry after a successful commit is a success, not an instruction to
  -- delete the Auth user. This covers the common "DB committed, response lost"
  -- failure mode.
  if v_token.used_at is not null then
    if v_order.user_id = p_user_id and v_order.activation_claimed_at is not null then
      return jsonb_build_object('ok', true, 'order_id', v_order.id, 'idempotent', true);
    end if;
    return jsonb_build_object('ok', false, 'code', 'TOKEN_INVALID');
  end if;

  if v_token.invalidated_at is not null or v_token.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_INVALID');
  end if;

  if v_token.registration_reservation_id is distinct from p_reservation_id then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATION_RESERVATION_INVALID');
  end if;

  if v_token.registration_reservation_expires_at is null or v_token.registration_reservation_expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATION_RESERVATION_EXPIRED');
  end if;

  if v_order.status <> 'PAID' then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_PAID');
  end if;

  if v_order.activation_deadline_at is not null and v_order.activation_deadline_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATION_EXPIRED');
  end if;

  if v_order.user_id is not null and v_order.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'code', 'ORDER_ALREADY_CLAIMED');
  end if;

  if lower(coalesce(v_order.guest_email, '')) <> lower(coalesce(p_user_email, '')) then
    return jsonb_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  end if;

  update public.commerce_orders
  set user_id = p_user_id,
      activation_claimed_at = coalesce(activation_claimed_at, v_now),
      updated_at = v_now
  where id = v_order.id;

  update public.entitlements e
  set user_id = p_user_id,
      status = 'ACTIVE',
      starts_at = coalesce(e.starts_at, v_now),
      expires_at = coalesce(e.expires_at, v_expires)
  where e.order_item_id in (
    select i.id from public.commerce_order_items i where i.order_id = v_order.id
  );

  update public.activation_tokens
  set used_at = v_now,
      registration_reservation_id = null,
      registration_reserved_at = null,
      registration_reservation_expires_at = null
  where id = v_token.id;

  return jsonb_build_object('ok', true, 'order_id', v_order.id);
end;
$$;

create or replace function public.release_commerce_order_activation_reservation(
  p_token_hash text,
  p_reservation_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row_count bigint;
begin
  update public.activation_tokens
  set registration_reservation_id = null,
      registration_reserved_at = null,
      registration_reservation_expires_at = null
  where token_hash = p_token_hash
    and registration_reservation_id = p_reservation_id
    and used_at is null;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function public.reserve_commerce_order_activation(text, text, uuid) from public, anon, authenticated;
revoke all on function public.finalize_commerce_order_activation_registration(text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.release_commerce_order_activation_reservation(text, uuid) from public, anon, authenticated;

grant execute on function public.reserve_commerce_order_activation(text, text, uuid) to service_role;
grant execute on function public.finalize_commerce_order_activation_registration(text, uuid, uuid, text) to service_role;
grant execute on function public.release_commerce_order_activation_reservation(text, uuid) to service_role;
