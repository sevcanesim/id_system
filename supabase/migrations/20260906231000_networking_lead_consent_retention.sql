alter table public.networking_leads
  add column if not exists consent_version text,
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists retention_expires_at timestamptz;

alter table public.networking_leads
  drop constraint if exists networking_leads_consent_record_check;

alter table public.networking_leads
  add constraint networking_leads_consent_record_check
  check (
    (consent_version is null and consent_accepted_at is null)
    or (
      consent_version ~ '^NETWORKING_CONTACT_PRIVACY_V[1-9][0-9]*$'
      and consent_accepted_at is not null
    )
  );

alter table public.networking_leads
  alter column retention_expires_at set default (now() + interval '180 days');

update public.networking_leads
set retention_expires_at = created_at + interval '180 days'
where retention_expires_at is null;

create index if not exists networking_leads_retention_expiry_idx
  on public.networking_leads (retention_expires_at)
  where retention_expires_at is not null;

create or replace function public.purge_expired_networking_leads(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer := 0;
begin
  if p_limit < 1 or p_limit > 5000 then
    raise exception 'INVALID_RETENTION_PURGE_LIMIT';
  end if;

  with candidates as (
    select id
    from public.networking_leads
    where retention_expires_at is not null
      and retention_expires_at <= now()
    order by retention_expires_at asc
    limit p_limit
    for update skip locked
  ), deleted as (
    delete from public.networking_leads leads
    using candidates
    where leads.id = candidates.id
    returning leads.id
  )
  select count(*) into v_deleted from deleted;

  return jsonb_build_object('deleted', v_deleted);
end;
$$;

revoke all on function public.purge_expired_networking_leads(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_networking_leads(integer) to service_role;

comment on column public.networking_leads.consent_version is
  'Versioned affirmative notice accepted before a public contact form lead is shared.';
comment on column public.networking_leads.retention_expires_at is
  'Public networking lead data is deleted after the declared retention period.';
