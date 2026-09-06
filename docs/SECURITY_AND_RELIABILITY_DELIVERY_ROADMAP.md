# Güvenlik ve İş Sürekliliği Teslim Yol Haritası

Bu belge, kaynak kod denetimindeki bulguları uygulama sırasına bağlar. Bir madde **kodda tamamlandı** olarak yazılsa bile, ilgili migration staging ve production veritabanında uygulanmadan canlıda tamamlanmış sayılmaz.

## 6 Eylül 2026 uygulama durumu

| Alan | Durum | Kanıt / sonraki adım |
| --- | --- | --- |
| P0.1, P0.2, P0.5, P0.6 | Uygulandı | `20260906120000`, `20260906130000` ve `20260906140000` migration'ları bağlı Supabase projesine uygulandı; `supabase db push --dry-run` uzak veritabanının güncel olduğunu doğruluyor. |
| P0.3 | Kaynakta tamam | PayTR sandbox callback tekrar/yanlış-imza senaryoları gerçek sağlayıcıyla kanıtlanmalı. |
| P0.4 | Kaynakta tamam | Tip, derleme ve statik kalite kontrolleri geçiyor. Chromium bu çalışma ortamının macOS sandbox kısıtı nedeniyle başlatılamadığından tarayıcı E2E'si yerel CI veya staging'de çalıştırılmalı. |
| P0.7 | Kısmi ilerleme, açık yayın engeli | Seçili API'ler HttpOnly cookie'den kimlik çözebiliyor; ancak tarayıcı Supabase istemcisi hâlâ access/refresh token alıyor. Tam BFF geçişi bitmeden bu madde kapanmaz. |
| P1.3 | Kısmi uygulandı | `20260906160000` ile atomik lease, `20260906170000` ile süreli job-run geçmişi, `20260906180000` ile 90/180 günlük retention bağlı Supabase projesine uygulandı. Super Admin operasyon ekranı job-run geçmişini gösterir; dış uptime alarmı açık. |
| P1.5 | Kısmi uygulandı | `app/api`, `lib` ve kart düzenleyici çalışma zamanı hataları ham `console.*` yerine maskeli `system_error_logs` kaydına geçiyor; giriş telemetry'si 90 günlük, service-role-only `auth_login_events` tablosunda HMAC parmak iziyle tutuluyor. `verify:security-hardening` bu sınırlarda ham konsol kaydını engeller. |
| P1.6 | Kısmi uygulandı | `profile-images` private; upload magic-byte/MIME/boyut kontrolü, WebP yeniden encode ve EXIF temizliğiyle sunucuda işleniyor. Kart analitiği ayrı HMAC anahtarı, DNT/GPC opt-out, ülke seviyesi ve 90 gün retention ile minimize edildi. İndeksleme ve hukuk onaylı silme operasyonu açık. |
| P1.7 | Kaynakta tamam | Drift denetimi güncel Supabase CLI JSON çıktısını ve migration sürüm kümelerini güvenilir biçimde karşılaştırıyor. |
| P2.1 | Kısmi uygulandı | Webhook hedefi DNS çözümlemesiyle özel ağlardan ayrıştırılıyor ve teslim onaylanmış IP'ye sabitleniyor. Egress proxy/allowlist katmanı açık. |
| Production env | Engelli | PayTR, Redis, `CRON_SECRET` ve hukuk onay değişkenleri tanımlı değil; `verify:production-env` bu nedenle bilinçli olarak başarısız. |

Bu durum, bağlı Supabase projesinin production olduğu anlamına gelmez. Ortam kimliği ve production değişkenleri doğrulanmadan production onayı verilmez.

## Faz P0 — Veri sınırı ve ödeme sürekliliği

### P0.1 Kurumsal kart ile profilin aynı organizasyona ait olması

**Risk:** Aynı kullanıcıya ait kişisel veya başka bir şirkete bağlı profil, kurumsal fiziksel karta bağlanabiliyordu. Bu, şirket panelinde yanlış kimliğin görünmesine ve profil verisinin yanlış şirkete açılmasına yol açabilirdi.

**Kodda tamamlandı:**

