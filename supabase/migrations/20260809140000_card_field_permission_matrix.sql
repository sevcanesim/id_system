-- v25.8.4 — Alan bazlı yetki matrisi sunucu tarafı zorlaması
--
-- Denetim bulgusu: `card_profiles` satırına yazma işlemi (kartvizit
-- oluşturma/düzenleme) tarayıcıdan doğrudan `card_profiles` tablosuna
-- yapılıyordu. RLS yalnızca satır sahipliğini (`user_id = auth.uid()`)
-- kontrol ediyor; şirketin Ayarlar panelinden kilitlediği alanlar
-- (Şirket adı, Ünvan, Kurumsal e-posta, Kurumsal telefon) yalnızca
-- istemci tarafında `disabled` olarak işaretleniyordu. Bir çalışan,
-- tarayıcı geliştirici araçlarından veya doğrudan Supabase REST
-- isteğiyle bu kısıtlamayı atlayıp kilitli alanları değiştirebilirdi.
--
-- Bu migration üç şeyi ekler:
--  1) `organization_job_titles` — şirketin gerçek pozisyon kataloğu.
--     Ünvan artık serbest metin değil, bu katalogdan seçilir.
--  2) `member_title_requests` — kataloğunda olmayan bir ünvan isteyen
--     çalışanın talebi; İK/Yönetici onaylar/reddeder.
--  3) `member_identity_change_log` — kilitli olmayan Ad Soyad / E-posta
--     alanlarında yapılan her değişikliğin şeffaf denetim kaydı
--     ("sınırlı" = engellenmiyor ama İK görünürlüğünde).
--  4) `save_own_card_profile` — kart profili yazma işleminin tek giriş
--     noktası. SECURITY DEFINER, yalnız service_role'e açık (diğer tüm
--     kurumsal RPC'lerle aynı desen); şirket kilitlerini ve ünvan
--     kataloğunu sunucu tarafında zorlar, istemci ne gönderirse
--     göndersin kilitli alanları şirketin kayıtlı değeriyle ezer.

create table if not exists public.organization_job_titles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(organization_id, title)
);
alter table public.organization_job_titles enable row level security;
drop policy if exists "Members can read job titles" on public.organization_job_titles;
create policy "Members can read job titles" on public.organization_job_titles
for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE'));

create table if not exists public.member_title_requests(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  requested_title text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create index if not exists member_title_requests_org_status_idx on public.member_title_requests(organization_id,status);
alter table public.member_title_requests enable row level security;
drop policy if exists "Managers can read title requests" on public.member_title_requests;
create policy "Managers can read title requests" on public.member_title_requests
for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE' and m.role in('OWNER','ADMIN','HR','DEPARTMENT_MANAGER')));

create table if not exists public.member_identity_change_log(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.organization_members(id) on delete cascade,
  profile_id uuid references public.card_profiles(id) on delete set null,
  field text not null check (field in ('name','email')),
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists member_identity_change_log_member_idx on public.member_identity_change_log(member_id, changed_at desc);
alter table public.member_identity_change_log enable row level security;
drop policy if exists "Managers can read identity change log" on public.member_identity_change_log;
create policy "Managers can read identity change log" on public.member_identity_change_log
for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.user_id=auth.uid() and m.status='ACTIVE' and m.role in('OWNER','ADMIN','HR','DEPARTMENT_MANAGER')));

