# Yenomi ID — Phase 10 Corporate Product

## Amaç
Kurumsal ürünü bireysel dashboard'un büyütülmüş hali olmaktan çıkarıp görev odaklı bir yönetim alanına dönüştürmeye başlamak; renk regresyonunu kapatmak ve kurumsal bilgi mimarisini route seviyesine taşımak.

## Renk regresyonu
- Canonical root uygulama chrome'u açık temadır.
- Koyu tema yalnız explicit dark context içindir.
- `/`, `/giris` ve kurumsal CardWizard açık premium yüzeye sabitlenmiştir.
- Gerçek kart preview/artwork koyu kalabilir.

## Kurumsal route mimarisi
- `/kurumsal/panel` — Genel Bakış
- `/kurumsal/panel/calisanlar` — Çalışanlar
- `/kurumsal/panel/kartlar` — Kartlar
- `/kurumsal/panel/sablon` — Kurumsal Şablon
- `/kurumsal/panel/icerik` — İçerik Merkezi
- `/kurumsal/panel/istatistikler` — İstatistikler
- `/kurumsal/panel/lisans` — Lisanslar
- `/kurumsal/panel/organizasyon` — Organizasyon
- `/kurumsal/panel/roller` — Roller & Yetkiler
- `/kurumsal/panel/ayarlar` — Ayarlar

Mevcut business logic tek client controller içinde korunmuştur. Bu bir güvenli migration köprüsüdür; Phase 11'de Employees ve detail lifecycle ayrı component/domain katmanlarına indirilecektir.

## Shell
- Üstteki duplicate `AppHeader` kurumsal panelden kaldırıldı.
- Kurumsal panel tek sidebar + page header modeline geçirildi.
- Mobile tabs responsive fallback olarak korunur.
- Yeni `corporate-platform.css` canonical token kullanır ve legacy dark chrome'u scope içinde bastırır.

## Korunan sistemler
Supabase, organizasyon üyelikleri, roller, employee lifecycle, invitation, template save, physical cards, analytics, content links, seat packs ve commerce akışları değiştirilmedi.
