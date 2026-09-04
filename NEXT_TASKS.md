# Yenomi ID — Sonraki İşler (v25.9.5)

## Uygulandı — paketleme / ödeme doğrulama / toplu davet (mimari rapor)

- Paylaşım yalnız `npm run package:safe` (`release:package` alias). `verify:pre-share` zip içinde `.env*` olduğunu fail eder. Manuel `zip -r` kök nedeni kilitlendi; canlı secret rotasyonu hâlâ ops görevi.
- Legacy iyzico `nfc_orders` callback artık `verifyIyzicoCheckoutResult` kullanıyor — commerce settle ile aynı doğrulama.
- CSV toplu davette `emailSent: false` satırları sonuç ekranında ayrılıyor ve mevcut davet yeniden gönder akışına bağlanıyor.
- `SUSPENDED` koltuk tüketimi bilinçli ticari politika olarak belgelendi; panelde pasif çalışan uyarısı var.

## Uygulandı — P0 Route Stability v29
- Kurumsal panel shell'i `app/kurumsal/panel/layout.tsx` seviyesine taşındı; sidebar/header artık alt route değişimlerinde unmount olmuyor.
- Kurumsal alt route `page.tsx` dosyaları ikinci `CorporatePanelClient` instance'ı oluşturmuyor.
- `pathname -> currentTab` render çözümü ile route değişiminde eski içerik kaçağı/tek karelik stale view riski azaltıldı.
- Çalışan/şablon/fiziksel kart veri hataları route scoped hale getirildi; alakasız sayfalara global hata banner'ı sızmıyor.
- Kurumsal segment `loading.tsx` ikinci shell üretmeyecek şekilde boş fallback'e çevrildi.
- TypeScript kontrolü PASS. Build bu ortamda Linux SWC binary'si bulunmadığı ve registry erişimi olmadığı için tamamlanamadı.

## Sıradaki P0/P1
- Kurumsal panelde her veri domaini için route-scoped skeleton + retry state.
- Global `başlık + açıklama` spacing component'inin uygulama geneli konsolidasyonu.
- Login sosyal butonları, demo değerleri ve autocomplete davranışlarının son QA'sı.
- Route transition QA: `/kurumsal/panel` → tüm alt route'lar → geri dönüş.
- Ham/native render kalan ekranların canonical UI bileşenlerine taşınması.


## Bu oturumda yapıldı (v25.9.5) — Premium açık tema dönüşümü
Tüm site (public + portal) koyu temadan premium açık temaya çevrildi; detaylar
CHANGELOG.md'de. `tsc` temiz, `next build` 74 sayfa hatasız.

## Sıradaki (v25.9.5 sonrası)
- **Canlı görsel QA gerekli.** Bu oturumda kod/CSS seviyesinde sistemli bir
  kontrast/arkaplan denetimi yapıldı ama gerçek tarayıcıda görüntü alınamadı
  (bu ortamda headless tarayıcı yok). Claude in Chrome ile canlıya alındıktan
  sonra sayfa sayfa görsel geçiş önerilir — özellikle `/kurumsal/panel`
  altındaki analytics/chart bileşenleri (CorporatePanelClient.tsx'teki ~28
  satır içi renk, çoğunlukla grafik aksanları, dokunulmadı).
- **Vitest'te 24 önceden-başarısız test var** (26 dosyadan bazı testler) —
  bu oturumun tema değişikliğinden bağımsız, `app/design-tokens.css` gibi artık
  var olmayan dosyalara veya eski (pre-refactor) sayfa metnine referans
  veriyorlar. Ya testler güncel `canonical.css`/copy'e göre yeniden yazılmalı
  ya da kaldırılmalı.
- Orbit/gezegen motifi (referans görsellerdeki Satürn halkası ikonografisi)
  yalnızca ProductVisual'daki basit halka çizgileriyle temsil edildi; daha
  belirgin bir dekoratif SVG istenirse ayrı bir görev olarak eklenebilir.


