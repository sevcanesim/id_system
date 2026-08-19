-- v23.2: card_profiles artık kullanıcı başına tek satıra kilitli değil.
-- Her profil isteğe bağlı olarak bir entitlement'a bağlanır (hangi satın
-- alınan üründen doğduğu); aynı kullanıcı birden çok entitlement'a sahipse
-- (kartvizit + sağlık kartı + ek kartvizit gibi) artık her biri için ayrı
-- bir card_profiles satırı açabilir.
--
-- Önceki davranış: `user_id uuid not null unique` + repository katmanında
-- `upsert(..., { onConflict: "user_id" })`. İkinci bir kart kaydedildiğinde
-- bu, birincinin verisini sessizce eziyordu. Bu migration bunu düzeltir.

alter table public.card_profiles
  add column if not exists entitlement_id uuid references public.entitlements(id) on delete set null;

-- Mevcut (tek) profilleri, varsa en uygun aktif entitlement'a en iyi çaba
-- ile eşle. Birebir doğru eşleşme garanti edilemez (entitlement'lar
-- ürün satın alma sırasına göre seçilir); bu sadece geçiş kolaylığı içindir,
-- veri kaybı yaratmaz.
update public.card_profiles cp
set entitlement_id = e.id
from public.entitlements e
where cp.entitlement_id is null
  and e.user_id = cp.user_id
  and e.kind in ('BUSINESS_CARD', 'NFC_PHYSICAL_CARD')
  and e.id = (
    select e2.id from public.entitlements e2
    where e2.user_id = cp.user_id
      and e2.kind in ('BUSINESS_CARD', 'NFC_PHYSICAL_CARD')
    order by (e2.status = 'ACTIVE') desc, e2.created_at asc
    limit 1
  );

-- Kullanıcı başına tek satır kısıtlamasını kaldır; sorgular hâlâ hızlı
-- olsun diye normal (unique olmayan) bir index ekle.
alter table public.card_profiles drop constraint if exists card_profiles_user_id_key;
create index if not exists card_profiles_user_id_idx on public.card_profiles(user_id);

-- Bir entitlement'tan en fazla bir kart profili doğabilir (kısmi unique;
-- entitlement_id null olan eski/serbest kayıtları etkilemez).
create unique index if not exists card_profiles_entitlement_id_uidx
  on public.card_profiles(entitlement_id)
  where entitlement_id is not null;

-- RLS politikaları zaten `auth.uid() = user_id` üzerinden satır bazlı
-- filtreleniyordu; çoklu satırla da doğru çalışmaya devam ediyor, değişiklik
-- gerekmiyor. Insert politikası da aynı şekilde kalıyor.

-- CardWizard istemcisi `is_card_slug_available` RPC'sini çağırıyor ama bu
-- fonksiyon önceki migration'ların hiçbirinde tanımlı değildi (muhtemelen
-- Supabase panelinden elle oluşturulmuştu — sıfır veritabanında migration'ları
-- 001-017 sırayla çalıştırınca bu fonksiyon eksik kalırdı). Burada, artık
-- kullanıcı değil profil kimliğine göre kendi kaydını hariç tutacak şekilde
-- (yeniden) tanımlanıyor.
create or replace function public.is_card_slug_available(
  candidate text,
  current_profile_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.card_profiles
    where slug = candidate
      and (current_profile_id is null or id <> current_profile_id)
  );
$$;

revoke all on function public.is_card_slug_available(text, uuid) from public;
grant execute on function public.is_card_slug_available(text, uuid) to authenticated, anon;

comment on column public.card_profiles.entitlement_id is
  'Bu kart profilinin doğduğu entitlement. Null olabilir (eski kayıtlar veya serbest profiller). Bir entitlement en fazla bir profile sahip olabilir.';
