-- v23.4: production security, legal evidence and enterprise mutation foundation.

create table if not exists public.commerce_order_consents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commerce_orders(id) on delete cascade,
  distance_sales_accepted boolean not null check (distance_sales_accepted),
  personalization_accepted boolean not null check (personalization_accepted),
  distance_sales_version text not null,
  personalization_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  accepted_ip text,
  request_id text
);
alter table public.commerce_order_consents enable row level security;
drop policy if exists "Users can read own commerce consents" on public.commerce_order_consents;
create policy "Users can read own commerce consents"
on public.commerce_order_consents for select to authenticated
using (exists(select 1 from public.commerce_orders o where o.id=order_id and o.user_id=auth.uid()));

-- Published rows must not make the base table enumerable by anon clients.
drop policy if exists "Profiles are publicly readable when published" on public.card_profiles;
drop policy if exists "Users can read own profiles" on public.card_profiles;
create policy "Users can read own profiles"
on public.card_profiles for select to authenticated
using (auth.uid() = user_id);

-- Ensure public_id exists before the public profile RPC is created.
-- A later timestamped migration (20260806231500_public_profile_ids.sql)
-- also hardens this column; this bootstrap keeps the legacy 001..021 chain
-- replayable from an empty database / shadow database.
alter table public.card_profiles
  add column if not exists public_id text;

update public.card_profiles
set public_id = left(replace(gen_random_uuid()::text, '-', ''), 20)
where public_id is null or btrim(public_id) = '';

alter table public.card_profiles
  alter column public_id set default left(replace(gen_random_uuid()::text, '-', ''), 20);

alter table public.card_profiles
  alter column public_id set not null;

create unique index if not exists card_profiles_public_id_uidx
  on public.card_profiles(public_id);

create or replace function public.get_public_card_profile(
  p_slug text default null,
  p_public_id text default null
) returns table(
  id uuid, slug text, public_id text, name text, role text, company text,
  phone text, whatsapp text, email text, website text, linkedin text,
  instagram text, location text, image_url text, is_published boolean,
  card_status text, service_started_at timestamptz,
  service_expires_at timestamptz, grace_ends_at timestamptz
)
language sql stable security definer set search_path=public,pg_temp
as $$
  select cp.id,cp.slug,cp.public_id,cp.name,cp.role,cp.company,
         cp.phone,cp.whatsapp,cp.email,cp.website,cp.linkedin,
         cp.instagram,cp.location,cp.image_url,cp.is_published,
         cp.card_status,cp.service_started_at,cp.service_expires_at,cp.grace_ends_at
  from public.card_profiles cp
  where cp.is_published=true
    and ((p_public_id is not null and cp.public_id=p_public_id)
      or (p_public_id is null and p_slug is not null and cp.slug=p_slug))
  limit 1;
$$;
revoke all on function public.get_public_card_profile(text,text) from public;
grant execute on function public.get_public_card_profile(text,text) to anon,authenticated,service_role;

-- Current account-first checkout receives the same 365+7 contract as legacy claim.
create or replace function public.finalize_authenticated_commerce_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_order public.commerce_orders%rowtype; v_now timestamptz:=now();
begin
  select * into v_order from public.commerce_orders where id=p_order_id for update;
  if not found or v_order.status<>'PAID' then return jsonb_build_object('ok',false,'code','ORDER_NOT_PAID'); end if;
  if v_order.user_id is null then return jsonb_build_object('ok',false,'code','ACCOUNT_REQUIRED'); end if;
  update public.commerce_orders set activation_claimed_at=coalesce(activation_claimed_at,v_now),updated_at=v_now where id=v_order.id;
  update public.entitlements e
  set user_id=v_order.user_id,status='ACTIVE',starts_at=coalesce(e.starts_at,v_now),
      expires_at=coalesce(e.expires_at,v_now+interval '365 days'),
      grace_ends_at=coalesce(e.grace_ends_at,v_now+interval '372 days')
  where e.order_item_id in(select i.id from public.commerce_order_items i where i.order_id=v_order.id);
  update public.activation_tokens set invalidated_at=coalesce(invalidated_at,v_now) where order_id=v_order.id and used_at is null;
  return jsonb_build_object('ok',true,'order_id',v_order.id,'user_id',v_order.user_id);
end; $$;
revoke all on function public.finalize_authenticated_commerce_order(uuid) from public,anon,authenticated;
grant execute on function public.finalize_authenticated_commerce_order(uuid) to service_role;

create or replace function public.sync_entitlement_to_profiles()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  update public.card_profiles set service_started_at=new.starts_at,
    service_expires_at=new.expires_at,grace_ends_at=new.grace_ends_at
  where entitlement_id=new.id;
  return new;