- `physical_cards` için tetikleyici, `owner_profile_id`, `owner_user_id` ve `organization_id` ilişkisini veritabanında doğrular.
- Eşleştirme endpointi doğrudan tablo güncellemez; kilit alan ve sonucu döndüren `link_own_corporate_card_profile` RPC'sini çağırır.
- Kart aktivasyon RPC'si, profil organizasyonu ile kart organizasyonunu eşit tutar.
- Yönetici önizlemesi, kart durumları ve kurumsal analitik artık şirket adı benzetimi yerine yalnız `organization_id` kullanır.

**Canlıya alma sırası:**

1. Staging'de `20260906120000_p0_corporate_card_profile_integrity.sql` migration'ını uygula.
2. Migration `CORPORATE_CARD_PROFILE_INTEGRITY_REPAIR_REQUIRED` ile durursa, hata veren kart/profil kayıtlarını bir kereye mahsus doğrulanmış organizasyon ilişkisiyle düzelt; migration'ı atlama veya trigger'ı devre dışı bırakma.
3. Her kurumsal rol için kişisel profil, aynı şirket profili ve başka şirket profiliyle eşleştirme denemesi yap. Yalnız aynı şirket profili başarılı olmalıdır.
4. Production'da migration sonrası aynı sorguların kayıt altına alınmış sonucu olmadan P0.1 kapatılmaz.

### P0.2 Tarayıcıdan doğrudan profil yazımını kapatma

**Risk:** Eski RLS politikaları profil satırına doğrudan `INSERT/UPDATE/DELETE` izni veriyordu. İstemci arayüzündeki kilitli alanlar, doğrudan Data API çağrısıyla aşılabilirdi.

**Kodda tamamlandı:**

- Eski profil DML politikaları ve `anon/authenticated` DML yetkileri migration ile kaldırılır.
- Profil kaydı, mevcut yetki denetimli `POST /api/profiles/save` akışında kalır.
- Yayın durumu için sahiplik kontrolü yapan `POST /api/profiles/publication` endpointi eklendi.
- Eski istemci repository'sindeki doğrudan profil ekleme/güncelleme fonksiyonları kaldırıldı.

**Canlı doğrulama:**

1. Staging'de normal kullanıcı access token'ı ile `card_profiles` için doğrudan DML çağrılarının reddedildiğini doğrula.
2. Kart oluşturma, düzenleme, yayınla/yayından kaldır akışlarının API üzerinden başarılı olduğunu doğrula.
3. Supabase SQL Editor'de `information_schema.role_table_grants` üzerinden `anon` ve `authenticated` için `card_profiles` DML ayrıcalığının bulunmadığını kayda al.

### P0.3 PayTR callback ve cron giriş kapıları

**Risk:** İmzalı ödeme callback'i IP temelli limiter yüzünden reddedilebilir; üretimde CRON_SECRET eksikliği yayın öncesi yakalanmayabilirdi.

**Kodda tamamlandı:**

- PayTR callback rotası middleware IP hız limitinden çıkarıldı. Callback tarafında imza doğrulama, callback makbuzu ve idempotent settlement zorunluluğu korunur.
- İstek kimliği artık kullanıcı tarafından gönderilen `x-request-id` değeriyle devralınmaz; middleware tarafından üretilir.
- Production ortam denetimine `CRON_SECRET` eklendi.

**Canlı doğrulama:**

1. PayTR sandbox'ta aynı callback'i iki kez gönder: yalnız bir ödeme/entitlement oluşmalı, iki callback makbuzu izlenebilmelidir.
2. Yanlış hash ile callback gönder: işlem yapılmamalı ve sağlayıcıya retry edilebilir hata dönmelidir.
3. CRON_SECRET olmadan production deployment doğrulamasının başarısız olduğunu; doğru secret ile cron rotasının yalnız yetkili çağrıya açık olduğunu doğrula.

### P0.4 Kurumsal mobil stil zinciri

**Sorun:** `mobile-layout-guard.css` route layout'a doğrudan import edildiği için kanonik stil denetimi ve runtime qualification duruyordu.

**Kodda tamamlandı:**

- Stil, `app/styles/canonical-corporate-responsive.css` altına taşındı.
- Root layout üzerinden tek kanonik import zincirine alındı.
- UI denetimi yeni kanonik modülü zorunlu katman olarak doğrular.

**Kapanış kriteri:** `npm run verify:runtime-qualification` tam olarak geçmeli; bu komut geçmeden P0 mobil kalite maddesi kapanmaz.

