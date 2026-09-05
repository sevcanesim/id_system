# Yenomi ID — Varsayılan Değer Envanteri

Tarih: 5 Eylül 2026  
Kapsam: `app/` ve `lib/` altındaki kullanıcıya, ticarete veya kurumsal
deneyime yansıyan çalışma zamanı varsayılanları tarandı. Boş form başlangıç
değerleri, hata metinleri ve savunmacı `null` kontrolleri bu envanterin dışında
tutuldu.

## Sonuç

Ürün, fiyat, paket, marka, şablon ve hukuki sürüm gibi değişebilir iş verileri
tek kaynak olarak PostgreSQL'den gelmelidir. Projede bunun altyapısı kısmen
zaten var: `products`, `product_variants`, `app_settings`,
`corporate_template_options`, `legal_documents` ve
`organization_link_slot_definitions` tabloları ile `/api/public-config` mevcut.

Ancak bazı vitrin ve panel ekranları, aynı verinin kod içindeki ikinci bir
kopyasını kullanıyor. Bu iki kaynak zamanla ayrışır; müşteri eski fiyatı veya
varsayılan örnek kimliği görebilir. Değişecek iş verileri için kod varsayılanı
göstermek yerine yükleme durumu gösterilmelidir.

## DB'ye taşınması gerekenler

| Öncelik | Değer grubu | Bugünkü yer | Hedef sahiplik |
| --- | --- | --- | --- |
| P0 | Bireysel/kurumsal paket adı, fiyatı, koltuk sayısı, kredi, aktiflik | `lib/commerce/packages.ts`, `lib/config/commercial.ts`, `lib/config/product.ts` | `products` + `product_variants` |
| P0 | Ürün sayfalarındaki paket metinleri, özellik maddeleri, önerilen teklif ve kart varyantları | `app/urunler/page.tsx`, `lib/commerce/packages.ts`, `lib/config/product.ts` | `products.presentation` ve varyant `metadata` |
| P0 | Sepete yazılan görünen fiyat ve ürün adı | `app/urunler/page.tsx` içindeki `AddToCartButton` çağrıları | DB teklif snapshot'ı; sunucu ödeme öncesi tekrar doğrular |
| P1 | Kurumsal şablon adı, renk, varsayılan varyant ve alan kilitleri | `app/kurumsal/panel/CorporatePanelClient.tsx`, `app/kurumsal/panel/components/TemplatesPanel.tsx` | Organizasyona ait `organization_card_templates.fields` |
| P1 | Kart önizlemesindeki örnek kişi/şirket | `app/CardTemplate.tsx` (`Selin Kaya`, `Yenomi Labs`) | Gerçek `profiles` kaydı; veri yokken skeleton/boş önizleme |
| P1 | Örnek kişisel profil ve iletişim bilgileri | `app/data.ts` | `profiles` / `profile_links`; üretim derlemesinden örnek veri çıkarılmalı |
| P1 | Marka adı, destek/satış e-postası, site URL'si, gönderi politikası | `lib/email/resend.ts`, `lib/config/commercial.ts` | `app_settings` (`site.identity`, `commerce.shipping`) — e-posta sağlayıcı anahtarları hariç |
| P1 | Kurumsal bağlantı yuvalarının başlık ve açıklamaları | `lib/organizations/card-branding.ts` | `organization_link_slot_definitions` (tablo ve DB-okuma zaten var) |
| P2 | Networking durumları, ilgi seçenekleri, puan ağırlıkları | `lib/networking/catalog.ts` | Yönetici tarafından değiştirilecekse yeni sürümlü workflow/config tabloları |
| P2 | Şirket adı, unvan, iletişim alanı kilitleme politikası | `app/olustur/domain/organization-identity.ts` | Organizasyon kaydı ve aktif şablon `fields`; istemci yalnızca DB sonucunu göstermeli |

## Kodda kalması gerekenler

Bu değerleri DB'ye taşımak doğru değildir; bunlar ürün içeriği değil,
güvenlik/teknik çalışma sınırlarıdır.

- Ödeme sağlayıcı anahtarları, webhook sırları ve gönderici sırları:
  ortam değişkenleri (`lib/payments/config.ts`, `lib/email/resend.ts`).
