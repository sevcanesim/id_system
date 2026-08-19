-- Yenomi ID Admin Audit Log
-- Idempotent, tekrar çalıştırılabilir ve şema farklılıklarına dayanıklı sürüm.

create extension if not exists pgcrypto;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_actor_user_id_idx
  on public.admin_audit_log (actor_user_id);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_table, target_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists
  "Admins can read audit log"
on public.admin_audit_log;

create policy "Admins can read audit log"
on public.admin_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Audit tablosuna authenticated/anon rollerinden doğrudan yazmayı kapat.
revoke insert, update, delete
on public.admin_audit_log
from anon, authenticated;

-- nfc_orders içindeki status ve varsa payment_status değişikliklerini loglar.
-- payment_status kolonu bulunmayan eski şemalarda da hata vermez.
create or replace function public.log_nfc_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_payment_status jsonb := null;
  new_payment_status jsonb := null;
  status_changed boolean := false;
  payment_status_changed boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  status_changed := new.status is distinct from old.status;

  -- payment_status kolonu varsa JSON üzerinden güvenli biçimde oku.
  if to_jsonb(old) ? 'payment_status' then
    old_payment_status := to_jsonb(old) -> 'payment_status';
    new_payment_status := to_jsonb(new) -> 'payment_status';
    payment_status_changed := new_payment_status is distinct from old_payment_status;
  end if;

  if status_changed or payment_status_changed then
    insert into public.admin_audit_log (
      actor_user_id,
      action,
      target_table,
      target_id,
      before_value,
      after_value
    )
    values (
      auth.uid(),
      case
        when status_changed and payment_status_changed
          then 'nfc_orders.status_and_payment_change'
        when payment_status_changed
          then 'nfc_orders.payment_status_change'
        else 'nfc_orders.status_change'
      end,
      'nfc_orders',
      new.id::text,
      jsonb_strip_nulls(
        jsonb_build_object(
          'status', to_jsonb(old) -> 'status',
          'payment_status', old_payment_status
        )
      ),
      jsonb_strip_nulls(
        jsonb_build_object(
          'status', to_jsonb(new) -> 'status',
          'payment_status', new_payment_status
        )
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists nfc_orders_audit_status_change
on public.nfc_orders;

create trigger nfc_orders_audit_status_change
after update on public.nfc_orders
for each row
execute function public.log_nfc_order_status_change();

create or replace function public.log_admin_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (
      actor_user_id,
      action,
      target_table,
      target_id,
      before_value,
      after_value
    )
    values (
      auth.uid(),
      'admin_users.grant',
      'admin_users',
      new.user_id::text,
      null,
      jsonb_build_object('user_id', new.user_id)
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.admin_audit_log (
      actor_user_id,
      action,
      target_table,
      target_id,
      before_value,
      after_value
    )
    values (
      auth.uid(),
      'admin_users.revoke',
      'admin_users',
      old.user_id::text,
      jsonb_build_object('user_id', old.user_id),
      null
    );

    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists admin_users_audit_change
on public.admin_users;

create trigger admin_users_audit_change
after insert or delete on public.admin_users
for each row
execute function public.log_admin_membership_change();

-- SECURITY DEFINER fonksiyonlarını istemcilerin doğrudan çağırmasını engelle.
revoke all
on function public.log_nfc_order_status_change()
from public, anon, authenticated;

revoke all
on function public.log_admin_membership_change()
from public, anon, authenticated;

-- İlk veya yeni yönetici ekleme:
--
-- insert into public.admin_users (user_id)
-- values ('AUTH-USER-UUID')
-- on conflict (user_id) do nothing;
--
-- Not: SQL Editor/service-role ile yapılan işlemlerde auth.uid() null olabilir.
-- Bu durumda audit kaydındaki actor_user_id null kalır; işlem yine loglanır.
