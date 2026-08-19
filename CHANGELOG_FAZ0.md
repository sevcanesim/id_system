# FAZ 0 — Temel Doğruluk Düzeltmeleri

Bu değişiklikler `yenomi-id-corporate-panel-only-fix.zip` üzerine uygulandı.
Her madde izole tutuldu; birbirinin veya mevcut kodun işini ezmedi.
`npx tsc --noEmit` proje genelinde 0 hata ile temiz geçti (doğrulama
aracının gerçekten çalıştığı, kasıtlı bir tip hatası enjekte edilip
yakalandıktan sonra teyit edildi).

---

## 1. Fiyat çelişkisi (₺399 vs ₺799) — DÜZELTİLDİ

**Dosya:** `app/urunler/page.tsx`

**Kök neden:** `/urunler` listeleme sayfası, `getDatabaseCatalog()`'dan gelen
`variants` dizisinin sırasız ilk elemanını (`variants[0]`) fiyat olarak
gösteriyordu. `nfc-kart` ürününün DB'de 4 varyantı var (ana paket ₺799,
yedek kart ₺399, yenileme ₺299, kayıp kart ₺349) ve bunlar `ORDER BY`
olmadan geldiği için `variants[0]` bazen yanlışlıkla "yedek kart" (₺399)
oluyordu. `/urunler/nfc-kart` detay sayfası ayrı, doğru statik config'ten
(₺799) besleniyordu — iki sayfa farklı kaynaklardan farklı fiyat gösteriyordu.

**Çözüm:** `primaryVariant()` artık `metadata.fulfillment_kind ===
"INITIAL_BUNDLE"` etiketli varyantı açıkça seçiyor, bulunamazsa eski
davranışa (ilk varyant) geri düşüyor. Veritabanına, checkout akışına,
diğer sayfalara dokunulmadı.

**Kapsam dışı bırakılanlar (bilerek):** `app/urunler/nfc-kart/*` zaten doğru
kaynağı kullanıyordu, değiştirilmedi. `app/sepet`, `app/checkout`, `app/odeme`
bu ürün config'ini kullanmıyor, etkilenmedi.

---

## 2. Çalışanlar sayfası veri yükleme hatası — SAVUNMACI DÜZELTME + LOGLAMA

**Dosya:** `app/api/organizations/members/route.ts` (yalnızca `GET` metodu)

**Kök neden:** `supabase/migrations/20260818190000_member_activity_timestamps.sql`
repoda mevcut ve doğru, ama muhtemelen canlı/demo veritabanına henüz
uygulanmamış. Sorgu `last_activity_at` kolonunu istediği için bu ortamda
Postgres "undefined_column" (42703) hatası veriyor olabilir. API bu hatayı
öncesinde sessizce yutup genel "Çalışanlar yüklenemedi." mesajı
döndürüyordu — ne panelde ne sunucu loglarında teşhis edilebiliyordu.

**Çözüm:**
- Gerçek Postgres hatası artık sunucu konsoluna loglanıyor
  (`organizationId`, hata kodu, hata mesajı ile).
- Hata kodu `42703` ise (kolon eksik), sorgu `last_activity_at` olmadan
  otomatik tekrar deneniyor; panel çökmek yerine `created_at`'e geri
  düşerek çalışmaya devam ediyor (`relativeTime(member.last_activity_at
  || member.created_at)` istemci mantığıyla uyumlu).
- Bu bir bant-aid değil: migration'ın gerçek ortama uygulanmasını
  ENGELLEMİYOR/yerine geçmiyor, sadece uygulanana kadar panelin
  kullanılabilir kalmasını sağlıyor ve sorunu net şekilde logluyor.

**Kapsam dışı bırakılanlar (bilerek):** Aynı dosyadaki `POST`, `PATCH`,
`PUT` metodlarına dokunulmadı — davet oluşturma, kimlik güncelleme, rol/
durum değişikliği akışları olduğu gibi duruyor.

**Yapılması gereken (kod dışı):** `supabase/migrations/` klasöründeki tüm
migration'ların hedef ortama (staging/production) uygulandığından emin
olunmalı — bu depodan çalıştırılabilecek bir DB işlemi değil.

---

## 3. Genel Bakış dashboard grid çöküşü — DÜZELTİLDİ

**Dosya:** `app/canonical.css`

**Kök neden:** `.v25-dashboard-grid` class'ının doğru "içerik + yan panel"
2 kolonlu düzeni, yalnızca `.p10-corporate-platform` üst class'ı DOM'da
mevcutsa devreye giren daha spesifik bir CSS kuralına (`.p10-corporate-platform
.v25-dashboard-grid`) bağlıydı. Bu ata class'ı herhangi bir nedenle
(hydration anı, ileride yeniden kullanım) geçici/eksik olduğunda, sistem
12 sütunluk genel bir fallback'e düşüyor ve 2 widget'ı (içerik alanı +
"Hızlı İşlemler" yan paneli) 12 dar sütuna bölüyordu — ekran kaydındaki
metinlerin harf harf alt alta kırıldığı çökme tam olarak buydu.

**Çözüm:** `.v25-dashboard-grid`'in projede tek kullanıcısı olduğu
doğrulandı (`app/kurumsal/panel/CorporatePanelClient.tsx`, Genel Bakış
sekmesi). Bu nedenle 12 kolonluk değerin hiçbir meşru kullanım senaryosu
yoktu, sadece bir tuzaktı. Temel (scope'suz) kuralın kendisini doğrudan
doğru 2 kolonlu değere çevirdim; artık doğruluk ata class'ının varlığına
bağımlı değil. `.p10-corporate-platform .v25-dashboard-grid` kuralı aynı
değeri tekrar vererek ek güvence olarak olduğu gibi bırakıldı (kaldırmak
gerekmiyordu, zararsız).

**Kapsam dışı bırakılanlar (bilerek):** `.v25-kpi-grid`, `.v25-card-strip`,
`.v25-two-col` gibi diğer grid class'larına dokunulmadı — bu bug'la
ilgisizler ve bağımsız çalışıyorlar.

---

## Doğrulama

```
npx tsc --noEmit -p tsconfig.json   # 0 hata
```

Sanity check: `app/urunler/page.tsx`'e kasıtlı bir tip hatası eklenip
`tsc`'nin bunu yakaladığı doğrulandı, ardından dosya orijinaline geri
yüklendi — yani yukarıdaki "0 hata" sonucu aracın gerçekten çalıştığının
kanıtıdır, sessizce geçen bir kontrol değildir.

**Yapılamayan doğrulama:** Bu ortamda canlı Supabase bağlantısı ve
`next build`/`next dev` çalıştırma imkanı yok (ağ kısıtları). Bu yüzden
gerçek veritabanı davranışı (özellikle madde 2'deki 42703 fallback yolu)
üretim/staging ortamında ayrıca test edilmeli.


## 2026-08-19 — Panel theme alignment
Corporate panel shell aligned to the logged-out/public Yenomi ID light theme. Dark surfaces remain scoped to product/card previews only.