Güncel durum: v25.8.4 kurumsal kart formundaki alan yetki matrisini tamamladı ve kart profili yazma işlemini sunucu tarafında zorunlu hale getirdi. v25.8.5 kart şablonundaki "Kurumsal Bağlantılar" bölümünü gerçek, İK'nın yönetebildiği bir alana çevirdi; taslak/yayında durumu, bağlantı etkileşimleri ve 7/30/90 günlük içerik analitiği eklendi. Kurumsal satış sayfası bu yetenekleri anlatan yeni içerik merkezi ve ölçülebilir etki akışıyla yenilendi. Detaylar: `V25.8.4_CARD_FIELD_PERMISSION_MATRIX.md`, `V25.8.5_CORPORATE_LINKS.md`.

## Tamamlandı (v25.8.9)
- **NEXT_TASKS.md'deki P2 kalemlerinden CSV toplu çalışan yükleme yapıldı.** `lib/csv.ts` (bağımlılıksız, virgül/noktalı virgül otomatik tespitli CSV ayrıştırıcı) + `lib/organizations/bulk-invite.ts` (Türkçe/İngilizce başlık eşleme, satır bazlı doğrulama) + `POST /api/organizations/members/bulk-invite` (tekil davet akışıyla **aynı** `reserve_organization_invitation` RPC'sini satır satır, sırayla çağırır — kısmi başarı, koltuk kotası bittiğinde erken çıkış). `EmployeesPanel`'e "CSV ile Toplu Davet" butonu, şablon indirme, önizleme tablosu (satır bazlı hata listesiyle) ve sonuç özeti eklendi. 25 yeni test.
- Toplam paket 377 → 402.

## Sıradaki P2 (güncellendi)
- Gerçek ödeme callback → entitlement → aktivasyon claim zincirini sandbox ödeme ile E2E'ye bağla.
- Davet expired/revoked, pasif/ayrıldı, replacement ve aynı isim çalışan senaryolarını UI-level Playwright testleriyle genişlet.
- Lead modülü ürün backlog'unda açık kalıyor (kapsam kararı bekliyor). Park edilmiş not: `docs/product-engineering/17_PARKED_CORPORATE_NETWORKING_LEAD_MODULE.md` — yalnız **`notu uygula`** denince uygulanır.
- "Toplantı Planla" slotu düz URL/PDF; Calendly/Cal.com gömme widget'ı değil.
- CSV toplu yüklemenin canlı ortamda Playwright ile uçtan uca (gerçek dosya seçimi, gerçek RPC) doğrulanması — bu oturumda yalnız statik/unit test yapılabildi.

## Tamamlandı (v25.8.8)
- **NEXT_TASKS.md'deki P1 componentization tamamlandı: Employees + EmployeeDrawer.** Bu, panelin en büyük ve en iç içe geçmiş iki bloğuydu (~1350 satır, `selected`/`token()`/çok sayıda `set*` state'iyle örülü). Derleyici destekli bağımlılık tespitiyle (tsc'nin "Cannot find name" çıktısı üzerinden eksiksiz prop listesi çıkarıldı) `EmployeesPanel.tsx` (723 satır) ve `EmployeeDrawer.tsx` (925 satır) olarak ayrıldı — JSX gövdesi birebir taşındı, davranış değişmedi. `page.tsx` artık **2979 satır** (v25.8.6'da 4613, v25.8.7 öncesi 4173 idi). Artık panelin TÜM ana blokları (Overview hariç) bağımsız, salt-sunum bileşenlerine ayrılmış durumda: Roles, Şirket Profili/Alan Kilitleri, Pozisyon Kataloğu, Kurumsal Bağlantılar, Templates, Employees, EmployeeDrawer.
- 5 unit test dosyası (`corporate-overview-and-card-oversight`, `role-matrix-consistency`, `enterprise-member-operations`, `physical-card-replacement-ui`, `corporate-links`) yeni dosya sınırlarını yansıtacak şekilde güncellendi — hiçbiri davranış testi değildi, hepsi kaynak dosyada string arıyordu ve artık doğru dosyaları okuyor.
- Kalan: Overview bloğu (bkz. Sıradaki P1).

