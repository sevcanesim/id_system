# NEXT TASKS — V45 sonrası

## Doğrulama gerekenler (kod düzeyinde net değil, canlı ortamda kontrol edilmeli)
1. **Kurumsal panel "Genel Bakış" sonsuz yükleniyor durumu**
   `CorporatePanelClient.tsx` satır ~1262/1371/1486: `{loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"}`.
   Videoda bu alan kalıcı olarak yükleniyor gibi görünüyordu. Bu bir CSS
   sorunu değil; `subscription` verisinin fetch edilip edilmediğiyle
   ilgili — yerel ortamda Supabase bağlantısı/seed verisi eksik olabilir.
   Prod/staging'de tekrar test edilmeli.
2. **`/urunler/nfc-kart` üzerinde anlık çift header + 404**
   Kayıtta bir kare boyunca iki farklı header (biri "Hesabım", diğeri
   "Giriş Yap") ve "Bu sayfa bulunamadı" görünüyor. `app/urunler/nfc-kart/page.tsx`
   mevcut ve `not-found.tsx` kendi `SiteHeader`'ını render ediyor — kod
   düzeyinde çakışma yok, bu muhtemelen dev server HMR/recompile anına denk
   gelen geçici bir görüntü. Prod build'de tekrarlanmıyorsa göz ardı
   edilebilir.

## Karar gerektiren (bilinçli tasarım tercihi olabilir, otomatik değiştirmedim)
3. **Lisanslar sayfası "Paketi Seç" butonu mor (`ds-button--accent`)**
   `CorporatePanelClient.tsx` satır ~1605. Marka renklerinden biri
   (#6D3DE0) olduğu için kasıtlı bir "farklı vurgu" olabilir, ama sitenin
   geri kalanında birincil CTA hep altın (`ds-button--primary` /
   `home-mockup__button--gold`). Kurumsal satın alma gibi en kritik aksiyon
   için CTA hiyerarşisini tek renge (altın) sabitlemek ister misiniz?
4. **Yardım Merkezi'ndeki FAQ ikonu / boşluk** — video karesinde ilk FAQ
   kartında farklı bir ikon ve altında büyük boş alan görülüyor gibiydi;
   ancak `destek/page.tsx`'teki `.support-faq` bileşeni kod düzeyinde
   tam stilli ve tutarlı. Düşük çözünürlüklü kare yanıltıcı olabilir —
   canlıda tekrar gözle kontrol edilmeli.

## Premium Product Framework — henüz yapılmayan geniş kapsamlı işler
Paylaştığınız 8 maddelik çerçeveden, bu oturumda **acil/kırık olanları**
düzelttim (madde 5 — component consistency, en kritik ihlaller). Şunlar
hâlâ bekliyor ve ayrı, odaklı oturumlar gerektiriyor:

- **Madde 4 — Spacing sistemi**: `--space-1..10` (4/8/12/16/24/32/48/64/96/128)
  token seti zaten `canonical.css`'te tanımlı (satır ~4481) ama kod
  genelinde tutarlı kullanılmıyor; çoğu yer hâlâ serbest piksel değerleri
  kullanıyor (18px, 27px, 35px gibi rastgele değerler CSS'te mevcut).
  Tüm dosyayı token'lara geçirmek büyük, ayrı bir refactor gerektirir.
- **Madde 3 — Typography sistemi**: H1/body/CTA/secondary kontrast
  hiyerarşisi bazı sayfalarda güçlü (anasayfa), bazılarında zayıf
  (kurumsal panel iç sayfaları hâlâ generic görünüyor).
- **Madde 6-7 — Micro-interaction & Motion system**: Şu an hover/focus
  geçişleri var ama sistematik bir "fast/standard/emphasis" süre skalası
  (120-160 / 200-250 / 300-450ms) kodda tanımlı değil.
- **Madde 8 — Product photography/mockup kalitesi**: `nfc-kart-hero.png`
  ve `YenomiProductVisual` bileşenleri gözden geçirilmedi bu oturumda.

Öncelik sırası önerim: önce madde 5'in geri kalanı (paneldeki diğer
sayfaları tek tek tarayıp benzer "tanımsız class" kalıntısı var mı diye
kontrol etmek), sonra madde 4 (spacing token migrasyonu).

## V45.1 sonrası — sırada ne var
Motion sistemi ve tek-CTA hiyerarşisi artık global token/desen olarak
mevcut. Sıradaki en yüksek etkili adımlar:
1. **Ürün sayfası (`/urunler/nfc-kart`) ve kurumsal satış sayfası
   (`/kurumsal`)** hero'larına aynı "tek CTA + sakin ikincil link" deseni
   uygulanmalı — şu an hâlâ çoklu eşit-ağırlıklı buton düzeninde olabilirler.
2. **Kart görselleri / mockup kalitesi (madde 8)** hiç ele alınmadı —
   `YenomiProductVisual` bileşeni ve `nfc-kart-hero.png` gerçek kullanım
   senaryosu / perspektif / lighting açısından ayrı bir oturumda
   değerlendirilmeli.
3. **Spacing token migrasyonu** şimdilik sadece anasayfa hero'sunda yapıldı;
   kurumsal panel ve checkout akışı hâlâ keyfi piksel değerleri kullanıyor.

## V45.2 sonrası
1. **Orphan kod temizliği**: `app/urunler/nfc-kart/NfcPurchasePanel.tsx` ve
   `MobileBuyBar.tsx` hiçbir yerden kullanılmıyor. Silinsin mi, yoksa
   gelecekte bu bileşene mi geçilecek (örn. quantity stepper + varyant
   seçici `ProductBuy.tsx`'te yok, `NfcPurchasePanel`'de var — belki
   asıl niyet buydu ve sayfa yanlışlıkla eski `ProductBuy`'da kalmış)?
   Bu, gerçek bir ürün kararı — kod incelemesiyle çözülemez.
2. **Diğer sayfalarda benzer "unstyled component" taraması**: Bu üç pas
   boyunca bulunan kalıp hep aynıydı — JSX doğru, CSS class'ı unutulmuş.
   Kartlarım (`/kartim`), Siparişlerim (`/siparislerim`), İstatistikler
   (`/istatistikler`) gibi henüz taranmamış sayfalarda aynı sorun olabilir.
3. **10. madde — Conversion architecture**: Her sayfanın "bir sonraki
   adım" akışını (Landing→Ürün→Sepet→Checkout→Aktivasyon) uçtan uca test
   etmek için gerçek bir kullanıcı denemesi (staging'de) gerekiyor; kod
   incelemesiyle akış kırıklarını tam tespit edemem.
