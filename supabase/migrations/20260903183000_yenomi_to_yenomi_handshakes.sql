-- A Yenomi-to-Yenomi connection is a bilateral, idempotent exchange of two
-- already-public profiles. The RPC is the only writer: browser input never
-- supplies contact data and cannot create a half-completed exchange.

alter table public.networking_leads
  add column if not exists counterpart_profile_id uuid references public.card_profiles(id) on delete set null;

create index if not exists networking_leads_counterpart_profile_idx
  on public.networking_leads (counterpart_profile_id)
  where counterpart_profile_id is not null;

create table if not exists public.networking_handshakes (
  id uuid primary key default gen_random_uuid(),
  profile_a_id uuid not null references public.card_profiles(id) on delete cascade,
  profile_b_id uuid not null references public.card_profiles(id) on delete cascade,
  initiated_by_profile_id uuid not null references public.card_profiles(id) on delete cascade,
  target_profile_id uuid not null references public.card_profiles(id) on delete cascade,
  source text not null check (source in ('QR', 'NFC', 'EVENT', 'SHARE')),
  event_id uuid references public.networking_events(id) on delete set null,
  event_link_id uuid references public.networking_event_links(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint networking_handshakes_distinct_profiles check (profile_a_id <> profile_b_id),
  constraint networking_handshakes_profile_order check (profile_a_id < profile_b_id),
  constraint networking_handshakes_pair_unique unique (profile_a_id, profile_b_id)
);

alter table public.networking_handshakes enable row level security;
revoke all on table public.networking_handshakes from anon, authenticated;
grant all on table public.networking_handshakes to service_role;

create or replace function public.create_yenomi_handshake(
  p_source_profile_id uuid,
  p_target_profile_id uuid,
  p_source text,
  p_locale text default 'tr',
  p_event_id uuid default null,
  p_event_link_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_profile public.card_profiles%rowtype;
  v_target_profile public.card_profiles%rowtype;
  v_profile_a_id uuid;
  v_profile_b_id uuid;
  v_handshake_id uuid;
  v_target_lead_id uuid;
  v_source_lead_id uuid;
  v_scan_event text;
  v_locale text := case when p_locale = 'en' then 'en' else 'tr' end;
begin
  if p_source_profile_id is null or p_target_profile_id is null then
    return jsonb_build_object('ok', false, 'code', 'TARGET_PROFILE_NOT_FOUND');
  end if;

  if p_source not in ('QR', 'NFC', 'EVENT', 'SHARE') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_SOURCE');
  end if;

  select * into v_source_profile
  from public.card_profiles
  where id = p_source_profile_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'SOURCE_PROFILE_NOT_FOUND');
  end if;

  select * into v_target_profile
  from public.card_profiles
  where id = p_target_profile_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'TARGET_PROFILE_NOT_FOUND');
  end if;

  if v_source_profile.id = v_target_profile.id or v_source_profile.user_id = v_target_profile.user_id then
    return jsonb_build_object('ok', false, 'code', 'SELF_CONNECTION');
  end if;

  if not (
    v_source_profile.is_published
    and v_source_profile.card_status = 'ACTIVE'
    and (
      v_source_profile.service_expires_at is null
      or v_source_profile.service_expires_at > now()
      or (v_source_profile.grace_ends_at is not null and v_source_profile.grace_ends_at > now())
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'SOURCE_PROFILE_UNAVAILABLE');
  end if;

  if not (
    v_target_profile.is_published
    and v_target_profile.card_status = 'ACTIVE'
    and (
      v_target_profile.service_expires_at is null
      or v_target_profile.service_expires_at > now()
      or (v_target_profile.grace_ends_at is not null and v_target_profile.grace_ends_at > now())
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'TARGET_PROFILE_UNAVAILABLE');
  end if;

  if coalesce(btrim(v_source_profile.email), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'SOURCE_EMAIL_REQUIRED');
  end if;

  if coalesce(btrim(v_target_profile.email), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'TARGET_EMAIL_REQUIRED');
  end if;

  if p_event_id is not null and (
    p_event_link_id is null
    or not exists (
      select 1
      from public.networking_event_links
      where id = p_event_link_id
        and event_id = p_event_id
        and profile_id = v_target_profile.id
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_EVENT_CONTEXT');
  end if;

  v_profile_a_id := least(v_source_profile.id, v_target_profile.id);
  v_profile_b_id := greatest(v_source_profile.id, v_target_profile.id);
  v_scan_event := case when p_source = 'NFC' then 'NFC_TAP' else 'QR_SCAN' end;

  insert into public.networking_handshakes (
    profile_a_id,
    profile_b_id,
    initiated_by_profile_id,
    target_profile_id,
    source,
    event_id,
    event_link_id
  ) values (
    v_profile_a_id,
    v_profile_b_id,
    v_source_profile.id,
    v_target_profile.id,
    p_source,
    p_event_id,
    p_event_link_id
  )
  on conflict (profile_a_id, profile_b_id) do nothing
  returning id into v_handshake_id;

  if v_handshake_id is null then
    select id into v_handshake_id
    from public.networking_handshakes
    where profile_a_id = v_profile_a_id and profile_b_id = v_profile_b_id;
    return jsonb_build_object('ok', true, 'created', false, 'handshake_id', v_handshake_id);
  end if;

  insert into public.networking_leads (
    organization_id,
    profile_id,
    counterpart_profile_id,
    visitor_id,
    event_id,
    event_link_id,
    full_name,
    email,
    phone,
    company,
    position,
    city,
    country,
    locale,
    interests,
    intent,
    introduction,
    source,
    status,
    score
  ) values (
    v_target_profile.organization_id,
    v_target_profile.id,
    v_source_profile.id,
    'yenomi:' || v_source_profile.id::text,
    p_event_id,
    p_event_link_id,
    v_source_profile.name,
    lower(btrim(v_source_profile.email)),
    nullif(btrim(v_source_profile.phone), ''),
    nullif(btrim(v_source_profile.company), ''),
    nullif(btrim(v_source_profile.role), ''),
    'Belirtilmedi',
    'Belirtilmedi',
    v_locale,
    '{}',
    null,
    null,
    p_source,
    'NEW',
    25
  ) returning id into v_target_lead_id;

  insert into public.networking_leads (
    organization_id,
    profile_id,
    counterpart_profile_id,
    visitor_id,
    event_id,
    event_link_id,
    full_name,
    email,
    phone,
    company,
    position,
    city,
    country,
    locale,
    interests,
    intent,
    introduction,
    source,
    status,
    score
  ) values (
    v_source_profile.organization_id,
    v_source_profile.id,
    v_target_profile.id,
    'yenomi:' || v_target_profile.id::text,
    p_event_id,
    p_event_link_id,
    v_target_profile.name,
    lower(btrim(v_target_profile.email)),
    nullif(btrim(v_target_profile.phone), ''),
    nullif(btrim(v_target_profile.company), ''),
    nullif(btrim(v_target_profile.role), ''),
    'Belirtilmedi',
    'Belirtilmedi',
    v_locale,
    '{}',
    null,
    null,
    p_source,
    'NEW',
    25
  ) returning id into v_source_lead_id;

  insert into public.networking_lead_events (lead_id, kind, payload) values
    (v_target_lead_id, v_scan_event, jsonb_build_object('source', p_source)),
    (v_target_lead_id, 'CONTACT_SHARED', jsonb_build_object('profile_id', v_source_profile.id)),
    (v_target_lead_id, 'YENOMI_HANDSHAKE', jsonb_build_object('counterpart_profile_id', v_source_profile.id, 'handshake_id', v_handshake_id)),
    (v_source_lead_id, v_scan_event, jsonb_build_object('source', p_source)),
    (v_source_lead_id, 'CONTACT_SHARED', jsonb_build_object('profile_id', v_target_profile.id)),
    (v_source_lead_id, 'YENOMI_HANDSHAKE', jsonb_build_object('counterpart_profile_id', v_target_profile.id, 'handshake_id', v_handshake_id));

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'handshake_id', v_handshake_id,
    'target_lead_id', v_target_lead_id,
    'source_lead_id', v_source_lead_id
  );
end;
$$;

revoke all on function public.create_yenomi_handshake(uuid, uuid, text, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_yenomi_handshake(uuid, uuid, text, text, uuid, uuid) to service_role;
