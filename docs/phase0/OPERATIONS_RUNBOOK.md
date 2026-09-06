# Faz 0 — Sipariş, Ödeme ve Aktivasyon Operasyon Runbook'u

## Amaç
Ödeme alınmış fakat fulfillment/aktivasyon zincirinde sorun yaşayan siparişlerin müşteri kaybına dönüşmeden çözülmesi.

## Günlük sorumluluk matrisi
- Ödeme ve reconciliation: operasyon yöneticisi / teknik sorumlu.
- Kart üretim kuyruğu: üretim sorumlusu.
- Kargo ve takip: fulfillment sorumlusu.
- Aktivasyon ve hesap erişimi: destek + teknik sorumlu.
- KVKK ve sözleşme talepleri: yetkili şirket temsilcisi; hukuki yorum gereken talepler hukuk danışmanına eskale edilir.

## Kritik kontroller
1. PAID olup entitlement oluşmamış siparişleri kontrol et.
2. `commerce_fulfillment_issues` içindeki açık kayıtları kontrol et.
3. Aktivasyon e-postası gönderilememiş veya süresi dolmuş siparişleri kontrol et.
4. PREPARING durumda bekleme süresini aşan siparişleri üretime eskale et.
5. SHIPPED durumda tracking bilgisi bulunmayan sipariş bırakma.

## Reconciliation prosedürü
- Sipariş numarasını, payment attempt durumunu, callback kaydını, order status'ü, order item'ları ve entitlement kayıtlarını aynı işlem zinciri olarak incele.
- Ödeme başarılıysa ödeme durumunu geriye çekme; fulfillment hatasını ayrı kayıt olarak çöz.
- Aynı callback tekrar geldiyse idempotency nedeniyle ikinci entitlement/sipariş üretmediğini doğrula.
- Aktivasyon bağlantısını yalnız PAID ve henüz hesaba bağlanmamış sipariş için yeniden üret.
- Manuel müdahaleyi admin audit log'a kaydet.

## P0 eskalasyon
- Müşteriden para alındı fakat 15 dakika içinde sipariş/entitlement görünmüyor: P0.
- Aynı ödeme birden çok sipariş veya entitlement oluşturdu: P0.
- Production callback erişilemiyor: P0.
- Production secret sızıntısı şüphesi: derhal ilgili secret'ı rotate et ve deployment'ı durdur.
- Kaynak paylaşımı yalnız `npm run package:safe` ile. Manuel `zip -r` `.gitignore`'u uygulamaz ve `.env.local` sızdırır. Paylaşmadan önce `npm run verify:pre-share -- <zip>` çalıştır. `.env*` içeren bir arşiv çıktıysa Supabase service-role, iyzico, Maps ve Vercel OIDC değerlerini rotate et.

## Ödeme mutabakat ekranı

Yönetim panelindeki **Ödeme Mutabakatı** sekmesi ödeme ve fulfillment durumlarını tek kuyrukta karşılaştırır. Aşağıdaki durumlar P0 inceleme gerektirir:

- `PAID_ORDER_WITHOUT_PAID_ATTEMPT`: Sipariş PAID görünürken doğrulanmış PAID payment attempt yoktur.
- `PAID_ATTEMPT_ORDER_NOT_PAID`: Sağlayıcı sonucu PAID iken sipariş PAID değildir.
- `FULFILLMENT_REVIEW_REQUIRED`: Ödeme alınmıştır ancak entitlement/yenileme/kurumsal kapasite fulfillment sürecinde açık kayıt vardır.
- `AUTHENTICATED_ORDER_NOT_CLAIMED`: Hesaba bağlı, ödenmiş siparişin activation claim işlemi tamamlanmamıştır.

Bir fulfillment issue yalnızca gerçek neden düzeltildikten sonra çözülmüş olarak işaretlenir. Çözüm notu zorunludur ve işlem `admin_audit_log` içine yazılır. Bir ödeme mutabakat kaydını kapatmak, ödeme durumunu değiştirmez ve ikinci kez tahsilat başlatmaz.

## Kimlik doğrulama ve demo hesap yüzeyi

### Production demo/test giriş kapısı
`yenomi-id.vercel.app` (`VERCEL_ENV=production`) üzerinde `account_type='TEST'` ve `@yenomi.test` kimlikleri giriş, oturum cookie yazımı ve session restore sırasında reddedilir (`Bu test hesabı üretim ortamında kullanılamaz.`). Bu hesaplar routing overlay'dir; erişim kontrolü değildir. Canlıya gerçek bir hesap veya Google/LinkedIn ile girilir.

