# PayTR hosted ödeme sağlayıcısı

## Amaç

Checkout T.C. kimlik numarası istemeden PayTR'nin barındırılan güvenli ödeme
formuna ilerler. Yenomi ID'de tek ödeme sağlayıcısı PayTR'dir; yapılandırma
eksikse ödeme başlatılmaz.

## Etkinleştirme

Sunucu ortamına aşağıdaki gizli değerlerin üçünü de ekleyin:

```text
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_TEST_MODE=true
PAYTR_PRESENTATION_ENCRYPTION_KEY=
```

`NEXT_PUBLIC_` öneki kullanmayın. Üç değer birlikte mevcut olmadıkça ödeme
başlatılmaz. Üretimde `PAYTR_TEST_MODE=false` olmalıdır.

`PAYTR_PRESENTATION_ENCRYPTION_KEY`, 32 baytlık base64url bir anahtardır. PayTR iframe token'ı bu anahtarla yalnız sunucuda şifrelenir; URL, tarayıcı geçmişi veya uygulama loglarında tutulmaz.

PayTR panelindeki bildirim (callback) adresi şudur:

```text
https://<uygulama-alani>/api/payments/paytr/callback
```

Bu adres internete açık, HTTPS üzerinden erişilebilir olmalıdır. Yerel
geliştirmede sağlayıcının ulaşabildiği güvenli bir tünel kullanmadan canlı
ödeme doğrulaması yapılamaz.

## Güvenlik modeli

- PayTR oturum token'ı yalnız sunucuda `merchant_key` ve `merchant_salt` ile
  HMAC-SHA256 imzalanarak oluşturulur.
- Tarayıcı yalnız ödeme denemesi kimliğini taşır. PayTR token'ı veritabanında
  şifreli saklanır; sayfaya kısa ömürlü, HttpOnly bir sunum çereziyle verilir.
  Kart bilgisi Yenomi'ye gelmez.
- Başarılı veya başarısız yönlendirme siparişi değiştirmez. Sipariş yalnız
  PayTR'nin imzalı sunucudan-sunucuya callback'i doğrulanınca işlenir.
- Callback tutarı, sunucuda hesaplanan sipariş tutarıyla kuruş bazında eşleşmek
  zorundadır. Callback tekrarları mevcut atomik ödeme fonksiyonuyla idempotent
  işlenir.
- Sağlayıcının serbest biçimli hata metinleri saklanmaz veya loglanmaz.

## Yayına alma kontrolü

1. Yeni migration'ı hedef Supabase ortamına uygulayın.
2. PayTR sandbox hesabında `PAYTR_TEST_MODE=true` ile bir ödeme oluşturun.
3. Callback sonrası `commerce_payment_attempts.status = PAID` ve
   `commerce_orders.status = PAID` durumlarını, ayrıca aktivasyon/kurumsal
   hak akışını doğrulayın.
4. Başarısız ödeme ve callback tekrarını deneyin; tek sipariş ve tek hak
   kaydı oluştuğunu doğrulayın.
5. Canlı anahtarlar ve callback URL'siyle üretim smoke testi yapın; ardından
   test modunu kapatın.

Yerel sandbox yapılandırmasını anahtar değerlerini göstermeden denetlemek için:

```bash
npm run verify:paytr:sandbox
```

Üretim denetimi PayTR yapılandırmasının eksiksiz olmasını ister. Eski ödeme
sağlayıcısı ortam değişkenleri bulunduğunda dağıtım engellenir.
`PAYTR_TEST_MODE=true` üretim denetiminden geçmez.

Bu depo gizli PayTR anahtarlarını içermediğinden, gerçek sandbox/canlı ödeme
doğrulaması çalışma zamanı ortamında yapılmalıdır.
