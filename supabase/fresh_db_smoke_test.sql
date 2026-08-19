-- YENOMI ID — Fresh DB structural smoke test
-- Supabase SQL Editor'da migration'lardan sonra çalıştırılabilir.
-- Başarılı olduğunda NOTICE satırları üretir; eksikte EXCEPTION ile durur.

do $$
declare
  missing text[] := array[]::text[];
  item text;
begin
  foreach item in array array[
    'card_profiles',
    'admin_users',
    'nfc_orders',
    'admin_audit_log',
    'products',
    'product_variants',
    'commerce_orders',
    'commerce_order_items',
    'payment_attempts',
    'entitlements',
    'activation_tokens',
    'organizations',
    'organization_members'
  ] loop
    if to_regclass('public.' || item) is null then
      missing := array_append(missing, item);
    end if;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception 'Eksik tablolar: %', array_to_string(missing, ', ');
  end if;

  raise notice '✓ Kritik tablolar mevcut';
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='card_profiles' and column_name='public_id'
  ) then
    raise exception 'card_profiles.public_id eksik';
  end if;
  raise notice '✓ card_profiles.public_id mevcut';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='set_updated_at'
  ) then
    raise exception 'public.set_updated_at() eksik';
  end if;
  raise notice '✓ set_updated_at() mevcut';
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='card_profiles'
  ) then
    raise exception 'card_profiles RLS policy bulunamadı';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='nfc_orders'
  ) then
    raise exception 'nfc_orders RLS policy bulunamadı';
  end if;
  raise notice '✓ Temel RLS policyleri mevcut';
end $$;

select 'FRESH_DB_SMOKE_TEST_OK' as result;
