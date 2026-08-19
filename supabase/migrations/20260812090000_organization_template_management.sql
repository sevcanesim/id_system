-- Kurumsal kart şablonları yönetimi: çoklu şablon desteği.
--
-- organization_card_templates şeması (bkz. 012_org_invites_templates_lifecycle.sql)
-- baştan beri şirket başına birden fazla adlandırılmış şablona izin veriyordu
-- (yalnız aynı anda tek satır is_default=true olabiliyor), ancak tek yazma
-- yolu olan set_default_organization_template HER kayıtta yeni bir satır
-- INSERT edip eskisini pasif bırakıyordu — arayüz de yalnız ilk satırı
-- gösterdiği için hem öksüz satır birikimine hem de "yeni şablon ekle"
-- imkânının hiç sunulamamasına yol açtı.
--
-- Bu migration üç yeni RPC ekliyor:
--   1) update_organization_template   — var olan bir satırı YERİNDE günceller,
--      is_default'a dokunmaz. Mevcut aktif şablonu düzenlerken artık yeni
--      satır oluşmaz.
--   2) activate_organization_template — kopya oluşturmadan iki satır arasında
--      is_default bayrağını taşır ("bu kayıtlı şablonu varsayılan yap").
--   3) delete_organization_template   — varsayılan OLMAYAN bir şablonu siler.
-- set_default_organization_template aynen kalıyor: "yeni bir şablon oluştur
-- ve anında varsayılan yap" akışı için hâlâ doğru araç.

create or replace function public.update_organization_template(
  p_actor_user_id uuid, p_template_id uuid, p_name text, p_primary_color text, p_logo_url text, p_fields jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_org_id uuid; v_template public.organization_card_templates%rowtype;
begin
  select organization_id into v_org_id from public.organization_card_templates where id=p_template_id;
  if v_org_id is null then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  select role into v_role from public.organization_members
   where organization_id=v_org_id and user_id=p_actor_user_id and status='ACTIVE';
  if v_role is null or v_role not in('OWNER','ADMIN') then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  update public.organization_card_templates
     set name=coalesce(nullif(trim(p_name),''), name),
         primary_color=p_primary_color,
         logo_url=nullif(p_logo_url,''),
         fields=coalesce(p_fields, fields),
         updated_at=now()
   where id=p_template_id
   returning * into v_template;
  return jsonb_build_object('ok',true,'template',to_jsonb(v_template));
end; $$;
revoke all on function public.update_organization_template(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.update_organization_template(uuid,uuid,text,text,text,jsonb) to service_role;

create or replace function public.activate_organization_template(
  p_actor_user_id uuid, p_organization_id uuid, p_template_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_belongs boolean; v_template public.organization_card_templates%rowtype;
begin
  select role into v_role from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE';
  if v_role is null or v_role not in('OWNER','ADMIN') then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select exists(
    select 1 from public.organization_card_templates where id=p_template_id and organization_id=p_organization_id
  ) into v_belongs;
  if not v_belongs then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  update public.organization_card_templates set is_default=false, updated_at=now()
   where organization_id=p_organization_id and is_default=true and id<>p_template_id;
  update public.organization_card_templates set is_default=true, updated_at=now()
   where id=p_template_id
   returning * into v_template;
  return jsonb_build_object('ok',true,'template',to_jsonb(v_template));
end; $$;
revoke all on function public.activate_organization_template(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.activate_organization_template(uuid,uuid,uuid) to service_role;

create or replace function public.delete_organization_template(
  p_actor_user_id uuid, p_organization_id uuid, p_template_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_is_default boolean;
begin
  select role into v_role from public.organization_members
   where organization_id=p_organization_id and user_id=p_actor_user_id and status='ACTIVE';
  if v_role is null or v_role not in('OWNER','ADMIN') then return jsonb_build_object('ok',false,'code','FORBIDDEN'); end if;
  select is_default into v_is_default from public.organization_card_templates
   where id=p_template_id and organization_id=p_organization_id;
  if v_is_default is null then return jsonb_build_object('ok',false,'code','NOT_FOUND'); end if;
  if v_is_default then return jsonb_build_object('ok',false,'code','IS_DEFAULT'); end if;
  delete from public.organization_card_templates where id=p_template_id;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.delete_organization_template(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_organization_template(uuid,uuid,uuid) to service_role;

-- Tek seferlik temizlik: v25.8.x'te biriken öksüz (is_default=false) şablon
-- satırlarından her organizasyon için en yeni 3'ü basit bir geçmiş olarak
-- sakla, gerisini sil. Yeni satır birikimi zaten yukarıdaki RPC'lerle
-- durduruldu; bu yalnız geçmiş birikimi temizler.
with ranked as (
  select id, organization_id,
         row_number() over (partition by organization_id order by updated_at desc) as rn
  from public.organization_card_templates
  where is_default = false
)
delete from public.organization_card_templates t
using ranked r
where t.id = r.id and r.rn > 3;
