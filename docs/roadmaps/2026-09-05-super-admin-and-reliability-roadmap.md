# Super Admin, güvenlik ve operasyon yol haritası

## Bu değişimde entegre edilen temel

- **Public profil kapısı:** Kayıp, askıda, iade edilmiş veya hizmet süresi bitmiş kartların kişisel verileri artık public RPC üzerinden hiç dönmez. Arayüzde saklamak yerine veritabanı kapısında engellenir.
- **Arama görünürlüğü:** `/p/{public_id}` rotası artık middleware tarafından koşulsuz `noindex` yapılmaz. Profil sahibinin açık rızaya dayalı arama motoru tercihi metadata katmanında uygulanır.
- **Kalıcı kimlik ilkesi:** Eski ad-soyad tabanlı statik profil fallback'i kaldırıldı. Paylaşımın tek kalıcı hedefi opaque `public_id` rotasıdır.
- **Admin tahsisi:** `admin_access_grants`, reklam/hediye/destek amacıyla verilen bireysel Premium erişimini gerçek satış, fatura ve ödeme kayıtlarından ayrı tutar. Süresiz veya süreli; yenilemesiz, ücretli yenileme ya da manuel yenilemeli tanımlanabilir.
- **Yenomi ID destek sorgusu:** AAL2 Super Admin ekranı 12 haneli Yenomi ID ile kullanıcı, tahsis, sipariş, ödeme girişimi, fatura işi ve sistem hata kaydını birlikte getirir; görünen ad değişikliği ayrı denetim kaydıyla yapılır.
- **Kısıtlı hukuki bilgi değişikliği:** Resmî şirket bilgileri normal kullanıcıya kilitli kalır. Yalnız AAL2 Super Admin çağrısı, öncesi/sonrası denetim kaydıyla güncelleyebilir.
- **Kart editörü:** Etkin bölüm, observer tahminiyle değil kullanıcının gerçekten geçtiği bölüm başlığıyla seçilir. Sekme rayı sayfayı yukarı çekmez.

## Sıradaki uygulama paketleri

### P0 — canlıya çıkmadan önce

1. Yeni migration’ları staging ve production Supabase ortamına uygula; public RPC için `LOST`, `SUSPENDED`, `REFUNDED` ve süresi geçmiş profil denemelerini anonim SQL testiyle doğrula.
2. Destek ekranına kurumsal resmî bilgi düzenleme formunu ve kullanıcı–kurum ilişki görünümünü ekle. Yenomi ID arama, Premium tahsis formu ve salt-okunur geçmiş zaman çizelgesi hazırdır.
3. `system_error_logs` yazımını checkout, ödeme callback’i, aktivasyon ve Network Mail işlemlerine merkezi hata sarmalayıcısıyla ekle. Kullanıcıya yalnız `reference` içeren genel hata dönmeli; logda request id, hata kodu ve güvenli bağlam kalmalı.
4. Admin tahsisli Premium için Network Mail tüketim/iade fonksiyonlarını `admin_access_grants` kaynağını da atomik biçimde destekleyecek şekilde genişlet. Bu yapılana kadar tahsis formunda kredi varsayılanı `0` olmalı; kredi varmış gibi sunulmamalı.

### P1 — güvenilir operasyon

1. **Network Mail outbox:** kredi rezervasyonu → outbox kaydı → sağlayıcı gönderimi → provider mesaj kimliği → kesinleştirme/iade sırasını tek transaction ve idempotency anahtarıyla uygula.
2. **QR bağlantı akışı:** karşı profile ait dahili UUID’yi istemciden kabul etme. Kısa ömürlü imzalı scan intent ve iki taraflı açık onay olmadan iletişim bilgisi paylaşma.
3. **Checkout resume:** yalnız HMAC bearer bağlantısı yerine DB’de saklanan, tek kullanımlı/iptal edilebilir ve kısa ömürlü oturum kullan.
4. **Webhook güvenliği:** DNS yeniden bağlanma kontrolü, özel ağ bloklama, imzalı idempotency anahtarı ve teslimat günlüğü ekle.
5. **Dosya gizliliği:** `profile-images` bucket’ını private yap; public kart için kısa ömürlü signed URL üret ve mevcut public varlıkları geçir.

### P2 — satış ve yaşam döngüsü

1. Kurumsal reklam tahsisinde mevcut gerçek paket kataloğunu koru; yalnız `employee_limit=1` override’ı ve tahsis sebebini kaydet. Ayrı, satılabilir görünen sahte “1’li paket” yaratma.
2. Süreli ücretsiz hesaplarda bitişten 30/10/3 gün önce bildirim outbox’ı; süresiz tahsislerde bildirim yok; ücretli yenilemede checkout’a yönlendirme.
3. Super Admin destek ekranına rol tabanlı maskeleme, export denetimi ve her profil düzenlemesi için before/after audit kaydı ekle.
4. Mobil yönetim ekranlarında tablolara alternatif kart görünümü standardını tüm panel sekmelerine uygula; yatay scroll yalnız veri export ekranlarında erişilebilir yedek olarak kalmalı.

## Kabul kriterleri

- Tahsis, sipariş veya fatura satırı oluşturmaz.
- Tahsis iptal edildiğinde erişim bir sonraki istekten itibaren kalkar ve audit kaydı vardır.
- Normal kullanıcı resmî şirket bilgisini değiştiremez; Super Admin değişikliği aktör, zaman ve önce/sonra değeriyle izlenir.
- Kullanıcıya ham veritabanı/sağlayıcı hata metni dönmez.
- Opaque public URL kartın ömrü boyunca sabittir; alias değişse de QR/NFC çalışır.
