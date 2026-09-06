# YENOMI ID — Phase 1 User Type Matrix

| User type | Primary context | Main goals | Primary destinations | Key risks |
|---|---|---|---|---|
| Visitor | Public / Public Profile | Ürünü anlamak, kartviziti görüntülemek | `/`, `/urunler/nfc-kart`, `/kurumsal`, `/p/:publicId` | Ürün değerinin NFC kart baskısına indirgenmesi; CTA karmaşası |
| Individual Buyer | Commerce | Ürünü seçmek, ödemek, hesabına bağlamak | `/urunler/nfc-kart`, `/sepet`, `/checkout`, `/odeme/basarili` | Satın alma → hesap → aktivasyon zincirinin kopması |
| Individual User | Dashboard | Kartı, profili, siparişleri ve aboneliği yönetmek | `/kartlarim`, `/kartim`, `/olustur`, `/istatistikler`, `/siparislerim`, `/yenile`, `/ayarlar` | `/kartlarim` ve `/kartim` ayrımının zihinsel modeli; legacy hesap route'ları |
| Corporate Buyer | Corporate Marketing / Commerce | Ekibi için çözümü değerlendirmek ve satın almak | `/kurumsal` | Paket değerinin yalnız çalışan sayısına indirgenmesi |
| Organization Owner | Corporate Dashboard | Organizasyon, lisans, yetki, çalışan ve marka yönetmek | `/kurumsal/panel` | Çok fazla işlevin tek route / tek client içinde toplanması |
| Corporate Admin | Corporate Dashboard | Çalışan, kart, şablon ve içerik operasyonu | `/kurumsal/panel` | Yetki açıklamalarının teknik role isimlerine dönüşmesi |
| HR Manager | Corporate Dashboard | Çalışan onboarding/offboarding ve profil operasyonu | `/kurumsal/panel` | Yetki sınırlarının UI'da yeterince görünür olmaması |
| Employee | Corporate Onboarding / Card | Daveti kabul etmek ve izin verilen alanları tamamlamak | `/kurumsal/davet`, `/olustur`, `/kartim` | Kurumsal/personal bağlamın karışması |
| Super Admin | Internal Admin | Sipariş ve organizasyon operasyonu | `/admin` | Internal admin'in product design refactor'ına gereksiz öncelik alması |
| Test Account | QA | Individual / Corporate senaryolarını doğrulamak | Role göre | Test scope ile gerçek role davranışının karışması |

## Source-of-truth role set

Kod tabanında organizasyon rolleri `OWNER`, `ADMIN`, `HR`, `EMPLOYEE` olarak tanımlı. UX çalışmaları bu role setini kullanmalı; UI metinleri kullanıcıya teknik enum göstermek yerine anlaşılır rol adları ve yetki açıklamaları sunmalı.
