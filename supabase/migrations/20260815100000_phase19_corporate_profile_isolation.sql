-- Phase 19: QA hardening — bind corporate profiles to an organization.
-- Prevents employee offboarding in one company from suspending unrelated
-- personal/other-organization Yenomi profiles owned by the same auth user.

alter table public.card_profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists card_profiles_organization_id_idx
  on public.card_profiles(organization_id);

-- Conservative backfill from physical-card ownership, which is an explicit
-- organization/profile relationship. Only profiles with a single unambiguous
-- organization are filled.
with mapped as (
  select owner_profile_id as profile_id, (array_agg(organization_id))[1] as organization_id
  from public.physical_cards
  where owner_profile_id is not null and organization_id is not null
  group by owner_profile_id
  having count(distinct organization_id)=1
)
update public.card_profiles cp
set organization_id=m.organization_id
from mapped m
where cp.id=m.profile_id and cp.organization_id is null;

-- Identity-change logs also provide an explicit organization/profile relation
-- for corporate digital cards created before a physical card was assigned.
with mapped as (
  select profile_id, (array_agg(organization_id))[1] as organization_id
  from public.member_identity_change_log
  where profile_id is not null and organization_id is not null
  group by profile_id
  having count(distinct organization_id)=1
)
update public.card_profiles cp
set organization_id=m.organization_id
from mapped m
where cp.id=m.profile_id and cp.organization_id is null;

