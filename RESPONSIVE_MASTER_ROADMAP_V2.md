# Yenomi ID — Responsive/UI Finalizasyon Yol Haritası v2 (2026-09-01)

## Bu belge neyin üzerine kuruldu

Bu yol haritası iki girdiye dayanıyor:

1. Kullanıcının elindeki 686 maddelik Türkçe "master QA prompt"u (tarih: önceki oturumlar, ekran görüntüsü toplama moduyla ilerleyen bir responsive audit playbook'u). Bu belge bir **taksonomi/checklist**'tir, kendisi bir uygulama planı değildir — kendi 440. ve 257. maddeleri de bunu söylüyor ("kullanıcı BİTTİ demeden final prompt üretme, o zaman konsolide et").
2. Repository'de zaten var olan `RESPONSIVE_FINALIZATION_ROADMAP.md` — bu, 686 maddelik listenin ilk konsolidasyon denemesi. 8 branch'lik bir faz planı, severity gate'leri, viewport matrisi ve repo'ya özgü ilk bulguları içeriyor.

## Kritik gerçeklik kontrolü (bu oturumda repo üzerinde doğrulandı)

Yol haritasını yazmadan önce repoyu canlı kontrol ettim, çünkü kullanıcı "bu liste eski" dedi ve bu doğru çıktı:

- `RESPONSIVE_FINALIZATION_ROADMAP.md` baseline'ı `3c5040e0` commit'i. Bugünkü `main`, o baseline'dan **264 commit ileride**.
- `responsive/01-foundation-shell-v2` ve `responsive/02-home-products` branch'leri **oluşturulmuş ama hiç iş işlenmemiş** (main'e göre 0 commit ileride, 264+/248+ commit geride). Yani Faz 1 ve Faz 2 planlandı ama fiilen hiç başlanmadı; branch'ler terk edilmiş durumda.
- Aktif çalışma şu anda `feat/super-admin-operations` branch'inde (main'e göre 35 commit ileride) ve konusu responsive değil: fiziksel kart üretim/kargo state machine'i, Network Mail kota yönetimi, kurumsal kapasite yenileme batch'leri, dinamik fiyatlandırma — yani `implementation_plan.md`'deki Super Admin Operations işi.
- `origin`'de **250+ branch** var (`cursor/*`, `feat/*`, `fix/*`, `refactor/*`, `backup/*`, `tmp-ignore-*`). Bu ölçekte branch sprawl, herhangi bir responsive branch'in birkaç gün içinde tekrar bayatlayacağının kanıtı — bu repo'da main günde ortalama 100+ commit hızıyla ilerliyor.
- Global CSS katmanı riski doğrulandı: `app/` kökünde en az 13 "geniş kapsamlı" CSS dosyası var (`canonical.css`, `design-system.css`, `design-tokens.css`, `homepage.css`, `homepage-responsive.css`, `mobile-canonical.css`, `public-system.css`, `public-header-unified.css`, `public-chrome-premium.css`, `authentic-enterprise.css`, `employee-management.css`, `theme-policy.css`, `ui-contract-v25.css`). Bu, orijinal roadmap'in "cascade ownership major regression risk" tespitini doğruluyor.
- Route envanteri şu anda gerçekten var: `/`, `/urunler`, `/urunler/nfc-kart`, `/sepet`, `/odeme` (checkout), `/nasil-calisir`, `/destek`, `/kurumsal` + `/kurumsal/panel`, `/giris`, `/hesabim`, `/kartim`, `/kartlarim`, `/aktivasyon`, `/nfc-siparis`, `/yenile`, `/olustur`, `/leadler`, `/istatistikler`, `/ayarlar`, `/admin`, legal sayfalar (`/kvkk`, `/gizlilik`, `/hizmet-sartlari`, `/mesafeli-satis-sozlesmesi`, `/iade-iptal`). 686 maddelik listenin varsaydığı route isimleri (`/products`, `/cart`, `/checkout`, `/login`, `/corporate`, `/help`) bunlarla birebir örtüşmüyor — **gerçek path isimleri kullanılmalı**, madde 4 ve 682 zaten bunu söylüyor.
- `package.json` içinde kapsamı farklı birçok `verify:*` script'i var (`verify:phase1..20`, `verify:faz1..10`, `verify:ui-system`, `verify:typography`, `verify:css-architecture`, `verify:premium-ui`, `verify:corporate-leads`, `test:e2e`, `test:critical`). Bu, projenin kendi QA/release disiplinini zaten kurduğunu gösteriyor — yeni bir doğrulama sistemi icat etmek yerine bunlar kullanılmalı ve bozuk olanlar onarılmalı.