- Preview/staging fixture kullanımı: `ALLOW_TEST_LOGINS=true` (yalnız izole deployment).
- Kapıyı production dışında zorlamak: `YENOMI_BLOCK_TEST_LOGINS=true`.
- Bu kapı canlı Auth kullanıcılarını silmez ve şifre rotate etmez. Production Auth'ta `@yenomi.test` hesabı kalmamalıdır; `npm run` içindeki `verify:production-no-demo-users` taraması (env-gated) bunu doğrular. Taramayı çalıştırıp kullanıcıları disable/delete etmek ops görevidir.

### Giriş brute-force katmanları
Tarayıcı `signInWithPassword` çağrısı `*.supabase.co`'ya giderse Next.js middleware bu denemeyi görmez. Şifreli giriş bu yüzden `POST /api/auth/login` üzerinden yürür.

| Katman | Ne korur | Davranış |
| --- | --- | --- |
| Next.js middleware `auth-login` | `POST /api/auth/login` per IP | 10 istek / 60 sn, Redis yoksa **fail-open** (bellek; Edge 503 yok) |
| Login route `auth-login-email` | Aynı uç, e-posta başına | 10 istek / 60 sn, Redis yoksa **fail-open** (bellek) |
| `/giris` sayfa limiti | HTML yükleme | 30 istek / 60 sn, **fail-open** (boş 503 yok) |
| `/api/auth/session` | Cookie yaz/oku | 30 istek / 60 sn, **fail-open** (giriş cookie'si 503 olmasın) |
| Supabase Auth (GoTrue) | Direkt `*.supabase.co` denemeleri (OAuth, eski istemciler) | Dashboard → Authentication → Rate Limits. **Bu repodan canlı değerler okunamaz**; sign-in / token / OTP limitlerini orada kontrol edip bu tabloya not düş. |

Başarısız ve engellenen şifre girişleri Vercel loglarında `auth.login` JSON satırı olarak görünür (`ok`, `reason`, `email_domain`, `ip`). Şifre loglanmaz. `reason=invalid_credentials` / `test_account_blocked` / `rate_limited_email` bir stuffing denemesini fark etmek için yeterlidir.

### Data API grant modeli
`20260819160000` PostgREST için mevcut tablolara `anon`/`authenticated` DML verdi. `20260822120000` **default privileges** bu rollerden geri alınır: yeni tablo/RPC otomatik açılmaz. `commerce_payment_attempts`, `payment_attempts`, `activation_tokens`, `commerce_email_events`, `admin_audit_log`, `corporate_leads` Data API’den revoke; erişim service_role API üzerinden. Ürün tabloları (`card_profiles`, `products`, `user_accounts`) PostgREST + RLS ile durur.

### CSP
`script-src 'unsafe-inline'` kaldırıldı. Middleware her belgede `x-nonce` + `script-src 'nonce-…' 'strict-dynamic'` basar. `style-src 'unsafe-inline'` hâlâ duruyor (daha düşük öncelik). `next.config.ts` artık ikinci bir CSP basmaz; tarayıcı birden fazla CSP'yi AND uygular ve statik `unsafe-inline` nonce politikasını delerdi.

## Kritik akış test kapsamı
Aktif Playwright kaynakları `tests/e2e/` altındadır. Bunlar public hydration,
dönüşüm CTA'ları, satış metni, responsive yüzey ve kimlik bilgisi verildiğinde
bireysel/kurumsal panel düzenlerini kapsar. `npm run test:e2e` gerçek bir
tarayıcı koşusudur; `node scripts/verify-critical-journeys-coverage.mjs` ise
yalnız test kaynaklarının mevcut olduğunu doğrular. Skip veya statik sözleşme,
çalışmış sandbox testi değildir.

| Yolculuk | Kanıt |
| --- | --- |
| Public/checkout/login hydration ve mobil navigasyon | Playwright: `public-critical.spec.ts` |
| Ana sayfa CTA, fiyat ve paket karşılaştırması | Playwright: `home-conversion.spec.ts` |
| Public satış metni ve ödeme sınırı | Playwright: `public-sales-copy.spec.ts` |
| Responsive public/commerce/protected-route sınırı | Playwright: `responsive-master.spec.ts` |
| Bireysel/kurumsal giriş sonrası panel düzeni | Playwright, `E2E_INDIVIDUAL_*` / `E2E_CORPORATE_*` credentials gerekli |
| Callback tekrar, tutar doğrulama ve güvenli ret tanısı | Vitest payment callback testleri |
| PayTR sandbox ödeme → entitlement → aktivasyon | İzole sandbox credentials ve callback URL gerektirir; release öncesi zorunlu dış kabul testi |