### P0.5 Ödeme devam bağlantısını kısa ömürlü ve tek kullanımlık yapmak

**Risk:** Önceki akışta e-posta, tarayıcı geçmişi veya proxy kaydına düşen yedi günlük URL token'ı sipariş taslağındaki iletişim ve fatura verisini doğrudan okuyabiliyordu.

**Kodda tamamlandı:**

- `commerce_checkout_resume_codes` yalnız hash saklar; ham kod veritabanına, loga veya istemci saklamasına yazılmaz.
- Kod 15 dakika geçerlidir ve atomik `redeemed_at is null` koşuluyla ilk kullanımda tüketilir.
- Kullanımdan sonra endpoint 303 ile temiz `/checkout` adresine geçer; taslak yalnız on dakikalık, `HttpOnly`, dar path'li devam çereziyle bir kez okunur.
- Ödeme devamı ve terk edilen sepet e-postaları yeni kodu üretir; sipariş taslağının yedi günlük saklama süresi ile URL yetkisinin süresi birbirinden ayrılmıştır.

**Canlı doğrulama:**

1. Aynı devam URL'sini iki farklı tarayıcıda aç: yalnız ilkinde taslak yüklenmeli.
2. 15 dakika geçmiş kod, temiz URL'deki devam çerezi ve ödeme alınmış sipariş için taslak okunmamalı.
3. CDN/Vercel erişim loglarında `resume` sorgu parametresinin maskelendiğini veya saklama süresinin güvenlik politikasına uygun olduğunu doğrula.

### P0.6 Anonim profil verisi ve eski slug yönlendirmeleri

**Risk:** Eski public RLS/RPC yolları, kartın dahili profil UUID'sini ve eski slug yönlendirme satırlarını doğrudan Data API üzerinden açabiliyordu.

**Kodda tamamlandı:**

- Public sayfalar profil, eski slug ve fiziksel kart durumunu yalnız Next.js sunucusundaki service-role gateway üzerinden çözer.
- Anonim erişim için `card_profiles`, `card_profile_slug_redirects`, `card_profile_locales` SELECT izinleri ile eski public profil RPC'leri kaldırıldı.
- Public networking formu dahili profil UUID'si yerine yalnız rastgele `public_id` gönderir; sunucu hedefi kendi içinde çözer.

**Canlı doğrulama:**

1. Anon JWT ile `card_profiles`, `card_profile_slug_redirects` ve `card_profile_locales` SELECT denemeleri reddedilmeli.
2. `/p/{public_id}`, eski `/slug` ve eski slug vCard yönlendirmesi çalışmalı; sayfa HTML'i ve ağ istekleri profil UUID'si taşımamalı.
3. Event link çözümleme RPC'si ve eski public profil RPC'leri anon/authenticated rollerinde çalışmamalı.

### P0.7 Tarayıcı oturumunu BFF modeline taşımak — açık release blocker

**Risk:** Mevcut Supabase SDK, istemci tarafındaki okuma akışları için access ve refresh token'ı JavaScript belleğine kuruyor. `HttpOnly` cookie kullanımı disk saklamasını azaltır; ancak refresh token'ın tarayıcı heap'ine hiç çıkmamasını sağlamaz.

**Neden bu değişiklik bu pakette tamamlanmadı:** Sadece `/api/auth/session` yanıtını değiştirmek, mevcut tarayıcı tabanlı Supabase sorgularını token yenilenmesi sırasında sessizce kırar. Güvenli çözüm, tüm kullanıcı sorgularını BFF/API katmanına geçirip Supabase browser client'ını özel veriden çıkarmaktır; ara çözüm “sahte refresh token” kullanmak güvenilir değildir.

**Zorunlu sonraki uygulama:**

1. Kullanıcıya ait her `SupabaseClient` sorgusunu server route/repository üzerinden taşı.
2. `/api/auth/session` GET yanıtından refresh token'ı kaldır; yalnız BFF'nin kullandığı HttpOnly cookie kalsın.
3. OAuth/recovery callback'lerini sunucu callback route'una taşı; URL hash token'larını ilk yanıtta temizle.
4. Tarayıcı heap, Local Storage, Session Storage ve Network yanıtlarında refresh token olmadığına dair E2E + DevTools denetim kanıtı olmadan production onayı verme.

## Faz P1 — Dayanıklılık ve işletim görünürlüğü