**Sonuç:** 686 maddelik liste kavramsal olarak hâlâ geçerli (responsive prensipleri, önceliklendirme mantığı, kontrol listeleri sağlam), ama üzerine kurulu ilk roadmap artık baseline olarak kullanılamaz. Aşağıdaki plan, aynı 8 fazlı iskeleti korur, ama Faz 0'ı yeniden tanımlar ve her fazı gerçek route/CSS/script envanterine bağlar.

---

## FAZ 0 — Baseline ve Branch Hijyeni (YENİ, önce bu yapılmadan hiçbir responsive branch açılmamalı)

Eski listede yoktu çünkü o liste "kod zaten durağan" varsayıyordu. Bu repoda değil.

1. `feat/super-admin-operations` için karar ver: main'e merge mi edilecek, yoksa responsive işiyle paralel mi devam edecek? Responsive branch'ler bu karardan **sonra** açılmalı; aksi halde Faz 1 daha bitmeden tekrar 264 commit geride kalır.
2. `responsive/01-foundation-shell-v2` ve `responsive/02-home-products` branch'lerini sil veya "abandoned" olarak işaretle. Sıfırdan, güncel `main`'den yeniden aç.
3. Branch envanteri: `origin`'deki 250+ branch içinde hangileri merge edilmiş (silinebilir), hangileri `backup/*` (arşive taşınmalı), hangileri gerçekten açık iş (`feat/*`, `fix/*`). Bu bir P1 repo-hijyen görevi olarak ayrı raporlanmalı — responsive işini bloklamaz ama paralel yürütülmeli.
4. Her faz branch'i **48 saatten uzun açık kalmamalı**. Bu repo'nun commit hızında (main'de ~36 saatte 264 commit) daha uzun süren branch'ler baştan kayıp demektir. Büyük fazlar (örn. Kurumsal — 258-439. maddeler) alt-branch'lere bölünmeli.
5. `npm run verify:ui-system`, `verify:typography`, `verify:css-architecture`, `typecheck`, `build` script'lerini güncel `main` üzerinde bir kez çalıştırıp gerçekten yeşil mi doğrula. Kırık script varsa onu düzeltmek Faz 0'ın parçasıdır — kırık bir gate üzerine responsive fix kabul edilemez.

**Çıkış kriteri:** Tek bir güncel, yeşil `main` baseline; branch kararı netleşmiş; core verify script'leri çalışır durumda.

---

## Öncelik sistemi (686 maddelik listeden aynen taşınıyor, değişmedi)

| Seviye | Tanım | Örnek |
|---|---|---|
| **P0** | Kullanımı bozan | horizontal overflow, gizli/erişilemez CTA, checkout/login submit'e ulaşılamıyor, drawer kilitleniyor, sticky CTA Safari toolbar arkasında |
| **P1** | Görsel/tutarlılık kalitesini ciddi düşüren | başlık kırılması, aşırı whitespace, tutarsız header varyantı, tablo taşması, footer aşırı yüksekliği |
| **P2** | Cila | 4-8px hizalama, border/shadow tonu, ikincil boşluk ayarı |

P0/P1 bitmeden P2'ye geçilmez. Her fazın "definition of done"ı: o faz kapsamındaki route'larda P0 = 0, P1 = 0 (veya açıkça gerekçeli/raporlanmış).

---

## Fazlar (repo'daki gerçek route'lara bağlanmış)

### Faz 1 — Foundation Shell (`responsive/01-foundation-shell-v2`, yeniden açılacak)
**Kapsam:** design token/breakpoint envanteri, `PublicSiteShell` header varyant kontratı (`marketing` / `commerce` / `support-legal` / `auth` / `checkout`), announcement bar, footer, mobile gutter/safe-area/touch-target/z-index kontratları, sticky/fixed envanteri, 13 global CSS dosyasının cascade sahiplik analizi.
**686 madde referansı:** 6, 8-9, 20-23, 68-71, 78-82, 108, 168-171, 202-204, 237-241, 376-380, 536-539, 649, 660-663.
**Kritik uyarı:** `SiteHeader`'ın zaten mobile drawer focus-trap, Escape, scroll-lock içerdiği not edilmiş — sıfırdan yazmadan önce mevcut implementasyonu oku ve gerçekten eksik olanı düzelt (madde 209-211 ile örtüşüyor).
**Doğrulama:** `verify:ui-system`, `verify:css-architecture`, `typecheck`, `build`.

### Faz 2 — Home + Ürünler (`responsive/02-home-products`, yeniden açılacak)
**Kapsam:** `/`, `/urunler`, `/urunler/nfc-kart`. Hero/display tipografi, paket kartları, trust row, karşılaştırma, FAQ, sticky satın alma CTA.
**686 madde referansı:** 7, 10-19, 61-90, 105-111, 180-182, 226-234.
**Ayrı iş parçası (bloklamaz, paralel):** fiyat/SKU source-of-truth doğrulaması (madde 88-89, 275-276, 356-357) — bu bir "business truth" sorusu, UI fix'i içine gizlenmemeli, ayrı raporlanmalı.
**Doğrulama:** `verify:phase4:public`, `verify:premium-ui`, `verify:typography`.

### Faz 3 — Commerce (`responsive/03-commerce`)
**Kapsam:** `/sepet`, `/odeme`. Cart badge, quantity control, order summary, checkout CTA, boş sepet state, hata/loading state.
**686 madde referansı:** 46-63, 92-95.
**Kritik uyarı (madde 49-50):** UI fiyatı payment authority değildir — server-side fiyat/quantity doğrulaması var mı, kod üzerinden kontrol edilmeli; responsive fix bahanesiyle business logic değiştirilmez.
**Doğrulama:** `verify:phase5:commerce`, `verify:commerce-ops`, `test:critical`.

### Faz 4 — Nasıl Çalışır + Destek (`responsive/04-how-support`)
**Kapsam:** `/nasil-calisir`, `/destek`.
**Not:** Mevcut `/nasil-calisir` implementasyonu sadeleştirilmiş 4 adımlık semantik akış — 686 maddedeki "yatay scroll step navigasyonu, physical card configurator, live editor demo" tasviri (112-249. maddeler) **artık geçerli değil**. Repo gerçeği kazanır; bu maddeler referans/ilham olarak kullanılır, birebir uygulanmaz.
**686 madde referansı (halen geçerli kısım):** 441-473 (Yardım Merkezi — arama, kategori kartları, FAQ accordion, direct support CTA).
**Doğrulama:** `verify:phase4:public`, mevcut FAQ/search bileşenleri için erişilebilirlik testi.

### Faz 5 — Kurumsal (`responsive/05-corporate-public`)
**Kapsam:** `/kurumsal` (public sales sayfası — panel değil). Çalışan yönetimi preview, kapasite tablosu, Network Mail, 100+ lead formu, analytics preview.
**686 madde referansı:** 150-439 (bu blok en yoğun ve en riskli — tablo taşması, form UX, demo-vs-gerçek capability etiketleme).
**Kritik uyarı (madde 365-366, 647-648):** Landing'de gösterilen her enterprise capability (analytics, Network Mail otomasyonu) LIVE / PARTIAL / PLANNED / DEMO-ONLY olarak sınıflandırılmalı — bu bir üründoğruluk denetimi, UI polish'i değil.
**Doğrulama:** `verify:phase10:corporate`, `verify:corporate-leads`.

### Faz 6 — Auth (`responsive/06-auth`)
**Kapsam:** `/giris` ve gerçekten var olan tüm login/signup/şifre sıfırlama state'leri.
**686 madde referansı:** 474-685 (auth shell yoğunluğu, hesap tipi switcher, form kontrolleri, OAuth, hata/loading/success).
**Kritik uyarı:** Güvenlikle ilgili bulgular (returnUrl open redirect — madde 634, enumeration — madde 669, rate-limit leak — madde 563-564) responsive fix'in İÇİNE gizlenmez, ayrı security blocker olarak raporlanır.
**Doğrulama:** `verify:phase6:auth`, `verify:security-hardening`, `verify:http-only-session`.

### Faz 7 — Authenticated Surfaces (`responsive/07-authenticated-surfaces`)
**Kapsam:** bireysel hesap (`/hesabim`, `/kartim`, `/kartlarim`, `/siparislerim`), kurumsal panel (`/kurumsal/panel/*`), `/admin`.
**Not:** Bu alan zaten aktif geliştirme altında (`feat/super-admin-operations`, `P0_ROUTE_STABILITY_V29.md`, `QA_V32_CORPORATE_DOMAIN_UX.md`). Responsive çalışması bu işi tekrar etmemeli — mevcut kontratları (persistent corporate shell, scoped data errors, V32 grid kuralları) miras alıp genişletmeli.
**Doğrulama:** `verify:phase7:dashboard`, `verify:phase10:corporate`, `verify:phase11:employees`, `verify:panel-master`.

### Faz 8 — Regresyon ve Temizlik (`responsive/08-regression-cleanup`)
**Kapsam:** cross-route regresyon geçişi, ölü/tekrar eden CSS temizliği, final viewport matrisi (320/390/430/820/1024/1440), accessibility/reflow, fixed/sticky çakışma taraması.
**686 madde referansı:** 33-34, 107-108, 200-257.
**Doğrulama:** `verify:phase20:rc`, `verify:p0:gates`, `test:e2e`, `build`.

---

## Paralel iş parçaları (fazları bloklamaz, ama ayrı raporlanır)

1. **Business/İçerik Doğruluk Denetimi** — fiyat, SKU, güvenlik iddiaları (kart numarası nerede saklanıyor?), abonelik/lisans terminolojisi tutarlılığı. Kaynak: madde 88-89, 275-276, 356-361, 468, 647-648. Ürün/iş sahibi onayı gerektirir.
2. **Güvenlik İncelemesi** — auth enumeration, open redirect, rate-limit leak, raw backend hata sızıntısı. Kaynak: madde 563-565, 634-637, 668-670.
3. **Repo Hijyeni** — 250+ branch triage, stale/backup branch temizliği. Responsive işiyle aynı anda ama ayrı sahiplikte yürür.

---

## Her faz için "Definition of Done"

- Faz kapsamındaki route'larda 320/390/430/820/1024/1440 genişliklerinde `document.documentElement.scrollWidth > window.innerWidth` hiçbir yerde `true` değil.
- P0 sayısı = 0. P1 ya çözülmüş ya da açık gerekçeyle sonraki faza taşınmış.
- İlgili `verify:*` script'leri + `typecheck` + `build` yeşil.
- Gerçek tarayıcıda (DevTools CSS incelemesi yetmez) en az mobile/tablet/desktop 1'er ekran görüntüsü kanıtı.
- Komşu route'larda regresyon kontrolü yapılmış (örn. header düzeltmesi → homepage + ürünler + kurumsal + checkout tekrar bakılmış).
- Business logic / fiyatlandırma / auth policy değişmemiş, ya da değişikliği gerektiren bulgu ayrı blocker olarak raporlanmış.

## Final rapor formatı (her faz sonunda, 686 maddelik listenin 38. maddesinden aynen taşınıyor)

```
FINAL VERDICT — Faz N
Status: PASS / PASS WITH MINOR ISSUES / BLOCKED
Completed: <yapılan düzeltmeler>
Responsive QA: Mobile / Tablet / Desktop → PASS/FAIL
Tested Viewports: <liste>
Validation: lint / typecheck / build / verify:* sonuçları
Remaining Issues: route + viewport + severity + neden + önerilen aksiyon
Changed Files: <liste>
Commit: <hash + mesaj>
```

---

## Önerilen hemen atılacak 3 adım

1. `feat/super-admin-operations` için merge/park kararını netleştir (Faz 0, madde 1).
2. `responsive/01-foundation-shell-v2` ve `responsive/02-home-products` branch'lerini terk edilmiş kabul edip güncel `main`'den yeniden aç.
3. `verify:ui-system`, `verify:typography`, `verify:css-architecture`, `typecheck`, `build` script'lerini güncel `main` üzerinde çalıştırıp gerçekten yeşil olduklarını doğrula — Faz 1'e bu olmadan başlanmaz.
