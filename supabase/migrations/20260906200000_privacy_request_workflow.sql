create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_accounts(id) on delete restrict,
  request_type text not null check (request_type in ('ACCESS', 'ERASURE')),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'IN_REVIEW', 'IDENTITY_VERIFIED', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  identity_verified_at timestamptz,
  resolved_at timestamptz,
  resolution_code text check (resolution_code is null or resolution_code ~ '^[A-Z0-9_:-]{3,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_user_created_at_idx
  on public.privacy_requests (user_id, created_at desc);

create index if not exists privacy_requests_status_created_at_idx
  on public.privacy_requests (status, created_at asc);

create unique index if not exists privacy_requests_one_open_request_per_type
  on public.privacy_requests (user_id, request_type)
  where status in ('SUBMITTED', 'IN_REVIEW', 'IDENTITY_VERIFIED');

create table if not exists public.privacy_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.privacy_requests(id) on delete cascade,
  actor_role text not null check (actor_role in ('SUBJECT', 'SUPER_ADMIN', 'SYSTEM')),
  actor_user_id uuid references public.user_accounts(id) on delete set null,
  action text not null check (action in ('SUBMITTED', 'STATUS_CHANGED')),
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists privacy_request_events_request_created_at_idx
  on public.privacy_request_events (request_id, created_at asc);

drop trigger if exists privacy_requests_set_updated_at on public.privacy_requests;
create trigger privacy_requests_set_updated_at
before update on public.privacy_requests
for each row execute function public.set_updated_at();

alter table public.privacy_requests enable row level security;
alter table public.privacy_request_events enable row level security;
revoke all on table public.privacy_requests from public, anon, authenticated;
revoke all on table public.privacy_request_events from public, anon, authenticated;
grant all on table public.privacy_requests to service_role;
grant all on table public.privacy_request_events to service_role;

create or replace function public.submit_privacy_request(
  p_user_id uuid,
  p_request_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.privacy_requests%rowtype;
  v_request public.privacy_requests%rowtype;
begin
  if p_request_type not in ('ACCESS', 'ERASURE') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_REQUEST_TYPE');
  end if;

  if not exists (select 1 from public.user_accounts where id = p_user_id) then
    return jsonb_build_object('ok', false, 'code', 'ACCOUNT_NOT_FOUND');
  end if;

  select * into v_existing
  from public.privacy_requests
  where user_id = p_user_id
    and request_type = p_request_type
    and status in ('SUBMITTED', 'IN_REVIEW', 'IDENTITY_VERIFIED')
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'request', to_jsonb(v_existing));
  end if;

  insert into public.privacy_requests (user_id, request_type)
  values (p_user_id, p_request_type)
  returning * into v_request;

  insert into public.privacy_request_events (request_id, actor_role, actor_user_id, action, to_status)
  values (v_request.id, 'SUBJECT', p_user_id, 'SUBMITTED', v_request.status);

  return jsonb_build_object('ok', true, 'duplicate', false, 'request', to_jsonb(v_request));
exception when unique_violation then
  select * into v_existing
  from public.privacy_requests
  where user_id = p_user_id
    and request_type = p_request_type
    and status in ('SUBMITTED', 'IN_REVIEW', 'IDENTITY_VERIFIED')
  order by created_at desc
  limit 1;
  return jsonb_build_object('ok', true, 'duplicate', true, 'request', to_jsonb(v_existing));
end;
$$;

revoke all on function public.submit_privacy_request(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_privacy_request(uuid, text) to service_role;

create or replace function public.admin_transition_privacy_request(
  p_actor_user_id uuid,
  p_request_id uuid,
  p_next_status text,
  p_resolution_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.privacy_requests%rowtype;
  v_before_status text;
  v_resolution_code text;
  v_identity_verified_at timestamptz;
  v_resolved_at timestamptz;
begin
  if not exists (select 1 from public.admin_users where user_id = p_actor_user_id) then
    return jsonb_build_object('ok', false, 'code', 'ADMIN_REQUIRED');
  end if;

  if p_next_status not in ('IN_REVIEW', 'IDENTITY_VERIFIED', 'COMPLETED', 'REJECTED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATUS');
  end if;

  if p_resolution_code is not null and p_resolution_code !~ '^[A-Z0-9_:-]{3,80}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_RESOLUTION_CODE');
  end if;

  select * into v_request
  from public.privacy_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'REQUEST_NOT_FOUND');
  end if;

  v_before_status := v_request.status;
  if (v_request.status = 'SUBMITTED' and p_next_status not in ('IN_REVIEW', 'CANCELLED'))
    or (v_request.status = 'IN_REVIEW' and p_next_status not in ('IDENTITY_VERIFIED', 'REJECTED', 'CANCELLED'))
    or (v_request.status = 'IDENTITY_VERIFIED' and p_next_status not in ('COMPLETED', 'REJECTED', 'CANCELLED'))
    or v_request.status in ('COMPLETED', 'REJECTED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'current', v_request.status);
  end if;

  if p_next_status in ('COMPLETED', 'REJECTED') and p_resolution_code is null then
    return jsonb_build_object('ok', false, 'code', 'RESOLUTION_CODE_REQUIRED');
  end if;

  v_identity_verified_at := case when p_next_status = 'IDENTITY_VERIFIED' then now() else v_request.identity_verified_at end;
  v_resolved_at := case when p_next_status in ('COMPLETED', 'REJECTED', 'CANCELLED') then now() else null end;
  v_resolution_code := case when p_next_status in ('COMPLETED', 'REJECTED') then p_resolution_code else null end;

  update public.privacy_requests
  set status = p_next_status,
      identity_verified_at = v_identity_verified_at,
      resolved_at = v_resolved_at,
      resolution_code = v_resolution_code
  where id = p_request_id
  returning * into v_request;

  insert into public.privacy_request_events (request_id, actor_role, actor_user_id, action, from_status, to_status, metadata)
  values (
    v_request.id,
    'SUPER_ADMIN',
    p_actor_user_id,
    'STATUS_CHANGED',
    v_before_status,
    v_request.status,
    case when v_resolution_code is null then '{}'::jsonb else jsonb_build_object('resolution_code', v_resolution_code) end
  );

  insert into public.admin_audit_log (actor_user_id, action, target_table, target_id, before_value, after_value)
  values (
    p_actor_user_id,
    'PRIVACY_REQUEST_STATUS_CHANGED',
    'privacy_requests',
    v_request.id::text,
    jsonb_build_object('status', v_before_status),
    jsonb_build_object('status', v_request.status, 'request_type', v_request.request_type, 'resolution_code', v_resolution_code)
  );

  return jsonb_build_object('ok', true, 'request', to_jsonb(v_request));
end;
$$;

revoke all on function public.admin_transition_privacy_request(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_transition_privacy_request(uuid, uuid, text, text) to service_role;