-- Tek yazma noktası: bireysel kullanıcılar için düz sahiplik kontrolü,
-- kurumsal çalışanlar için şirketin Ayarlar panelindeki kilitleri ve
-- ünvan kataloğunu zorunlu kılar. `p_organization_id` verilmezse (veya
-- çağıran o şirkette aktif üye değilse) kurumsal kısıtlar uygulanmaz —
-- bireysel kartlar bu fonksiyondan etkilenmez.
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
    -- Şirket adı: kilitliyse şirket kaydı, değilse çalışanın girdiği değer.
    if coalesce((v_fields->>'lockCompany')::boolean,false) then
      v_company := coalesce(v_org.name, v_company);
    end if;

    -- Ünvan: kilitliyse İK'nın atadığı değer sabittir. Kilit kapalıyken
    -- de serbest metin değil — şirketin pozisyon kataloğu varsa yalnız
    -- katalogdaki bir değer kabul edilir; katalogda yoksa istemci
    -- `TITLE_NOT_IN_CATALOG` alıp "talep et" akışına yönlendirilmeli.
    if coalesce((v_fields->>'lockTitle')::boolean,false) then
      v_role := coalesce(v_member.title, v_role);
    else
      select count(*) into v_catalog_count from public.organization_job_titles where organization_id=p_organization_id;
      if v_catalog_count>0 and v_role is not null and v_role<>'' then
        select exists(
          select 1 from public.organization_job_titles
          where organization_id=p_organization_id and title=v_role
        ) into v_title_ok;
        if not v_title_ok then
          return jsonb_build_object('ok',false,'code','TITLE_NOT_IN_CATALOG');
        end if;
      end if;
    end if;

    -- Ad Soyad: "sınırlı" — engellenmez, ama değişiklik denetim
    -- kaydına düşer. Kilit açıksa (lockName) tam kontrol İK'da.
    if coalesce((v_fields->>'lockName')::boolean,false) then
      v_name := coalesce(v_member.full_name, v_name);
    elsif v_existing.id is not null and v_existing.name is distinct from v_name then
      insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
      values(p_organization_id,v_member.id,v_existing.id,'name',v_existing.name,v_name,p_user_id);
    end if;

    -- E-posta: aynı "sınırlı" mantığı.
    if coalesce((v_fields->>'lockEmail')::boolean,false) then
      v_email := coalesce(v_member.email, v_email);
    elsif v_existing.id is not null and v_existing.email is distinct from v_email then
      insert into public.member_identity_change_log(organization_id,member_id,profile_id,field,old_value,new_value,changed_by)
      values(p_organization_id,v_member.id,v_existing.id,'email',v_existing.email,v_email,p_user_id);
    end if;

    -- Telefon: kilitliyse şirket telefonu sabittir.
    if coalesce((v_fields->>'lockPhone')::boolean,false) then
      v_phone := coalesce(nullif(v_fields->>'phone',''), v_phone);
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

-- Talep onaylandığında: İK/Yönetici hem çalışanın kaydını hem de o
-- kartın ünvanını günceller, yeni pozisyon otomatik olarak kataloğa
-- eklenir (bir sonraki çalışan artık aynı talebi tekrar açmaz).
create or replace function public.resolve_member_title_request(
  p_actor_user_id uuid, p_request_id uuid, p_approve boolean, p_note text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_request public.member_title_requests%rowtype;
  v_actor public.organization_members%rowtype;
  v_member public.organization_members%rowtype;
begin
  select * into v_request from public.member_title_requests where id=p_request_id for update;
  if not found or v_request.status<>'PENDING' then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  select * into v_actor from public.organization_members
    where organization_id=v_request.organization_id and user_id=p_actor_user_id and status='ACTIVE';
  if not found or v_actor.role not in('OWNER','ADMIN','HR','DEPARTMENT_MANAGER') then
    return jsonb_build_object('ok',false,'code','FORBIDDEN');
  end if;
  select * into v_member from public.organization_members where id=v_request.member_id for update;
  if v_actor.role='DEPARTMENT_MANAGER' and (v_actor.department is null or v_actor.department<>v_member.department) then
    return jsonb_build_object('ok',false,'code','FORBIDDEN');
  end if;

  if p_approve then
    insert into public.organization_job_titles(organization_id,title,created_by)
    values(v_request.organization_id,v_request.requested_title,p_actor_user_id)
    on conflict(organization_id,title) do nothing;
    update public.organization_members set title=v_request.requested_title where id=v_member.id;
    update public.card_profiles set role=v_request.requested_title
      where user_id=v_member.user_id and user_id is not null;
    update public.member_title_requests set status='APPROVED', resolved_at=now(), resolved_by=p_actor_user_id, note=p_note where id=p_request_id;
  else
    update public.member_title_requests set status='REJECTED', resolved_at=now(), resolved_by=p_actor_user_id, note=p_note where id=p_request_id;
  end if;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.resolve_member_title_request(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.resolve_member_title_request(uuid,uuid,boolean,text) to service_role;

comment on table public.organization_job_titles is 'Şirketin gerçek pozisyon kataloğu; çalışan Ünvan alanı yalnızca buradan seçilir.';
comment on table public.member_title_requests is 'Kataloğunda olmayan bir ünvan isteyen çalışanların İK/Yönetici onayı bekleyen talepleri.';
comment on table public.member_identity_change_log is 'Kilitli olmayan Ad Soyad / E-posta değişikliklerinin İK''ya görünür denetim kaydı.';
comment on function public.save_own_card_profile is 'Kart profili yazma işleminin tek giriş noktası; kurumsal alan kilitlerini ve ünvan kataloğunu sunucu tarafında zorunlu kılar.';
