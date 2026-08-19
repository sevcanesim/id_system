-- v25.8.19 — Kartım editor biography support
alter table public.card_profiles add column if not exists bio text;

alter table public.card_profiles drop constraint if exists card_profiles_bio_length_check;
alter table public.card_profiles add constraint card_profiles_bio_length_check check (bio is null or char_length(bio) <= 280);

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
      user_id, entitlement_id, slug, name, role, company, phone, whatsapp, email,
      website, linkedin, instagram, location, image_url, bio, is_published
    ) values(
      p_user_id,
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

-- PostgreSQL does not allow CREATE OR REPLACE FUNCTION to change a
-- RETURNS TABLE row type. The previous function did not expose `bio`, so
-- replace the function explicitly before recreating it with the new column.
drop function if exists public.get_public_card_profile(text,text);

create function public.get_public_card_profile(
  p_slug text default null,
  p_public_id text default null
) returns table(
  id uuid, slug text, public_id text, name text, role text, company text,
  phone text, whatsapp text, email text, website text, linkedin text,
  instagram text, location text, image_url text, bio text, is_published boolean,
  card_status text, service_started_at timestamptz,
  service_expires_at timestamptz, grace_ends_at timestamptz
)
language sql stable security definer set search_path=public,pg_temp
as $$
  select cp.id,cp.slug,cp.public_id,cp.name,cp.role,cp.company,
         cp.phone,cp.whatsapp,cp.email,cp.website,cp.linkedin,
         cp.instagram,cp.location,cp.image_url,cp.bio,cp.is_published,
         cp.card_status,cp.service_started_at,cp.service_expires_at,cp.grace_ends_at
  from public.card_profiles cp
  where cp.is_published=true
    and ((p_public_id is not null and cp.public_id=p_public_id)
      or (p_public_id is null and p_slug is not null and cp.slug=p_slug))
  limit 1;
$$;
revoke all on function public.get_public_card_profile(text,text) from public;
grant execute on function public.get_public_card_profile(text,text) to anon,authenticated,service_role;