create or replace function public.save_own_card_profile(
  p_user_id uuid, p_profile_id uuid, p_organization_id uuid, p_patch jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_member public.organization_members%rowtype;
  v_template public.organization_card_templates%rowtype;
  v_org public.organizations%rowtype;
  v_fields jsonb := '{}'::jsonb;
  v_existing public.card_profiles%rowtype;
  v_name text; v_email text; v_role text; v_company text; v_phone text;
  v_catalog_count integer; v_title_ok boolean;
  v_mode_name text; v_mode_email text; v_mode_company text; v_mode_title text; v_mode_phone text;
  v_saved public.card_profiles%rowtype;
begin
  if p_profile_id is not null then
    select * into v_existing from public.card_profiles where id=p_profile_id and user_id=p_user_id for update;
    if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  end if;

  -- Phase 19: organization-bound profiles may only be edited through their
  -- organization context. This prevents an employee from bypassing corporate
  -- field policy by opening the same profile through the individual editor.
  if v_existing.id is not null then
    if v_existing.organization_id is not null and p_organization_id is null then
      return jsonb_build_object('ok',false,'code','ORG_CONTEXT_REQUIRED');
    end if;
    if p_organization_id is not null and v_existing.organization_id is not null
       and v_existing.organization_id <> p_organization_id then
      return jsonb_build_object('ok',false,'code','FORBIDDEN');
    end if;
  end if;

  if p_organization_id is not null then
    select * into v_member from public.organization_members
      where organization_id=p_organization_id and user_id=p_user_id and status='ACTIVE';
    if not found then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
    select * into v_org from public.organizations where id=p_organization_id;
    select * into v_template from public.organization_card_templates
      where organization_id=p_organization_id and is_default=true limit 1;
    v_fields := coalesce(v_template.fields,'{}'::jsonb);
  end if;

  v_name := coalesce(nullif(p_patch->>'name',''), v_existing.name);
  v_email := coalesce(nullif(p_patch->>'email',''), v_existing.email);
  v_role := coalesce(nullif(p_patch->>'role',''), v_existing.role);
  v_company := coalesce(nullif(p_patch->>'company',''), v_existing.company);
  v_phone := coalesce(nullif(p_patch->>'phone',''), v_existing.phone);

  if v_member.id is not null then
    v_mode_company := card_field_lock_mode(v_fields,'lockCompany','free');
    v_mode_title := card_field_lock_mode(v_fields,'lockTitle','free');
    v_mode_name := card_field_lock_mode(v_fields,'lockName','suggested');
    v_mode_email := card_field_lock_mode(v_fields,'lockEmail','suggested');
    v_mode_phone := card_field_lock_mode(v_fields,'lockPhone','free');

    -- Şirket adı: kilitliyse şirket kaydı sabit. Öneriyse şirket değeri
    -- yalnızca çalışan kendi değerini vermemişse (veya şirket önerisiyle
    -- aynıysa) uygulanır; çalışanın kendi girdiği farklı bir değer korunur
    -- ve denetim kaydına düşer.
    if v_mode_company = 'locked' then
      v_company := coalesce(v_org.name, v_company);
    elsif v_mode_company = 'suggested' then
      if v_company is null or v_company = '' then
        v_company := v_org.name;
      elsif v_existing.id is not null and v_existing.company is distinct from v_company then
        insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
        values(p_organization_id,v_member.id,v_existing.id,'company',v_existing.company,v_company,p_user_id);
      end if;
    end if;

    -- Ünvan: kilitliyse İK'nın atadığı değer sabittir. Kilit dışındaki her
    -- iki durumda da (free/suggested) şirketin pozisyon kataloğu varsa
    -- yalnız katalogdaki bir değer kabul edilir.
    if v_mode_title = 'locked' then
      v_role := coalesce(v_member.title, v_role);
    else
      select count(*) into v_catalog_count from public.organization_job_titles where organization_id=p_organization_id;
      if v_mode_title = 'suggested' and (v_role is null or v_role = '') then
        v_role := v_member.title;
      end if;
      if v_catalog_count>0 and v_role is not null and v_role<>'' then
        select exists(
          select 1 from public.organization_job_titles
          where organization_id=p_organization_id and title=v_role
        ) into v_title_ok;
        if not v_title_ok then
          return jsonb_build_object('ok',false,'code','TITLE_NOT_IN_CATALOG');
        end if;
      end if;
      if v_mode_title = 'suggested' and v_existing.id is not null and v_existing.role is distinct from v_role then
        insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
        values(p_organization_id,v_member.id,v_existing.id,'title',v_existing.role,v_role,p_user_id);
      end if;
    end if;

    -- Ad Soyad: "suggested" (varsayılan) — engellenmez, değişiklik denetim
    -- kaydına düşer. Kilit açıksa tam kontrol İK'da.
    if v_mode_name = 'locked' then
      v_name := coalesce(v_member.full_name, v_name);
    elsif v_existing.id is not null and v_existing.name is distinct from v_name then
      insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
      values(p_organization_id,v_member.id,v_existing.id,'name',v_existing.name,v_name,p_user_id);
    end if;

    -- E-posta: aynı mantık.
    if v_mode_email = 'locked' then
      v_email := coalesce(v_member.email, v_email);
    elsif v_existing.id is not null and v_existing.email is distinct from v_email then
      insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
      values(p_organization_id,v_member.id,v_existing.id,'email',v_existing.email,v_email,p_user_id);
    end if;

    -- Telefon: kilitliyse şirket telefonu sabittir. Öneriyse şirket
    -- numarası yalnızca çalışan kendi numarasını girmemişse uygulanır.
    if v_mode_phone = 'locked' then
      v_phone := coalesce(nullif(v_fields->>'phone',''), v_phone);
    elsif v_mode_phone = 'suggested' then
      if v_phone is null or v_phone = '' then
        v_phone := nullif(v_fields->>'phone','');
      elsif v_existing.id is not null and v_existing.phone is distinct from v_phone then
        insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
        values(p_organization_id,v_member.id,v_existing.id,'phone',v_existing.phone,v_phone,p_user_id);
      end if;
    end if;
  end if;

  if p_profile_id is not null then
    update public.card_profiles set
      organization_id=coalesce(organization_id,p_organization_id),
      name=v_name, role=v_role, company=v_company, phone=v_phone,
      whatsapp=coalesce(nullif(p_patch->>'whatsapp',''), whatsapp),
      email=v_email,
      website=coalesce(nullif(p_patch->>'website',''), website),
      linkedin=coalesce(nullif(p_patch->>'linkedin',''), linkedin),
      instagram=coalesce(nullif(p_patch->>'instagram',''), instagram),
      location=coalesce(nullif(p_patch->>'location',''), location),
      image_url=coalesce(nullif(p_patch->>'image_url',''), image_url),
      bio=case when p_patch ? 'bio' then nullif(p_patch->>'bio','') else bio end,
      slug=coalesce(nullif(p_patch->>'slug',''), slug),
      is_published=coalesce((p_patch->>'is_published')::boolean, is_published)
    where id=p_profile_id
    returning * into v_saved;
  else
    insert into public.card_profiles(
      user_id, organization_id, entitlement_id, slug, name, role, company, phone, whatsapp, email,
      website, linkedin, instagram, location, image_url, bio, is_published
    ) values(
      p_user_id,
      p_organization_id,
      nullif(p_patch->>'entitlement_id','')::uuid,
      p_patch->>'slug', v_name, v_role, v_company, v_phone,
      nullif(p_patch->>'whatsapp',''), v_email,
      nullif(p_patch->>'website',''), nullif(p_patch->>'linkedin',''),
      nullif(p_patch->>'instagram',''), nullif(p_patch->>'location',''),
      nullif(p_patch->>'image_url',''), nullif(p_patch->>'bio',''), coalesce((p_patch->>'is_published')::boolean,false)
    ) returning * into v_saved;
  end if;

  return jsonb_build_object('ok',true,'profile',to_jsonb(v_saved));
exception when unique_violation then return jsonb_build_object('ok',false,'code','SLUG_TAKEN');
end; $$;


revoke all on function public.save_own_card_profile(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_own_card_profile(uuid,uuid,uuid,jsonb) to service_role;

-- Re-scope lifecycle mutations to organization-bound profiles only.
create or replace function public.change_organization_member_status(
  p_actor_user_id uuid,p_organization_id uuid,p_member_id uuid,p_status text,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.organization_members%rowtype; v_member public.organization_members%rowtype;
        v_actor_rank integer; v_target_rank integer;
begin
  select * into v_actor from public.organization_members where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE' for update;
  select * into v_member from public.organization_members where id=p_member_id and organization_id=p_organization_id for update;
  if not found then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_actor.id is null then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if v_member.user_id=p_actor_user_id or v_member.role='OWNER' then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  v_actor_rank:=case v_actor.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  v_target_rank:=case v_member.role when 'OWNER' then 5 when 'ADMIN' then 4 when 'HR' then 3 when 'DEPARTMENT_MANAGER' then 2 else 1 end;
  if v_actor_rank<=v_target_rank then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  if p_status not in('ACTIVE','SUSPENDED','LEFT') then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status='LEFT' or (v_member.status='INVITED' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='ACTIVE' and p_status not in('SUSPENDED','LEFT')) or
     (v_member.status='SUSPENDED' and p_status not in('ACTIVE','LEFT'))
  then return jsonb_build_object('ok',false,'code','INVALID_TRANSITION'); end if;
  if v_member.status=p_status then return jsonb_build_object('ok',true,'unchanged',true); end if;

  update public.organization_members set status=p_status where id=v_member.id;
  if v_member.user_id is not null then
    if p_status in ('SUSPENDED','LEFT') then
      update public.card_profiles set card_status='SUSPENDED'
       where user_id=v_member.user_id and organization_id=p_organization_id
         and card_status in ('ACTIVE','LOST');
      update public.physical_cards set status='DISABLED'
       where owner_user_id=v_member.user_id and organization_id=p_organization_id and status in ('ACTIVE','LOST');
    elsif p_status='ACTIVE' and v_member.status='SUSPENDED' then
      update public.card_profiles set card_status='ACTIVE'
       where user_id=v_member.user_id and organization_id=p_organization_id
         and card_status='SUSPENDED'
         and (service_expires_at is null or service_expires_at > now());
      -- Physical cards intentionally stay disabled: manager reactivation is explicit.
    end if;
  end if;
  insert into public.organization_member_status_history(organization_id,member_id,actor_user_id,from_status,to_status,reason)
  values(p_organization_id,v_member.id,p_actor_user_id,v_member.status,p_status,nullif(trim(p_reason),''));
  return jsonb_build_object('ok',true,'member_id',v_member.id,'status',p_status);
end; $$;
revoke all on function public.change_organization_member_status(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_organization_member_status(uuid,uuid,uuid,text,text) to service_role;
