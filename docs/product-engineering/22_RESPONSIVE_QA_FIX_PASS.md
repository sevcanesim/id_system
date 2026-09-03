# Responsive/UI QA — Düzeltme Turu (audit/full-47-route-visual-layout)

Bu tur, önceki statik audit'in devamı olarak **canlı production build üzerinde** çalıştı: DISCOVER → LIVE AUDIT → ROOT-CAUSE → IMPLEMENT → LIVE BROWSER QA → REGRESSION QA zincirini uyguladı. Aşağıda her madde için gerçek bulgu, kanıt ve (varsa) yapılan değişiklik var — varsayım yok, hepsi canlı render (Playwright + CDP `getMatchedStylesForNode`) ile doğrulandı.

## Özet tablo

| Alan | Durum | Not |
|---|---|---|
| Sticky satın alma CTA (`/urunler/nfc-kart`, `/`) | **PASS** | Zaten doğru inşa edilmiş, aşağıda detay |
| Header / cart / hamburger touch target | **PASS** | 44×44px her breakpoint'te sağlanıyor |
| Announcement bar taşması | **PASS** | 375/390px'te taşma yok |
| Hero — `/nasil-calisir` başlık tipografisi | **FIXED** | Bu turda düzeltildi |
| Hero — `/urunler` "Tanış." satır kırılımı | **PASS (yanlış alarm)** | İncelendi, aslında tutarlı 3 satırlı tasarım |
| Section spacing (sabit büyük boşluk) | **PASS** | Taranan dosyalarda 150px+ sabit magic-number bulunamadı |
| Cart ikonu masaüstünde 48/52px yerine 44px | **NEEDS FIX (rapor)** | Ölü CSS, düzeltilmedi — aşağıda neden |
| Container/breakpoint sistemi tutarsızlığı | **NEEDS FIX (rapor)** | Büyük mimari değişiklik, bu turun kapsamı dışında |
| Bireysel/Kurumsal panel sayfaları | **BLOCKED** | Gerçek Supabase test kimlik bilgisi yok |

## 1) Sticky satın alma CTA — PASS

İki gerçek sticky CTA bulundu: `.nfc-mobile-buybar` (`/urunler/nfc-kart`) ve `.home-sales-mobile-cta` (`/`). `/checkout`, `/sepet`, `/nfc-siparis`'te sticky CTA yok (zaten kontrol listesi bunu doğru varsaymış).

İkisi de:
- `env(safe-area-inset-bottom)` / `var(--safe-bottom)` kullanıyor — iOS Safari alt çubuğuyla çakışmıyor.
- Sayfa içeriğinde eşleşen `padding-bottom` var. `/` sayfasında bu değer **JS ile ölçülüp** (`--rp-mobile-dock-height`) CSS değişkenine yazılıyor; canlı testte `dockHeightVar:"74px"` ve `bodyPaddingBottom:"74px"` birebir eşleşti.
- `/urunler/nfc-kart`'taki bar, kod içindeki yorumların da belirttiği gibi (P0/P1 QA notları), IntersectionObserver ile hem hero fiyat satırını geçene kadar gizli kalıyor hem de `#nfc-page-end-sentinel` (footer'dan hemen önce) görünür olduğunda otomatik gizleniyor — yani footer/FAQ üzerine binmesi yapısal olarak engellenmiş.
- İkisi de `min-width:761px`'te `display:none`.

Bu sayfanın interaktif canlı testi (scroll simülasyonu) bu sandbox'ta ürün verisi/Supabase olmadığı için "Yenomi ID hazırlanıyor…" yükleme ekranında takıldı; davranış kod incelemesi + CSS doğrulamasıyla teyit edildi, gerçek ortamda ayrıca gözlemlenmesi önerilir.

## 2) Header / cart / hamburger — PASS

`canonical-responsive-final.css` içindeki `--responsive-hit-target:44px` kuralı, `.yi-menu`/`.yi-cart` için **her breakpoint'te** (mobil dahil masaüstü de) 44×44px'i garanti ediyor — canlı ölçümde 375px'ten 1920px'e kadar tüm viewport'larda `width:44px; height:44px` doğrulandı.

**Rapor edilen ama düzeltilmeyen bulgu:** `public-header-unified.css` ve `public-chrome-premium.css` dosyalarında cart için ayrıca 48px/52px'lik "premium" masaüstü tasarımı tanımlı, ama bu kurallar hiçbir zaman render'a yansımıyor — daha geç yüklenen `canonical-responsive-final.css`'teki 44px kuralı her yerde kazanıyor. Yani bu 48/52px kuralları **ölü kod**. Bunu değiştirmedim çünkü hangisinin "doğru" tasarım niyeti olduğu belirsiz (44px her yerde mi bilinçli bir sadeleştirme, yoksa masaüstünde 48/52px mi asıl niyet) — bu bir tasarım kararı, temizlik/karar için Design System Lead'e bırakıyorum.

## 3) Announcement bar — PASS

Üstteki bilgi barı 3 mesaj taşıyor, ≤760px'te 3. mesaj (`Güvenli iyzico ödeme`), ≤360px'te 2. mesaj da (`2 iş gününde hazırlanır`) gizleniyor. 375px ve 390px'te canlı ölçüm: kalan mesajların toplam genişliği container'ı **aşmıyor** (`overflowsContainer:false`, en sağdaki öğe 361-376px, container 375-390px). Taşma/scroll ihtiyacı yok, mevcut "breakpoint'e göre gizle" stratejisi doğru çalışıyor.

## 4) `/nasil-calisir` hero başlığı — FIXED

