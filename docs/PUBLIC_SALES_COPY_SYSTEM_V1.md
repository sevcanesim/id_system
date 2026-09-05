# Yenomi ID — Public Sales Copy System v1

**Scope:** Login gerektirmeyen pazarlama, ürün seçimi, kurumsal teklif, destek, sepet ve ödeme giriş yüzeyleri.  
**Excluded:** Hukuki metinler, onay kutuları, fiyatlar, teslimat süreleri, ödeme ve yetki iş kuralları.

## Tek cümlelik ürün mimarisi

- **Bireysel NFC:** Güncel profesyonel kimliğini paylaşmak için fiziksel NFC + QR kart ve canlı profil.
- **Bireysel Premium:** Bireysel NFC’nin üzerine bağlantı yönetimi, toplantı, sunum ve Network Mail takibi.
- **Yenomi Business:** Çalışan kimliği, kart erişimi ve marka standardını merkezi biçimde yöneten kurumsal sistem.

Bu ayrım public copy’de aynen korunur. “Premium” hiçbir yüzeyde bağımsız bir ürün gibi değil, **Bireysel Premium** olarak ifade edilir.

## Satış hunisi revizyonu

| Alan | Eski metin / yaklaşım | Yeni satış odaklı ve premium metin |
| --- | --- | --- |
| Ana sayfa hero | “Kartın konuşsun. Sen bağlantıda kal.” | “İlk izlenimin hep güncel kalsın.” Alt metin ilk üç saniyede NFC + QR, canlı profil ve Premium takip değerini açıklar. |
| Ana CTA | “Premium ile Başla” | “Bireysel Premium’u İncele” — ürün seviyesi ve sonraki adım açıktır. |
| Paket seçimi | Bireysel ve Premium ayrı aileler gibi görünür. | “Bireysel NFC”, “Bireysel Premium”, “Kurumsal” tek hiyerarşide karşılaştırılır. |
| Ürün sayfası | Premium merkezli, temel paketle ilişkisi zayıf. | “Fiziksel kartın. Canlı dijital kimliğin.” Bireysel NFC temel, Bireysel Premium gelişmiş seviye olarak anlatılır. |
| Kurumsal hero | Kart ve çalışan listesi odaklı. | “Her çalışan markanızla tanışsın.” Değer, karttan ekip kimliğine çıkarılır. |
| Kurumsal CTA | “Paketi seç”, “Teklif al”. | “Ekibiniz için kapasiteyi görün”, “Kurulum detayını ilet” — kullanıcıdan yalnız bir sonraki kolay karar istenir. |
| Güven metni | Ödeme sağlayıcısı adı tekrar edilir. | “Kart bilgilerin yalnızca PayTR’da işlenir”, “Kart numaran Yenomi’de tutulmaz.” Sınır net ve doğrulanabilir biçimde anlatılır. |
| Sepet / ödeme | “Ödemeye geç” gibi genel eylemler. | “Güvenli ödemeye geç”, “Siparişini güvenle tamamla.” İşlem değerini ve güven sınırını aynı anda taşır. |
| Ödeme istisnası | Teknik ya da suçlayıcı hata cümleleri. | “Güvenli ödeme bağlantın artık geçerli değil.” ve “Siparişin korunuyor.” Kullanıcıya durumu, nedenini varsaymadan, tek güvenli sonraki adımla açıklar. |
| Destek | Genel yardım dili. | “Doğru yanıt, bekletmeden.” “Yanıtı bul.” Kullanıcıyı arama ve çözüme yönlendirir. |
| Footer | Ürün tanımı soyut kalır. | “Bir kart. Güncel kimlik. Her tanışmada hazır.” Kısa, hatırlanabilir marka kapanışı. |

## CTA ilkeleri

1. CTA, “Devam et” veya “Satın al” yerine seçilen değeri adlandırır: **Bireysel Premium’u Seç**, **Bireysel NFC’yi Seç**, **Kapasiteleri İncele**.
2. İlk CTA bilgi gerektiren ürünlerde karar sayısını azaltır; doğrudan ödeme yerine önce doğru pakete götürür.
3. Ödeme aşamasında ikna değil, doğrulama yapılır: fiyat, teslimat, hesap bağlama ve PayTR sınırı açık kalır.
4. Güven cümleleri ölçülemez üstünlük iddiası içermez; yalnız mevcut ürün ve ödeme davranışını tarif eder.

## QA sözleşmesi

`tests/e2e/public-sales-copy.spec.ts`, her dokunulan login gerektirmeyen yüzeyde:

- ürün seviyelerinin ayrımını,
- ana CTA hedefini,
- kurumsal kapasite akışını,
- PayTR / Yenomi veri sınırını,
- destek ve ödeme sonraki aksiyonlarını
- ödeme bağlantısı ya da ödeme tamamlanamama istisnalarında güvenli geri dönüş aksiyonunu

doğrular. Bu metinler değiştirilecekse test de yeni, onaylanmış ürün diliyle birlikte güncellenmelidir.