## Sıradaki P1 (güncellendi)
- Overview sekmesi hâlâ `page.tsx` içinde — componentization'ın son parçası.
- Departman/role bazlı şablon ataması (v25.8.7'den devrolan ürün kararı).
- Demo kullanıcı listesi `tests/fixtures/demo-user-matrix.ts` kaynaklıdır; `DEMO_TEST_USERS.md` `npm run docs:demo-users` ile üretilir.

## Tamamlandı (v25.8.7)
- **Çok perspektifli denetimde bulunan P0 giderildi: kurumsal panelde şablon ekleme.** `organization_card_templates` şeması/API'si çoklu şablonu zaten destekliyordu, panel yalnız `templates[0]`'ı gösterip her kayıtta yeni bir varsayılan satır biriktiriyordu. Artık: mevcut varsayılan şablon PATCH ile yerinde güncelleniyor (öksüz satır birikimi durdu), "Diğer kayıtlı şablonlar" galerisi + Varsayılan Yap / Sil aksiyonları + "Yeni şablon ekle" formu eklendi. Yeni RPC'ler: `update_organization_template`, `activate_organization_template`, `delete_organization_template`. Detay: `V25.8.7_CORPORATE_TEMPLATE_LIBRARY.md`. 18 yeni test.
- Kurulu ortamlarda birikmiş öksüz şablon satırları için tek seferlik temizlik migration'ı eklendi.

## Sıradaki P1 (güncellendi)
- Departman/role bazlı şablon ataması (örn. Satış ↔ Professional, Yönetim ↔ Executive) — v25.8.7 yalnız "birden fazla şablon sakla/geçiş yap"ı açtı, org genelinde hâlâ tek şablon aktif. Ayrı ürün kararı gerektiriyor.

## Tamamlandı (v25.8.6)
- **`removeCorporateLink` sessiz hata bug'ı düzeltildi.** Kaydet/yükle/yayınla handler'larının hepsinde başarısız istekte `setMessage(hata)` vardı, yalnızca **silme** işleminde yoktu — silme sunucuda başarısız olursa (yetki reddi, DB hatası, ne olursa olsun) arayüz hiçbir geri bildirim vermeden eskisi gibi kalıyordu. Bu, E2E `test:mutations` koşusunda "PDF sil → 'Yapılandırılmadı' görünsün" adımının 10 saniye timeout'a düşüp sessizce takılmasının en olası nedeniydi. Artık başarısızlıkta gerçek sunucu hatası panelde görünüyor. 1 yeni test.
- E2E `corporate-governance-mutations.spec.ts` içindeki strict-mode belirsizliği (PDF adı hem güncel-değer rozetinde hem kapalı sürüm geçmişinde eşleşiyordu) `.corp-link-current` kapsamına daraltılarak düzeltildi.
- **Şirket adı artık değiştirilebilir.** Önceden `organizations.name` hiçbir yerden düzenlenemiyordu — panel başlığında ("Demo Şirket 5 / Tam Dolu" gibi) donmuş kalıyordu. Yeni `PATCH /api/organizations/rename` endpoint'i ve Ayarlar sekmesindeki "Kurumsal Kimlik" kartı ile artık düzenlenebiliyor. Yalnızca **OWNER** değiştirebilir (yeni `canRenameOrganization` yetkisi — ADMIN dahi değil, çünkü bu isim her çalışanın kart profiline "Şirket adı" kilidi locked/suggested olduğunda otomatik yayılıyor). Kayıttan sonra panel başlığı ve önizlemeler sayfa yenilenmeden güncelleniyor. 6 yeni test (`tests/unit/organization-rename.test.ts`).
- Kurumsal bağlantılar için otomatik sürüm geçmişi eklendi; URL/PDF değişiklikleri, yayın durumu ve yayın zamanı denetlenebilir snapshot olarak saklanıyor.
- Panelden önceki bir bağlantı sürümüne tek işlemle geri dönülebiliyor.
- URL ve PDF içerikleri ileri bir tarihe planlanabiliyor; planlanan içerik yayın anına kadar genel kartlarda ve açma endpoint'inde gizli kalıyor.
- Eski PDF nesneleri geri alma güvenliği için depoda korunuyor; kalıcı temizleme ayrı saklama politikasıyla yapılmalı.
- Kurumsal panel bileşenleştirmesi başlatıldı: Rol ve Yetkiler ile Şirket Profili/Alan Kilitleri bağımsız bileşenlere taşındı.
- Kurumsal panel bileşenleştirmesi devam etti: Pozisyon Kataloğu (`JobTitlesPanel`) ve Kurumsal Bağlantılar (`CorporateLinksPanel`) da bağımsız, salt-sunum bileşenlerine taşındı — veri/handler'lar (fetch, `token()`, `setMessage`) hâlâ `page.tsx`'te, bileşenler yalnız prop alıyor (RolesPanel/CompanySettingsPanel ile aynı desen).
- Kurumsal Şablon editörü de `TemplatesPanel` bileşenine taşındı (şablon varyantı, ana renk/logo alanları, canlı önizleme); türetilmiş `templatePreviewBranding`/`templatePreviewData` hesaplaması `page.tsx`'te kalmaya devam ediyor çünkü `org`, `templatePreviewMember`, `corporateLinks` gibi birden fazla page-level state'e bağlı — bileşen bunları hazır prop olarak alıyor.
- `page.tsx` içinde `false &&` koşuluyla hiç render edilmeyen ~140 satırlık ölü "Şirket profili ve alan kilitleri" formu (CompanySettingsPanel'in eski, artık kullanılmayan kopyası) tespit edilip kaldırıldı; kullanılmayan `normalizeTrPhone` import'u da temizlendi.
- `page.tsx` 4613 → 4132 satıra indi (ölü kod temizliği + dört bileşen çıkarma sonucu, ~480 satır azaldı).
- `public/images/yenomilabs-premium-logo.webp` — kodda hiçbir yerde referanslanmayan, gerçekten kullanılmayan bir görsel olduğu doğrulanıp kaldırıldı. (`public/brand/logo.svg` ve `logo.webp` de aday çıkmıştı ama `tests/unit/brand-assets.test.ts` bunların bilinçli olarak "gelecekte kullanılmak üzere" saklandığını belirtiyor — dokunulmadı.)
- Statik referans taraması: `app/` ve `lib/` altında import edilmeyen/orphan tek bir `.ts`/`.tsx` dosyası kalmadı (114 dosya, hepsi ya import ediliyor ya da Next.js'in örtük kullandığı `page.tsx`/`route.ts`/`layout.tsx` vb.).
- İzole staging güvenlik kontrolü ve korumalı production deploy workflow'u eklendi; staging ref/URL ayrımı seed öncesinde doğrulanıyor, production deploy staging kapısı ve environment onayına bağlı.
- Çalışan ünvan talebi sonucu kart oluşturma ekranında kalıcı olarak gösteriliyor: onay, ret ve yönetici notu görünür; reddedilen talepten sonra yeniden başvuru yapılabilir ve eşzamanlı ikinci bekleyen talep engellenir.

## Tamamlandı (v25.8.5)
- Kurumsal satış sayfası; ürün kataloğu/PDF-URL içerik merkezi, merkezi güncelleme vaadi, hedef ekipler, gerçek kart görüntülenme analitiği ve teklif akışıyla yeniden tasarlandı.
- Kurumsal bağlantılara taslak/yayında yaşam döngüsü, yayınlanmış içerik filtresi, tıklama/açılma olayı ve 7/30/90 günlük içerik analitiği eklendi.
- Employee Drawer > Kart önizlemesi yayınlanmış kurumsal bağlantıları gösteriyor.
- Employee Drawer > Yaşam Döngüsü sekmesi son 50 ad/e-posta değişikliğini salt-okunur denetim geçmişi olarak gösteriyor.
- Kurumsal üyelik yetkileri Owner, Kurumsal Yönetici, İK ve Çalışan rolleriyle sınırlandırıldı.
- Kurumsal analitik; 7/30/90 günün yanında 1–366 günlük özel tarih aralığı, günlük seri, çalışan/departman/ülke ve içerik türü kırılımı sunuyor; CSV dosyası seçilen dönem adıyla indiriliyor.
- Yeni `organization_links` tablosu + `organization-assets` storage bucket: 4 sabit slot (Ürün Kataloğu, Şirket Sunumu, Toplantı Planla, Referans Projeler), her biri URL ya da yüklenmiş PDF olabilir.
- Kurumsal panel > Ayarlar'a "Kurumsal Bağlantılar" yönetim bölümü eklendi (URL kaydet / PDF yükle / kaldır), yalnız OWNER/ADMIN yazabiliyor.
- `fetchOrganizationLinks` tüm genel kart render noktalarına (`/p/[publicId]`, `/c/[cardCode]`, `/[slug]`, `/kartim`) bağlandı; yapılandırılmamış slotlar eski statik davranışa geriye dönük uyumlu şekilde düşüyor.
- Ek bulgu: `/[slug]` route'u kurumsal branding'i hiç uygulamıyordu, düzeltildi.
- 10 yeni unit test (`tests/unit/corporate-links.test.ts`); toplam paket 323/324 (1 önceden var olan, ilgisiz başarısızlık).

## Tamamlandı (v25.8.4)
- `save_own_card_profile` RPC'si: kart profili yazma artık `service_role` üzerinden tek noktadan geçiyor; şirket alan kilitleri (Ad Soyad, Şirket adı, Ünvan, E-posta, Telefon) istemciden bağımsız olarak sunucuda zorlanıyor.
- Yeni `lockName` kilidi eklendi (Ayarlar > Çalışan alan kilitleri, artık 5 alan).
- Ad Soyad / E-posta kilitli değilken serbestçe düzenlenebiliyor ama her değişiklik `member_identity_change_log`'a işleniyor (İK görünürlüğü).
- Ünvan artık serbest metin değil; `organization_job_titles` kataloğundan seçiliyor. Katalogda olmayan ünvan için çalışan `member_title_requests` ile talep açıyor, İK/Yönetici onaylıyor.

## Operasyon notu
- `20260809140000_card_field_permission_matrix.sql`, `20260809160000_organization_links.sql` ve `20260811100000_organization_content_analytics.sql` bağlı Supabase projesine uygulandı.
- Yeni `20260811120000_organization_link_versions.sql` migration'ı deploy öncesinde uygulanmalı.
- Mevcut şirketlerde pozisyon kataloğu ve kurumsal bağlantılar içerik girilene kadar boş kalabilir; ilk kurulum kontrol listesine en az bir ürün kataloğu ve temel pozisyonlar eklenmeli.

## Sıradaki P1
- **Ops:** Daha önce paylaşılmış zip arşivlerindeki Supabase service-role, iyzico secret, Maps key ve Vercel OIDC değerlerini rotate et. Paketleme kök nedeni (`zip -r` `.gitignore` görmez) `npm run package:safe` + `npm run verify:pre-share` ile kilitlendi; rotasyon hâlâ canlı ortam görevi — bu agent secret rotate edemez.
- Lead/CRM modülünün ürün kapsamına alınıp alınmayacağına karar ver; mevcut fixture yalnız "modül bekliyor" organizasyonudur. Birleşik park notu (networking + TR|EN kart + Super Admin tenant + public URL): `docs/product-engineering/17_PARKED_CORPORATE_NETWORKING_LEAD_MODULE.md`. Uygulama kapısı: **`notu uygula`**.
- `app/kurumsal/panel/page.tsx` bileşenleştirmesi: Employees + EmployeeDrawer v25.8.8'de tamamlandı (bkz. yukarı); yalnız Overview kaldı.

## Release kapıları (v25.5'ten beri değişmedi)
1. Her PR'da `npm run verify:release`
2. Mevcut doğrulama DB'sinde `npm run verify:integration`
3. İzole staging DB üzerinde `npm run verify:staging`
4. Production deploy öncesi `npm run verify:production-env`
5. Paylaşım öncesi `npm run package:safe` (alias: `release:package`). Manuel `zip -r` kullanma. Arşivi `npm run verify:pre-share -- path/to.zip` ile doğrula.

## 25.8.81 — QA devam noktası

- Canonical demo kullanıcı matrisi `tests/fixtures/demo-user-matrix.ts` içine taşındı; seed bu kaydı import eder, `DEMO_TEST_USERS.md` ondan üretilir.
- Bundan sonraki UI değişikliklerinde ilgili demo state'i seçilerek empty/loading/error/success ve permission yüzeyleri doğrulanmalı.
- Öncelikli sonraki ürün işi: checkout'un mevcut account-first kararını gerçek UI contract'ı ile netleştirmek ve payment/entitlement callback zincirini sandbox E2E'ye bağlamak.
- CSS consolidation ayrı migration olarak devam etmeli; yeni global stylesheet veya override katmanı eklenmemeli.
