alter table public.corporate_leads
  alter column full_name drop not null,
  alter column email drop not null,
  alter column company drop not null,
  alter column employee_count drop not null;

alter table public.corporate_leads
  add column if not exists encrypted_payload text,
  add column if not exists notification_status text not null default 'PENDING',
  add column if not exists notification_attempts integer not null default 0,
  add column if not exists notification_next_attempt_at timestamptz not null default now(),
  add column if not exists notification_lease_expires_at timestamptz,
  add column if not exists first_notified_at timestamptz,
  add column if not exists last_notified_at timestamptz,
  add column if not exists last_notification_error_code text;

alter table public.corporate_leads
  drop constraint if exists corporate_leads_notification_status_check;

alter table public.corporate_leads
  add constraint corporate_leads_notification_status_check
  check (notification_status in ('PENDING', 'PROCESSING', 'RETRYABLE', 'DELIVERED', 'FAILED', 'LEGACY_UNVERIFIED')),
  add constraint corporate_leads_notification_attempts_check
  check (notification_attempts >= 0 and notification_attempts <= 20),
  add constraint corporate_leads_sensitive_payload_check
  check (encrypted_payload is not null or (full_name is not null and email is not null and company is not null));

update public.corporate_leads
set notification_status = 'LEGACY_UNVERIFIED',
    notification_next_attempt_at = 'infinity'::timestamptz
where encrypted_payload is null
  and notification_status = 'PENDING';

create index if not exists corporate_leads_notification_due_idx
  on public.corporate_leads (notification_status, notification_next_attempt_at)
  where notification_status in ('PENDING', 'RETRYABLE', 'PROCESSING');
