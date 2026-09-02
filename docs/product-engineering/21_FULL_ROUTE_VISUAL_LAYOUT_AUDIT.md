# Yenomi ID — Full Route Visual & Layout Audit

Tarih: 3 Eylül 2026
Branch: `audit/full-47-route-visual-layout`
Baseline: `main@7b87a360`

## Kapsam

Kullanıcı tarafından verilen route inventory statik kaynak, mevcut Playwright visual-layout suite'i ve responsive master suite ile karşılaştırıldı. Verilen inventory 42 route girdisi içeriyor; dinamik `/[slug]`, `/p/[publicId]`, `/c/[cardCode]`, `/e/[eventPublicId]` dahil. "47 sayfa" hedefi ile liste arasında 5 route farkı var; audit gerçek route inventory üzerinden genişletilmeye devam edecek.

Viewport matrisi: 375, 390, 768, 1280 ve 1920 px. Mevcut `responsive-master.spec.ts` ayrıca 320, 360, 430, 820, 1024, 1440, 1512 ve 1728 px sınırlarını kapsıyor.

## Doğrulanmış bulgular

| Sayfa rotası | Kategori | Tespit edilen problem | Uygulanan / hedef çözüm |
| --- | --- | --- | --- |
| `/kurumsal/panel/calisanlar` | Typography | `team-management.css` içinde 9px, 9.5px ve 10.5px kullanıcı metinleri canonical 11px minimum ölçeğinin altındaydı. | `--type-xs`, `--type-sm`, `--type-body-sm` tokenlarına taşındı. |
| `/kurumsal/panel/calisanlar` | Controls | Toolbar/input/action kontrollerinin bir bölümü 30–38px aralığındaydı. Mobil erişilebilirlik hedefi 44px ile tutarsızdı. | Etkileşimli kontroller `--control-height-md` (44px) ile hizalandı. |
| `/kurumsal/panel/calisanlar` | Spacing / radius | Aynı yüzeyde 5/6/7/8/9/10/11/12/14/18/20/24px gibi çok sayıda lokal spacing/radius değeri bulunuyordu. | Uygun alanlar `--space-*`, `--radius-*`, `--border`, `--surface-*` tokenlarına bağlandı. |
| `/kurumsal/panel/calisanlar` | Drawer | Çalışan drawer kapatma kontrolü desktopta 40px, tablar 38px idi. | Drawer close ve tab kontrolleri 44px standardına getirildi. |
| Public + Commerce route matrisi | QA contract | Runtime typography kontrolü font family ve line-height kontrol ediyor ancak `<11px` metni yakalamıyordu. | Visual layout suite'e computed `font-size < 11px` ihlali eklendi. |
| Public + Commerce mobil | QA contract | Genel visual-layout suite 44px touch-target invariantını kontrol etmiyordu. | 375/390px renderlarda görünür non-inline kontroller için 44px minimum kontrolü eklendi. |
| Individual + Corporate authenticated routes | Coverage | Mevcut visual-layout suite bu route'ları bilinçli olarak `test.skip(Boolean(route.auth))` ile atlıyor. Bu nedenle gerçek signed-in layout için PASS iddia edilemez. | Authenticated fixture/storageState kurulmadan bu yüzeyler için runtime PASS verilmeyecek; statik audit + mevcut auth-boundary suite ayrı tutulacak. |
| Dinamik public card routes | Coverage | Dinamik route testleri E2E env fixture yoksa skip ediliyor. | `E2E_PUBLIC_SLUG`, `E2E_PUBLIC_ID`, `E2E_CARD_CODE`, `E2E_EVENT_PUBLIC_ID` fixture'larıyla runtime doğrulama gerekli. |

## Tasarım sistemi kararı

- Yeni `!important` eklenmedi.
- `design-tokens.css` veya global selector sözleşmesi değiştirilmedi.
- Yeni bir spacing/radius/font ölçeği oluşturulmadı.
- Kullanıcı metninde canonical minimum `--type-xs: 11px` kabul edildi.
- Form ve aksiyon kontrollerinde mobil minimum yükseklik `--control-height-md: 44px` kabul edildi.
- Public pazarlama H1 ölçeği mevcut canonical display sistemini kullanmaya devam eder; panel sayfa başlıkları için ürün bağlamına göre 24–32px aralığı korunur.

## Runtime doğrulama durumu

Bu branchteki Playwright ve verifier sonuçları GitHub Actions çalışmadan PASS kabul edilmez. Özellikle authenticated individual/corporate route'lar mevcut visual-layout testinde skip edildiği için tüm 42/47 route'un canlı render PASS olduğu iddia edilmemelidir.

## Sonraki audit dalgaları

1. Public + commerce workflow çıktılarındaki gerçek overflow/typography/touch-target fail'lerini route bazında düzelt.
2. Individual panel CSS/TSX kaynaklarında font-size, container gutter, preview fit ve uzun metin containment taraması.
3. Corporate `/roller`, `/sablon`, `/organizasyon`, `/icerik` ve analytics yüzeylerinde tablo/preview/equal-height taraması.
4. Authenticated demo fixture ile gerçek signed-in 375/390/768/1280/1920 render matrisi kur.
5. Dinamik public profile/card/event fixture'larını workflow'a bağla.