- Sipariş fiyatını yeniden hesaplama, idempotency, imza doğrulama, hız limiti
  ve giriş/yetki kuralları: sunucu kodu.
- Boş form alanları, sayfalama sayısı, karakter sınırı, destekleyici hata
  metinleri ve erişilebilirlik etiketleri: arayüz kodu.
- Türkiye il listesi gibi sabit referans veri. Yönetimden değiştirilmeyecekse
  kodda kalabilir; çok dilli yönetim gerekecekse referans tabloya alınabilir.

## Mevcut DB altyapısı ve eksik kullanım noktaları

- `/api/public-config`, aktif katalog, koltuk paketleri, şablon seçenekleri ve
  hukuk sürümlerini DB'den döndürüyor.
- Checkout hukuk sürümünü ve ödeme sağlayıcısını bu uçtan kullanıyor; sipariş
  oluşturma sırasında ürün/varyant DB'den tekrar doğrulanıyor. Bu doğru yön.
- Buna karşılık ürün vitrini `app/urunler/page.tsx` ve bazı satın alma
  başlangıçları hâlâ `COMMERCIAL_PRICING` / `INDIVIDUAL_*_PLAN` sabitlerini
  kullanıyor. Aynı fiyatın iki kaynağı var.
- `organization_link_slot_definitions` DB'den öncelikli okunuyor; kaynak kod
  yedeği yalnızca kesinti anında kullanılmak üzere var. Görsel metinlerde bu
  yedeğe düşmek yerine kontrollü boş durum veya son doğrulanmış sunucu cache'i
  tercih edilmeli.
- Kurumsal panel şablonları yüklenince DB değeriyle güncelleniyor; fakat ilk
  istemci render'ında `Kurumsal Standart`, `#17121f` ve `ESSENTIAL` koddan
  veriliyor. Bu, veri yüklenirken görülebilen bir "flaş" etkisi yaratır.

## Önerilen geçiş planı

1. **Tek katalog repository'si:** Sunucuda sadece `products` ve
   `product_variants` üzerinden paket/özellik/fiyat okuyan bir repository
   oluşturulur. `lib/commerce/packages.ts` geçici veri kaynağı olmaktan çıkar,
   yalnızca tip, SKU doğrulama ve hesaplama kurallarını tutar.
2. **Yayınlanabilir sunum verisi:** Paket kartı başlığı, kısa açıklama,
   özellikler, "önerilen" bilgisi, sıralama ve varyant görünümü
   `products.presentation` / `product_variants.metadata` içine taşınır.
3. **Sunucu snapshot'ı:** Sepete yalnız SKU ve adet yazılır. Görünen fiyatlar
   katalog API'sinden gelir; ödeme API'si DB fiyatını kullanır ve siparişe
   değişmez teklif snapshot'ı yazar.
4. **Kurumsal varsayılanlar:** Organizasyon oluşturulurken tek bir aktif
   `organization_card_templates` satırı ve alan kilitleri DB'de oluşturulur.
   Panel veri gelene kadar örnek kart yerine skeleton gösterir.
5. **Marka/iletişim ayarları:** `app_settings` içindeki `site.identity` ve
   `commerce.shipping` tek bir doğrulanmış server-side config nesnesinden
   okunur. Yönetici değişikliği için denetim kaydı ve sürüm numarası eklenir.
6. **Networking:** E-posta taslağı kişi tarafından yazılmaya devam eder.
   Sadece durumlar, ilgi seçenekleri ve puan ağırlıkları işletme tarafından
   düzenlenecekse bunlar sürümlü workflow tablolarına taşınır.

## Kabul ölçütleri

- Bir iş değeri (fiyat, özellik, marka, şablon, kredi, varsayılan bağlantı)
  üretimde tek bir DB kaynağından okunur.
- DB verisi yüklenmeden müşteri adı, şirket adı, fiyat veya örnek kart
  gösterilmez; skeleton ya da açık "yükleniyor" durumu gösterilir.
- Checkout istemcisi fiyatı güvenlik amacıyla belirlemez; sunucu DB'den
  hesaplar ve teklif snapshot'ını siparişe kaydeder.
- Yönetici değişikliği denetlenir, yayın zamanına ve geri alma sürümüne
  sahiptir.
- Ortam sırları ve güvenlik sınırları veritabanına taşınmaz.
