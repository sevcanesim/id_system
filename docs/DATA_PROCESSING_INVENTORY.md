# Veri İşleme Envanteri

Bu envanter, ürün davranışının teknik sınırını açıklar; saklama süreleri,
aydınlatma metni ve hukuki dayanak hukuk danışmanı onayı olmadan değiştirilmez.

| İşlem | Kullanıcı aksiyonu | İşlenen veri | Alıcı | Saklama / sınır |
| --- | --- | --- | --- | --- |
| Teslimat adresi önerisi | Kullanıcının “Konumumu Kullan” veya “Konumumu Bul” tıklaması | En fazla 4 ondalık basamaklı enlem-boylam, yaklaşık 11 m | Google Geocoding API | Reverse endpoint `no-store` yanıt verir; ham hassasiyet tarayıcıdan veya siparişten geçmez. |
| Fiziksel kart teslimatı | Kullanıcının checkout gönderimi | Ad, telefon, açık adres, şehir/ilçe; varsa azaltılmış koordinat | Yenomi ID ticari veritabanı ve yetkili fulfillment süreci | Sipariş/ticari kayıt saklama politikasına tabidir. Dijital ürünlerde koordinat gönderilmez. |
| Kart görüntülenme analitiği | Genel kartın açılması; DNT/GPC kapalı olmalı | Günlük HMAC tekrar parmak izi ve ülke kodu | Yenomi ID | Ham IP, referrer ve şehir tutulmaz; 90 gün retention. |
| Profil görseli | Kullanıcının dosya yüklemesi | Görsel dosyası | Private Supabase Storage | Sunucuda WebP'ye dönüştürülür; EXIF/GPS silinir; erişim yetki kontrollüdür. |

IP ile sessiz konum çıkarımı yapılmaz. Kullanıcı konum iznini reddederse veya
reverse geocode başarısız olursa adres/şehir alanını kendisi girer.
