# Yenomi ID — P0 Route Stability v29

## Uygulanan düzeltmeler

### 1. Persistent corporate shell
`app/kurumsal/panel/layout.tsx` eklendi. Kurumsal panelin sidebar + topbar + içerik shell'i artık ortak `/kurumsal/panel` layout segmentinde tek kez mount ediliyor.

Alt route'lar (`calisanlar`, `kartlar`, `roller`, `sablon`, `icerik`, `istatistikler`, `lisans`, `organizasyon`, `ayarlar`) artık ikinci bir `CorporatePanelClient` render etmiyor.

### 2. Route content isolation
Alt route `page.tsx` dosyaları route marker olarak boş render ediyor. Görüntülenecek içerik `CorporatePanelClient` tarafından pathname'den türetiliyor.

Bu yapı:
- önceki route'un DOM'unun yeni route'a sızmasını,
- aynı panelin iki kez mount edilmesini,
- header/sidebar'ın route değişiminde gereksiz yere unmount olmasını
engellemek için kullanılıyor.

### 3. Zero-frame stale route protection
`CorporatePanelClient` artık `pathname -> currentTab` eşlemesini doğrudan render kararlarında kullanıyor. React state (`activeTab`) güncellenmeden önceki route'un içeriğinin tek karelik görünmesi engelleniyor.

### 4. Scoped data errors
Önceden `Çalışanlar yüklenemedi.` gibi bir hata global `loadingError` içine yazıldığı için Ayarlar/Şablonlar gibi ilgisiz ekranların üstünde de görünebiliyordu.

Artık çalışan, şablon ve fiziksel kart hataları ilgili panel sekmesine scoped tutuluyor. Genel Bakış, çalışan verisine ihtiyaç duyduğu için çalışan veri hatasını yalnızca Genel Bakış + Çalışanlar yüzeylerinde gösteriyor.

### 5. Duplicate route loading UI kaldırıldı
`app/kurumsal/panel/loading.tsx` artık boş. Loading state tek kaynak olarak `CorporatePanelClient` içinde kalıyor; böylece persistent shell ile Next route loading ekranının üst üste binmesi önleniyor.

## Doğrulama

- `npm run typecheck` → PASS
- `npm run build` → bu Linux çalışma ortamında Next SWC'nin yalnızca macOS ARM binary'si bulunduğu için ağdan Linux SWC indirmeye çalıştı; registry erişimi olmadığı için çalıştırılamadı. Kod tipi doğrulaması temiz.

## Bilinçli olarak yapılmayanlar

- Supabase / DB / migration değişikliği yok.
- Auth kontratı değişmedi.
- Public profile ve bireysel panel davranışı değiştirilmedi.
- Tasarım tokenlarına yeni global override eklenmedi.
