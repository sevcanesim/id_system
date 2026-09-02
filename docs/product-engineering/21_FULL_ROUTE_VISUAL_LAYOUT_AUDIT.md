# Yenomi ID — Full Route Visual & Layout Audit

Tarih: 3 Eylül 2026
Branch: `audit/full-47-route-visual-layout`
Baseline: `main@7b87a360`

## Kapsam

Kullanıcı tarafından verilen route inventory 42 route girdisi içeriyordu. Repository ağacında kullanıcıya açık iki ek gerçek sayfa doğrulandı: `/aktivasyon` (`app/aktivasyon/page.tsx`) ve `/kurumsal/davet` (`app/kurumsal/davet/page.tsx`). Audit envanteri böylece **44 doğrulanmış kullanıcı yüzüne** çıktı. "47 sayfa" hedefiyle kalan 3 route, gerçek `app/**/page.tsx` kaynağı doğrulanmadan uydurulmayacak; admin/API/internal yüzeyler sırf sayıyı tamamlamak için eklenmeyecek.

Viewport matrisi: 375, 390, 768, 1280 ve 1920 px. Mevcut `responsive-master.spec.ts` ayrıca 320, 360, 430, 820, 1024, 1440, 1512 ve 1728 px sınırlarını kapsıyor.

## Doğrulanmış bulgular

| Sayfa rotası | Kategori | Tespit edilen problem | Uygulanan / hedef çözüm |
| --- | --- | --- | --- |
| `/kurumsal/panel/calisanlar` | Typography | `team-management.css` içinde 9px, 9.5px ve 10.5px kullanıcı metinleri canonical 11px minimum ölçeğinin altındaydı. | `--type-xs`, `--type-sm`, `--type-body-sm` tokenlarına taşındı. |
| `/kurumsal/panel/calisanlar` | Controls | Toolbar/input/action kontrollerinin bir bölümü 30–38px aralığındaydı. Mobil erişilebilirlik hedefi 44px ile tutarsızdı. | Etkileşimli kontroller `--control-height-md` (44px) ile hizalandı. |
| `/kurumsal/panel/calisanlar` | Spacing / radius | Aynı yüzeyde çok sayıda lokal spacing/radius değeri bulunuyordu. | Uygun alanlar `--space-*`, `--radius-*`, `--border`, `--surface-*` tokenlarına bağlandı. |
| `/kurumsal/panel/calisanlar` | Drawer | Çalışan drawer kapatma kontrolü desktopta 40px, tablar 38px idi. | Drawer close ve tab kontrolleri 44px standardına getirildi. |
| Public + Commerce route matrisi | QA contract | Runtime typography kontrolü font family ve line-height kontrol ediyor ancak `<11px` metni yakalamıyordu. | Visual layout suite'e computed `font-size < 11px` ihlali eklendi. |
| Public + Commerce mobil | QA contract | Genel visual-layout suite 44px touch-target invariantını kontrol etmiyordu. | 375/390px renderlarda görünür non-inline kontroller için 44px minimum kontrolü eklendi. |
| `/aktivasyon` + `/kurumsal/davet` | Coverage | İlk 42 route listesinde yoktu; ikisi de gerçek kullanıcı-yüzü `page.tsx` route'u. | Visual layout matrisine güvenli token fixture env'leriyle eklendi. Fixture yoksa bilinçli skip. |
| Individual + Corporate authenticated routes | Coverage | Public visual-layout suite auth route'larını bilinçli atlıyor. | Ayrı `authenticated-visual-layout.spec.ts` oluşturuldu ve Authenticated Surfaces workflow'una bağlandı. Secret/fixture yoksa PASS sayılmadan skip edilir. |
| Dinamik public card routes | Coverage | Dinamik route testleri E2E env fixture yoksa skip ediliyor. | `E2E_PUBLIC_SLUG`, `E2E_PUBLIC_ID`, `E2E_CARD_CODE`, `E2E_EVENT_PUBLIC_ID` fixture'larıyla runtime doğrulama gerekli. |

## Tasarım sistemi kararı

- Yeni `!important` eklenmedi.
- `design-tokens.css` veya global selector sözleşmesi değiştirilmedi.
- Yeni bir spacing/radius/font ölçeği oluşturulmadı.
- Kullanıcı metninde canonical minimum `--type-xs: 11px` kabul edildi.
- Form ve aksiyon kontrollerinde mobil minimum yükseklik `--control-height-md: 44px` kabul edildi.
- Public pazarlama H1 ölçeği mevcut canonical display sistemini kullanmaya devam eder; panel sayfa başlıkları için ürün bağlamına göre 24–32px aralığı korunur.

## Runtime doğrulama durumu

Önceki head `816490ae` için Quality Gate source-quality + browser regression PASS oldu. Yeni audit commitleri için Actions yeniden çalışır; yeni head tamamlanmadan tüm 44 route için runtime PASS iddiası yapılmaz. Authenticated suite yalnızca güvenli GitHub Secrets/fixture mevcutsa gerçek signed-in render doğrular.

## Sonraki audit dalgaları

1. Repository ağacından kalan kullanıcı-yüzü `page.tsx` route'larını doğrulayıp 44/47 farkını kapat.
2. Public + commerce workflow çıktılarındaki gerçek overflow/typography/touch-target fail'lerini route bazında düzelt.
3. Individual panel CSS/TSX kaynaklarında font-size, container gutter, preview fit ve uzun metin containment taraması.
4. Corporate `/roller`, `/sablon`, `/organizasyon`, `/icerik` ve analytics yüzeylerinde tablo/preview/equal-height taraması.
5. Authenticated demo fixture mevcut olduğunda gerçek signed-in render matrisindeki ihlalleri kapat.