### P1.1 Dayanıklı teslimat kutusu (outbox)

**Risk:** Ödeme başarılı olup e-posta veya Mysoft fatura gönderimi hata verirse, işlem durumu ile teslimat durumu ayrışabilir.

**Yapılacaklar:**

1. `commerce_outbox` tablosunu ekle: `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload`, `status`, `attempt_count`, `next_attempt_at`, `locked_at`, `last_error_code`, `delivered_at`.
2. Ödeme settlement transaction'ında entitlements, fatura ve bildirim görevlerini aynı transaction içinde outbox'a yaz.
3. Cron worker, `FOR UPDATE SKIP LOCKED` ve süreli lease ile görevleri almalı; exponential backoff kullanmalı.
4. Sağlayıcı idempotency anahtarını outbox event id'sinden üretmeli. Ham kredi kartı, token veya PII hata metni saklanmamalı.
5. Super Admin'de başarısız/tekrar bekleyen görevler, retry ve audit trail gösterilmeli.

**DoD:** Ağ kesintisi simülasyonunda ödeme bir kez kapanır; e-posta/fatura daha sonra tekrar deneyerek tek kez teslim edilir.

### P1.2 Mysoft fatura adapter'ı

**Risk:** Faturalama çağrıları sağlayıcı ayrıntılarına bağlı ve eksik kaldığında ticari kayıt ile e-arşiv kaydı tutarsız olabilir.

**Yapılacaklar:**

1. `InvoiceProvider` arayüzü tanımla: `createInvoice`, `getInvoiceStatus`, `cancelInvoice`.
2. Mysoft adapter'ını yalnız sunucu ortamında çalıştır; erişim anahtarlarını loglama veya istemciye gönderme.
3. Fatura numarası, sağlayıcı referansı, durum geçişi ve PDF erişimini ayrı `commerce_invoices` tablosunda sakla.
4. Fatura PDF'ini private storage'da sakla ve yalnız yetkili kullanıcıya süreli signed URL üret.

**DoD:** Aynı order için birden fazla fatura oluşmuyor; sağlayıcı timeout'u outbox retry ile telafi ediliyor.

### P1.3 Cron lease, metrik ve alarm

**Risk:** Serverless cron aynı işi çakışarak çalıştırabilir; başarısız olduğunda görünmeden kalabilir.

**Uygulandı:**

1. `operational_job_leases`, job adı başına süreli ve atomik bir lease alır; çakışan cron çağrısı `LEASE_HELD` ile iş almadan biter.
2. `operational_job_runs`, `started_at`, `finished_at`, başarı/başarısızlık, işlenmiş kayıt sayısı ve sınıflandırılmış hata kodunu saklar.
3. Ticari operasyon ve webhook teslim worker'ları aynı standardı kullanır.

**Açık işler:** Son başarılı job-run yaşını izleyen dış uptime alarmı ve operasyon kanalının belirlenmesi eklenmelidir.

### P1.4 Super Admin operasyon merkezi

**Risk:** Sipariş, entitlement, fatura, hata ve kullanıcı durumları ayrı yerlerde kalırsa destek işlemi tahminle yürür.

**Yapılacaklar:**

1. `public_id`, kullanıcı UUID, sipariş numarası ve organizasyonla arama yapabilen tek bir operasyon görünümü ekle.
2. Değişiklik yapan her admin eyleminde actor, sebep, önce/sonra özet, request id ve zaman damgası audit kaydına yazılsın.
3. Vergi no, vergi dairesi ve cari bilgileri için rol bazlı yazma izni; alan seviyesinde maskeli gösterim uygula.
4. Kullanıcıya yalnız güvenli hata referansı göster; teknik stack, token ve SQL hata metni yalnız erişim kontrollü logda kalsın.

**DoD:** Bir destek görevlisi, tek aramayla kullanıcının yetkili olduğu veriyi; Super Admin ise denetim izini görebilir.

### P1.5 Katalog, aktivasyon ve log dayanıklılığı

**Uygulandı:** Cron, checkout, ödeme settlement ve kimlik akışları artık ham exception veya sağlayıcı yanıtı yazmadan sınıflandırılmış `system_error_logs` kaydı oluşturur. Logger; e-posta, JWT, uzun gizli değerler ve hassas anahtarları maskeler. Giriş telemetry'si ham IP ve kullanıcı UUID'si yerine HMAC parmak izi tutar. Sağlayıcı payload snapshot'ı referans, payment id ve ham hata metni taşımaz.