**Bulgu:** `.how-simple-hero__copy h1` seçicisi kod tabanının hiçbir yerinde `font-size`/`line-height`/`letter-spacing` tanımlamıyordu — CDP ile doğrulandı, sadece jenerik `--type-h1` token'ına düşüyordu. Sonuç: bu sayfanın başlığı, sitedeki diğer tüm hero başlıklarının kullandığı sıkı `line-height:.98` + negatif `letter-spacing` işlemesinden yoksundu.

Ayrıca mobilde (375-390px) "Tanışmayı devam ettir." ifadesi doğal satır kaymasıyla "devam" ve "ettir." kelimelerini iki ayrı satıra bölüyordu — bileşik yüklemi (devam etmek) görsel olarak koparıyordu.

**Düzeltme** (`app/styles/canonical-public.css`, `app/nasil-calisir/HowItWorksBoard.tsx`):
- `.how-simple-hero__copy h1`'e site genelindeki hero örüntüsüyle tutarlı `font-size:clamp(42px,4.6vw,64px)` (masaüstü) / `clamp(32px,9vw,44px)` (≤640px), `line-height:.98`, `letter-spacing:-.045em` eklendi.
- "devam ettir." arasına `&nbsp;` eklendi, kelime çifti artık her genişlikte birlikte kalıyor.

**Doğrulama:** 375/390/768/1280/1920px'te ekran görüntüsü alındı — üç satırlı ("Kartını paylaş." / "Tanışmayı" / "devam ettir.") tutarlı, yetim kelime kalmıyor. Playwright regresyon koşusunda bu değişiklik kaynaklı yeni fail yok (route/viewport bazlı fark karşılaştırması yapıldı, fark sıfır).

## 5) `/urunler` "Tanış." satır kırılımı — yanlış alarm, PASS

İlk taramada mobilde tek kelimelik "Tanış." satırının "yetim" görüneceği şüphesi vardı. Canlı ekran görüntüsüyle doğrulandı: **375px, 390px VE 1280px masaüstünde bile** aynı üç satırlı düzen oluşuyor ("Tanış." / "Bağlantıyı kaydet." / "Takibini yap.") — yani viewport'a özgü bir bozulma değil, container genişliği (max-width:680px) yüzünden her ölçekte tutarlı üretilen, kasıtlı görünen bir tasarım. Dokunulmadı.

## 6) Section spacing — PASS

`app/**/*.css` içinde clamp()/min() dışında, mobil override'ı olmayan 150px+ sabit padding/margin değeri taranarak arandı — sıfır sonuç. Mevcut spacing zaten büyük ölçüde token/clamp tabanlı.

## 7) Mimari risk alanları (bu turda dokunulmadı, rapor amaçlı)

- **Breakpoint tutarsızlığı:** `@media` sorgularında 360/430/480/639/640/680/700/720/760/768/900/980/1024/1100/1180/1200 gibi 20'den fazla farklı kesme noktası kullanılıyor; `--breakpoint-sm` gibi token'lar tanımlı ama fiilen çoğu yerde kullanılmıyor.
- **Container sistemi 3 paralel katman:** `--container-content`/`--container-wide`, `--public-container`, ve ad-hoc `.yi-container` — aynı işi gören, hafifçe farklı piksel değerleri üreten üç ayrı sistem.
- **z-index:** 27 farklı ham değer, `--z-*` token sistemi yok.
- **100vh/100dvh/100svh** üç farklı viewport-unit stratejisi karışık kullanılıyor.
- **safe-area desteği** var (33 kullanım) ama tutarsız — bazı yerlerde `var(--safe-bottom)` token'ı, bazı yerlerde ham `env(safe-area-inset-bottom)`.

Bunların hiçbiri tek başına "kırık" değil (siteyi bozmuyorlar), ama uzun vadede bakım riskini artırıyorlar. Kapsamlı bir refactor, bu oturumun "yüksek güvenli, izole fix" ilkesinin dışında — ayrı, planlı bir iş olarak ele alınmalı.

## 8) Regresyon testi

`tests/e2e/visual-layout-audit.spec.ts`, production build + Playwright ile tekrar koşuldu. Bu turun değişiklikleriyle ilişkili **hiçbir yeni fail yok** (route/viewport bazlı fark analizi yapıldı). Koşu sırasında `/destek` ve `/kurumsal`'da bu değişikliklerle ilgisiz, aralıklı 4 fail gözlendi — kaynağı `app/components/ui/States.tsx`'teki sayfa yükleme iskeleti (`YENOMI ID` etiketi, 9.5px), yani testin "load" event'i ile React hydration/veri çekme arasındaki bir yarış durumu (test kırılganlığı), bu değişikliklerden bağımsız — kod tabanında dokunulmadı.

## 9) Bilinen sınırlamalar

- Bireysel panel (`/kartim`, `/ayarlar`, `/siparislerim`...) ve Kurumsal panel (`/kurumsal/panel/*`) rotaları `auth:true` olduğu için mevcut test suite'i tarafından atlanıyor — gerçek Supabase test kullanıcı/şifre bilgisi olmadan bu sandbox'ta doğrulanamıyor.
- `/urunler/nfc-kart` sayfasının interaktif (scroll) davranışı, sandbox'ta ürün verisi yüklenmediği için sadece statik kod incelemesiyle doğrulandı, canlı scroll testiyle değil.

---
*Branch: `audit/full-47-route-visual-layout` · Bu turun commit'leri: `1abf2f5` (ve önceki turun 6 commit'i: `d811d4b`…`45333f3`)*
