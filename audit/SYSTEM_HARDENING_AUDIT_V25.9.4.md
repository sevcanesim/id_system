# Yenomi ID — Güncel Ödeme Güvenliği Notu

**Durum:** 6 Eylül 2026 itibarıyla PayTR tek ödeme sağlayıcısıdır.

Bu belge, PayTR öncesi ödeme akışıyla yazılmış denetim notunun yerine geçer.
Önceki sürüm Git geçmişinde korunur; güncel davranışın teknik kaynağı değildir.

## Geçerli ödeme sözleşmesi

- Checkout yalnız PayTR için oturum oluşturur; T.C. kimlik numarası istenmez veya saklanmaz.
- Kart verisi Yenomi ID sunucularına gelmez; PayTR'nin barındırılan ödeme iframe'inde işlenir.
- Ödeme sonucu yalnız imzalı PayTR callback'i ve atomik kesinleştirme akışıyla `PAID` olur.
- Sağlayıcı oturum anahtarı veritabanında şifreli tutulur ve tarayıcıya dönmez; iframe erişimi HttpOnly sunum sırrıyla sınırlandırılır.
- Production derlemesinde tarayıcı source map'leri kapalıdır; sunucu anahtarları istemci paketine dahil edilmez.

## Kalan operasyon koşulları

- Staging'de gerçek PayTR sandbox callback ve tekrar denemesi doğrulanmadan production yayını yapılmaz.
- PayTR merchant anahtarları, `PAYTR_PRESENTATION_ENCRYPTION_KEY`, Redis ve production hukuk değişkenleri `verify:production-env` kontrolünden geçmelidir.
- Web uygulaması görünür durumdayken işletim sistemi ekran görüntüsünü engelleyemez. Hassas ödeme görünümü sekme/app değişiminde maskelenir; bu, ekran görüntüsü butonu için DRM değildir.
- Yönetilen cihazlarda ChatGPT/benzeri tarayıcı uzantıları sayfa içeriğini okuyabilir. Hassas operasyonlarda bu uzantılar kurumsal tarayıcı politikasıyla devre dışı bırakılmalıdır.

## Doğrulama komutları

```bash
npm run verify:paytr-payment
npm run verify:release
npm run verify:production-env
```
