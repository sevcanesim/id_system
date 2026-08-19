-- v25.8.6 — Alan kilitleri: ikili (kilitli/serbest) yerine üçlü durum
--
-- Ayarlar panelindeki "Çalışan alan kilitleri" artık üç durum sunuyor:
--   'free'      — çalışan serbestçe girer, şirketten öneri yok
--   'suggested' — şirket bir başlangıç değeri verir, çalışan üzerine
--                 yazabilir; değişiklik member_identity_change_log'a düşer
--   'locked'    — şirket değeri sabittir, save_own_card_profile her
--                 zaman şirket/İK kaydındaki değerle ezer
--
-- Önceki sürümde bu alanlar boolean'dı (true=kilitli, false=serbest) ve
-- Ad Soyad/E-posta için "sınırlı" (serbest ama denetim kaydı düşen) davranış
-- kod içinde sabit kodlanmıştı. Bu migration:
--   1) member_identity_change_log.field kısıtını "company"/"title"/"phone"
--      alanlarını da kapsayacak şekilde genişletir (artık her alan "suggested"
--      durumundayken denetim kaydı üretebilir, sadece ad/e-posta değil).
--   2) save_own_card_profile'ı organization_card_templates.fields içindeki
--      lock* değerlerini tri-state string olarak okuyacak şekilde günceller;
--      eski boolean değerleri de geriye dönük destekler (true→'locked',
--      false→'free') böylece mevcut kayıtlar için ayrı bir veri taşıma
--      migration'ı gerekmez.

alter table public.member_identity_change_log drop constraint if exists member_identity_change_log_field_check;
alter table public.member_identity_change_log add constraint member_identity_change_log_field_check
  check (field in ('name','email','company','title','phone'));

-- Bir alanın kilit modunu normalize eder. Eski boolean kayıtları ve yeni
-- tri-state string kayıtlarını tek bir çıktıya indirger.
create or replace function public.card_field_lock_mode(p_fields jsonb, p_key text, p_default text)
returns text language sql immutable as $$
  select case
    when (p_fields->p_key) = 'true'::jsonb then 'locked'
    when (p_fields->p_key) = 'false'::jsonb then 'free'
    when p_fields->>p_key in ('free','suggested','locked') then p_fields->>p_key
    else p_default
  end;
$$;

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
      slug=coalesce(nullif(p_patch->>'slug',''), slug),
      is_published=coalesce((p_patch->>'is_published')::boolean, is_published)
    where id=p_profile_id
    returning * into v_saved;
  else
    insert into public.card_profiles(
      user_id, entitlement_id, slug, name, role, company, phone, whatsapp, email,
      website, linkedin, instagram, location, image_url, is_published
    ) values(
      p_user_id,
      nullif(p_patch->>'entitlement_id','')::uuid,
      p_patch->>'slug', v_name, v_role, v_company, v_phone,
      nullif(p_patch->>'whatsapp',''), v_email,
      nullif(p_patch->>'website',''), nullif(p_patch->>'linkedin',''),
      nullif(p_patch->>'instagram',''), nullif(p_patch->>'location',''),
      nullif(p_patch->>'image_url',''), coalesce((p_patch->>'is_published')::boolean,false)
    ) returning * into v_saved;
  end if;

  return jsonb_build_object('ok',true,'profile',to_jsonb(v_saved));
exception when unique_violation then return jsonb_build_object('ok',false,'code','SLUG_TAKEN');
end; $$;
revoke all on function public.save_own_card_profile(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_own_card_profile(uuid,uuid,uuid,jsonb) to service_role;

comment on function public.card_field_lock_mode is 'Bir organizasyon şablon alanının kilit modunu normalize eder: eski boolean kayıtları ve yeni free/suggested/locked string değerlerini tek çıktıya indirger.';
comment on function public.save_own_card_profile is 'Kart profili yazma işleminin tek giriş noktası; kurumsal alan kilitlerini (free/suggested/locked) ve ünvan kataloğunu sunucu tarafında zorunlu kılar.';