end; $$;
drop trigger if exists entitlements_profile_window_sync on public.entitlements;
create trigger entitlements_profile_window_sync
after update of starts_at,expires_at,grace_ends_at on public.entitlements
for each row execute function public.sync_entitlement_to_profiles();

alter table public.organization_invites
  add column if not exists last_sent_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists invited_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists send_count integer not null default 1 check(send_count>=1);

create unique index if not exists organization_members_org_email_ci_uidx
on public.organization_members(organization_id,lower(email));

create table if not exists public.organization_member_status_history(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.organization_member_status_history enable row level security;
drop policy if exists "Managers can read member status history" on public.organization_member_status_history;
create policy "Managers can read member status history"
on public.organization_member_status_history for select to authenticated
using(public.is_active_organization_member(organization_id,array['OWNER','ADMIN','HR']));

create or replace function public.reserve_organization_invitation(
  p_actor_user_id uuid,p_organization_id uuid,p_email text,p_full_name text,
  p_title text,p_department text,p_role text,p_token_hash text,p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor_role text; v_subscription public.organization_subscriptions%rowtype;
        v_count integer; v_member public.organization_members%rowtype;
begin
  select role into v_actor_role from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  if v_actor_role is null or p_role='OWNER' or
     (v_actor_role='ADMIN' and p_role='ADMIN') or
     (v_actor_role='HR' and p_role<>'EMPLOYEE') or v_actor_role='EMPLOYEE'
  then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select * into v_subscription from public.organization_subscriptions
   where organization_id=p_organization_id and status in('ACTIVE','GRACE_PERIOD')
   order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('ok',false,'code','NO_SUBSCRIPTION'); end if;
  select count(*) into v_count from public.organization_members
   where organization_id=p_organization_id and status in('INVITED','ACTIVE');
  if v_count>=v_subscription.seat_limit then return jsonb_build_object('ok',false,'code','SEAT_LIMIT'); end if;
  insert into public.organization_members(organization_id,email,full_name,title,department,role,status)
  values(p_organization_id,lower(trim(p_email)),p_full_name,nullif(p_title,''),nullif(p_department,''),p_role,'INVITED')
  returning * into v_member;
  insert into public.organization_invites(organization_id,member_id,token_hash,expires_at,last_sent_at,invited_by_user_id)
  values(p_organization_id,v_member.id,p_token_hash,p_expires_at,now(),p_actor_user_id);
  return jsonb_build_object('ok',true,'member',to_jsonb(v_member));
exception when unique_violation then return jsonb_build_object('ok',false,'code','DUPLICATE');
end; $$;
revoke all on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reserve_organization_invitation(uuid,uuid,text,text,text,text,text,text,timestamptz) to service_role;

create or replace function public.set_default_organization_template(
  p_actor_user_id uuid,p_organization_id uuid,p_name text,p_primary_color text,p_logo_url text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_template public.organization_card_templates%rowtype;
begin
  perform 1 from public.organizations where id=p_organization_id for update;
  select role into v_role from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE';
  if v_role not in('OWNER','ADMIN') then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  update public.organization_card_templates set is_default=false,updated_at=now()
   where organization_id=p_organization_id and is_default=true;
  insert into public.organization_card_templates(organization_id,name,primary_color,logo_url,is_default)
  values(p_organization_id,p_name,p_primary_color,nullif(p_logo_url,''),true) returning * into v_template;
  return jsonb_build_object('ok',true,'template',to_jsonb(v_template));
end; $$;
revoke all on function public.set_default_organization_template(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.set_default_organization_template(uuid,uuid,text,text,text) to service_role;

create or replace function public.change_organization_member_status(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,p_status text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_actor_rank integer; v_target_rank integer;
begin
  select * into v_actor from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members
   where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_member.user_id=p_actor_user_id or v_member.role='OWNER' then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 4 when 'ADMIN' then 3 when 'HR' then 2 else 1 end;
  if v_actor_rank<=v_target_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if p_status not in('ACTIVE','SUSPENDED','LEFT') then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status='LEFT' or
     (v_member.status='INVITED' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='ACTIVE' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='SUSPENDED' and p_status not in('ACTIVE','LEFT'))
  then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status=p_status then return jsonb_build_object('ok',true,'unchanged',true); end if;
  update public.organization_members set status=p_status where id=v_member.id;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,v_member.status,p_status,nullif(trim(p_reason),''));
  return jsonb_build_object('ok',true,'member_id',v_member.id,'status',p_status);
end; $$;
revoke all on function public.change_organization_member_status(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_organization_member_status(uuid,uuid,uuid,text,text) to service_role;