**Açık işler:**

1. Fiyatı tek DB katalog kaynağından oku; checkout sırasında ürün/fiyat/katalog sürümü snapshot'ını siparişe yaz. Kod içindeki parasal değerler yalnız test fixture'ında kalmalı.
2. Aktivasyonu `activation_provisioning_jobs` saga'sına taşı: `USER_CREATED`, `PROFILE_CREATED`, `FINALIZED`, `COMPENSATED`; yarım işleri cron ile uzlaştır.
3. Merkezi logger dışında veri taşıyan `console.*` kullanma. Token, authorization, e-posta, telefon, adres, query string ve ham hata nesnesini logger katmanında maskele. Bu kural `app/api`, `lib` ve kart düzenleyici için otomatik olarak doğrulanır.
4. `system_error_logs` ve giriş telemetry'si için 90 günlük retention, job geçmişi için 180 günlük retention ve günlük purge işi uygulanmıştır; operasyonel silme/adet sonucu job-run kaydında kalır. Harici uyumluluk politikasına göre anonimleştirme süresi ayrıca belirlenmelidir.
5. `x-forwarded-for` için tek güvenilir proxy standardı belirle; diğer istemci başlıklarını rate limit kimliği olarak kullanma.

**DoD:** Fiyat ayrışması, yarım aktivasyon, tekrar eden cron ve PII taşıyan hata logu için otomatik regresyon testi bulunur.

### P1.6 Görsel, konum ve analitik veri minimizasyonu

**Uygulandı:**

1. `profile-images` bucket'ı private; eski public storage URL'leri yalnız güvenli nesne yolu olarak çözümlenir.
2. Görsel yükleme sunucuda magic-byte/MIME/boyut/oran kontrolüyle yeniden WebP encode edilir; EXIF/GPS taşınmaz.
3. Sahip, yetkili kurumsal yönetici ve public kart için farklı yetki kontrollü görsel endpointleri kullanılır. Kart kapanırsa public görsel de 404 olur.
4. Kart görüntülenme analitiği, servis anahtarından ayrı `ANALYTICS_FINGERPRINT_SECRET` ile yalnız günlük tekrarları ayıran HMAC üretir. Ham referer ve şehir saklanmaz; yalnız doğrulanmış iki harfli ülke kodu alınır. `DNT: 1` ve `Sec-GPC: 1` istekleri hiç kaydedilmez.
5. Kart görüntülenme olayları günlük operasyon cron'u ile 90 gün sonra silinir.
6. Konum çözümleme yalnız kullanıcı tıklamasıyla çalışır. IP tabanlı sessiz yedek kaldırıldı; koordinatlar istemci, reverse geocode ve checkout sınırında 4 ondalık basamağa indirilir. Reverse yanıtı `no-store` ve `no-referrer` taşır; ayrıntılar `docs/DATA_PROCESSING_INVENTORY.md` içinde kayıtlıdır.

**DoD:** Kart kapatıldığında profil görseli erişimi kesilir; analitik/log kayıtlarında ham IP, query token veya EXIF konumu bulunmaz.

### P1.7 Migration defteri denetimi

**Önceki risk:** Supabase CLI'nın sıraladığı eski `024` ve `20260830` kayıtları aynı satır numarasıyla eşlenmeye çalışıldığında yanlış drift sinyali oluşuyordu.

**Kodda tamamlandı:**

1. Denetim, CLI JSON çıktısından local/remote migration sürüm kümelerini okur; sıralama farkı yanlış alarm üretmez.
2. Denetim, bağlı proje için local/remote migration sürüm kümelerinin eşleştiğini doğrular; sabit sürüm sayısına dayanmaz.
3. Geçmiş migration kayıtları veya local SQL dosyaları silinmedi; `migration repair` kullanılmadı.

**DoD:** `npm run verify:migration-drift` parse hatası vermeden iki sürüm kümesi arasında uyuşmazlık olmadığını raporlar.

## Faz P2 — Saldırı yüzeyi ve gizlilik sertleştirmesi

### P2.1 Webhook/SSRF ve egress kontrolü

