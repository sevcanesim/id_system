# Yenomi ID — CSS Parçalama Uygulama Planı

## Durum ve amaç

Bu belge, `app/canonical.css` içindeki tarihsel kuralları davranışı değiştirmeden
alan sahiplerine taşıma planıdır. Uygulama değişikliği değildir: bu belgeyle hiç
selector taşınmaz ve `canonical.css` büyütülmez.

3 Eylül 2026 envanterinde `app/canonical.css` 17.053 satırdır. Bu, bakım için
P3 öncelikli bir borçtur; tek başına güvenlik ya da release engeli değildir.
Parçalama, yalnızca aşağıdaki sahiplik ve kanıt kurallarıyla yapılır.

## Sahiplik sınırları

| Alan | Hedef sahip | Kapsam |
| --- | --- | --- |
| Legacy cascade | `app/canonical.css` | Geçici uyumluluk katmanı; yeni kural eklenmez. |
| Foundation | `app/styles/canonical-foundation.css` | Reset ve token olmayan ortak yapısal ilkeller. |
| Public | `app/styles/canonical-public.css` | Pazarlama, destek ve yasal sayfalar. |
| Products | `app/styles/canonical-products.css` | Katalog, NFC ürün ve nasıl-çalışır yüzeyleri. |
| Corporate | `app/styles/canonical-corporate.css` | Kurumsal/enterprise yönetim yüzeyleri. |
| Account | `app/styles/canonical-account.css` | Giriş, hesap, bireysel kart ve profil. |
| Commerce | `app/styles/canonical-commerce.css` | Sepet, checkout, ödeme ve sipariş. |
| Panel patches | `app/kurumsal/panel/*.css` | Yalnız kurumsal panel; `app/kurumsal/panel/layout.tsx` sahipliğinde. |

Kurumsal panele ait on stil dosyası root layout'tan çıkarılmış ve panel layout'a
taşınmıştır. `npm run verify:clean-ui`, bu sınırı korur: public root layout bu
dosyaları import edemez, panel layout ise tamamını import etmek zorundadır.

## Her parçalama adımı

1. Taşınacak selector kümesinin tek bir ürün alanına ait olduğunu; dinamik class,
   data attribute ve runtime üretilen markup dahil aramayla kanıtla.
2. Başlangıç noktası, tanımları ve responsive override'larıyla birlikte bitişik
   bir blok seç. Blok bitişik değilse ya da birden fazla alanın cascade'ine
   bağlıysa dur; önce daha dar, güvenli bir alt küme bul.
3. Hedef modül yoksa bu plandaki isimle oluştur. Mevcut global import sırasını
   yazılı olarak kaydet ve hedef modülü aynı cascade konumuna ekle.
4. Bloku tek commit'te hedefe taşı ve eski kopyayı aynı commit'te kaldır.
   Aynı selector'ü iki aktif global dosyada bırakma.
5. Yalnız davranış koruyan taşımayı yap: spacing, renk, breakpoint veya UI
   yeniden tasarımı aynı değişiklikte yapılmaz.
6. Aşağıdaki quality gate'leri ve ilgili desktop/mobile browser senaryosunu
   çalıştır. Kanıt yoksa taşıma merge edilmez.

## İlk güvenli çalışma dilimleri

Öncelik, düşük bağımlılıklı ve yüzey sınırı net bloklardadır:

1. Legal/support ve public landing selector'leri → `canonical-public.css`.
2. Katalog/NFC ürün selector'leri → `canonical-products.css`.
3. Auth, kartım ve public profile selector'leri → `canonical-account.css`.
4. Cart/checkout/order selector'leri → `canonical-commerce.css`.
5. Kurumsal panel dışı enterprise selector'leri → `canonical-corporate.css`.

Shared reset, token köprüleri veya çok alanlı generic selector'ler son aşamada
değerlendirilir. `:root`, legacy token alias'ları ve genel element selector'leri
ilk taşıma dalgasının dışında tutulur.

## Zorunlu kanıt

Her CSS taşımasından önce ve sonra en az şunlar yeşil olmalıdır:

```sh
npm run verify:css-architecture
npm run verify:clean-ui
npm run verify:ui-system
npm run typecheck
npm run build
```

İlgili route'ların desktop ve mobile Playwright senaryoları da çalışır. Browser
çalıştırıcısı erişilemiyorsa bu durum `PASS` sayılmaz; değişiklik browser kanıtı
gelene kadar bekletilir. `!important` eklenemez, token tekrar tanımlanamaz ve
canonical dosyaya yeni kural eklenemez.

## Tamamlanma ölçütü

Bir alan, hedef modülünde tek sahipli olduğunda, eski aktif kopyası kalmadığında,
import sırası korunup yukarıdaki gate'ler ve görsel regresyonlar geçtiğinde
tamamlanmış sayılır. Dosya satır sayısındaki düşüş tek başına başarı ölçütü
değildir.
