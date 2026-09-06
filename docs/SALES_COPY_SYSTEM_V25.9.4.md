# Yenomi ID satış dili ve ticari kimlik sistemi

## Amaç

Yenomi ID, yalnızca dijital kartvizit değil; ilk tanışmayı güncel, ölçülebilir ve sürdürülebilir bir profesyonel bağlantıya dönüştüren üründür. Dil; kısa, sakin, doğal ve premium olmalıdır. Faydayı ilk cümlede verir, teknik ayrıntıyı gerektiğinde açıklar ve her ekranda tek bir sonraki adım bırakır.

## Satış hunisi

| Yüzey | Eski yaklaşım | Yeni yaklaşım |
| --- | --- | --- |
| Ana hero | Kartın baskı özelliğini anlatır. | **Kartın konuşsun. Sen bağlantıda kal.** NFC/QR ile tanıt, bağlantıyı sahiplen, doğru zamanda takipte kal. |
| Paket seçimi | Paket adını ve fiyatı öne çıkarır. | Kullanım amacını öne çıkarır: sade dijital kimlik için Bireysel, tanışma sonrası takip için Premium, ekip standardı için Kurumsal. |
| Ürün CTA’ları | “Satın al”, “İncele”, “Seç”. | “Kartını Oluştur”, “Premium ile Başla”, “Ekibin için paketi seç”. |
| Checkout | Sağlayıcı/teknik gereksinimleri açıklama ağırlıklı. | “Güvenli ödeme” odaklı, verinin nerede işlendiğini açıklar. Portal erişimi olan ürünlerde önce hesabı bağlar. |
| Güven sinyalleri | Jenerik güvenlik iddiaları. | PayTR güvenli ödeme, kart bilgisinin Yenomi’de saklanmaması, ücretsiz Türkiye içi kargo ve net kargoya teslim sözü. |
| Kurumsal teklif | Genel “teklif al” çağrısı. | “Kurulumunu Planla”: ekip ölçeği, entegrasyon ve marka standardına odaklı somut sonraki adım. |

## Herkese açık ticari vaatler

Bu ifadeler yalnızca `lib/config/commercial.ts` içindeki kaynak kullanılarak gösterilir:

- Türkiye içi ücretsiz kargo
- 2 iş günü içinde kargoya teslim
- Destek talebine 1 iş günü içinde dönüş
- Fiyat ve yıllık yenileme bedeli: katalog / sunucu fiyat kaynağı

Bir fiyat metni elle yazılmaz. Paket, yenileme ve ek kart bedelleri her zaman paket/katalog kaynağından okunur.

## Marka ve hukuk katmanları

Müşteri yüzündeki marka: **Yenomi ID — by Yenomilabs**.

Hukuki hizmet sağlayıcı: **Sevcan Eşim Karadeniz, Şahıs işletmesi**. Yenomilabs tek başına şirket veya hizmet sağlayıcı gibi gösterilmez.

Hukuki yapılandırma `lib/config/legal-identity.ts` ve deployment environment değişkenlerinden gelir. Vergi numarası, MERSİS ve ticaret sicil numarası verilmemişse sayfada boş satır olarak görünmez; başka işletmeye ait değerler asla fallback olarak kullanılamaz.

Ödeme sağlayıcısı PayTR, e-Fatura / e-Arşiv sağlayıcısı Mysoft&apos;tur. Destek, satış ve KVKK e-posta adresleri deployment değerleriyle korunur.

## Yayın öncesi kontrol

- `LEGAL_WEBSITE`, destek, satış ve KVKK e-posta değerleri production environment&apos;da doğrulanmış olmalı.
- `LEGAL_TAX_NUMBER`, `LEGAL_MERSIS_NUMBER` ve `LEGAL_TRADE_REGISTRY_NUMBER` doğrulanmadıysa boş bırakılmalı.
- İade/iptal metni hukukî onay olmadan yeni kesin iddialarla genişletilmemeli.
- PayTR credentials olmadan canlı ödemeye geçilmemeli; teknik sağlayıcı fallback metinlerinin müşteri yüzüne sızmadığı kontrol edilmeli.