**Uygulandı:** Webhook URL'si HTTPS/port/host kısıtlarından geçer; yapılandırmada ve her teslimden hemen önce DNS çözümlemesi yapılır. Loopback, private, CGNAT, link-local, metadata/dokümantasyon, multicast ve IPv6 özel ağ adresleri reddedilir. İstek redirect takip etmez, 10 saniyede zaman aşımına uğrar ve DNS sonucu teslim anında onaylanan IP'ye sabitlenir. Kuyrukta yalnız sınıflandırılmış hata kodu tutulur.

**Açık işler:** Allowlist tabanlı egress proxy ve merkezi egress telemetry katmanı eklenmelidir.

### P2.2 Oturum ve hassas veri yaşam döngüsü

**Yapılacaklar:** P0.7 BFF geçişinden sonra cihaz/oturum listeleme ve iptal ekranı; ödeme/aktivasyon ekranları için `no-store`, referrer politikası ve geri dönüş temizliği; hassas bilgileri varsayılan gizli gösterip açık kullanıcı aksiyonuyla kısa süre görünür kılma. Web uygulamasında ekran görüntüsü veya kaydını kesin engelleme vaadi verme.

### P2.3 Gizlilik istekleri ve indeksleme

**Kodda tamamlandı:** Oturum açmış kullanıcı, hesap ayarlarından veri erişim veya silme/değerlendirme talebi oluşturabilir ve durumunu takip edebilir. Aynı kullanıcı için aynı türde ikinci açık talep, yeni kayıt üretmeden var olan talebe döner. Talepler backend-only tablolarda saklanır; `SUBMITTED → IN_REVIEW → IDENTITY_VERIFIED → COMPLETED/REJECTED/CANCELLED` durum makinesi dışında ilerleyemez. Her geçişte append-only kanıt kaydı ve AAL2 Super Admin audit kaydı oluşur. Tamamlanan veya reddedilen talepler sınıflandırılmış bir çözüm kodu gerektirir; sistem kullanıcının verisini otomatik silmez.

**Açık işler:** Arama motoru indeksleme tercihini sürümlü kayıtla tut; varsayılan kapalı. Hukuk ve operasyon ekipleri, geçerli başvuru prosedürüne göre SLA/hedef süre, kimlik doğrulama kanıt standardı, erişim dışa aktarım kanalı ve silme saklama istisnalarını onaylamalıdır. Kişiselleştirilmiş ürün iadesi hakkında kesin hukuki metin üretme; hukuk onayı olmadan politika yayınlama.

### P2.4 API politika katmanı

**Yapılacaklar:** Tüm API route'larında ortak input şeması, auth, yetki, rate-limit, request-id, güvenli hata ve audit middleware'i kullan. İstemcinin verdiği request id'yi izleme korelasyonu için kabul etme; yalnız `client_request_id` olarak ayrı ve doğrulanmış biçimde saklama.

### P2.5 Entegrasyon egress ve güvenlik gözlemlenebilirliği

**Yapılacaklar:** CSP ihlal raporlama endpoint'i; `connect-src`/`img-src` allowlist'i; webhook DNS rebinding, IPv4/IPv6 private ağ, metadata IP ve redirect reddi; egress proxy; sağlayıcı yanıt gövdesi ve URL'sini loglamayan hata modeli. Gerçek cihazda PayTR iframe trafiğinin yalnız PayTR origin'ine gittiğini doğrula.

## Ticari karar bekleyen alanlar

Şu kararlar verilmeden fiyat veya hukuk metni hard-code edilmez:

- Fiyatların KDV dahil/hariç sunumu ve Enterprise paketinin açık fiyatı mı, teklif usulü mü olacağı.
- Özel URL'nin tek seferlik/yıllık bedeli ve kurumsal satın alma yetkisi.
- İade/iptal politikasının hukuk onaylı sürümü.
- Mysoft üretim erişimi, PayTR production/sandbox referansları ve operasyon alarmı alacak kanal.

## Tek komutla kaynak doğrulaması

Kaynak düzeyindeki P0 kontratı için:

```bash
npm run verify:p0:static
npm run verify:runtime-qualification
npm run test:unit
```

Bu komutların başarısı yalnız repository durumunu kanıtlar. Production kapanışı ayrıca migration uygulama kanıtı, PayTR sandbox callback kanıtı, cron job run kanıtı ve rol/RLS kontrol çıktısı gerektirir.
