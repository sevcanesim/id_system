# PARKED — Yenomi ID Business Networking + Tenant Provisioning

**Durum:** park edildi. Kod yok. Şema yok. Sahte ekran yok.

**Aktivasyon cümlesi:** ürün sahibi **`notu uygula`** dediğinde bu belge uygulanır.

Bu belge bir ürün notudur; `00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md` yerine geçmez. Uygulanana kadar mevcut üretim davranışı korunur.

Dört not birleştirildi:

1. Kurumsal Networking + Lead Capture + Follow-up CRM
2. International Networking Profile (TR | EN İngilizce kart)
3. Super Admin şirket provisioning / tenant management
4. Public card URL mimarisi (immutable ID + okunabilir slug)

---

## 0. Sert kısıtlar

- Test hataları ve mevcut QA işleri bu nottan bağımsız devam eder.
- **`notu uygula` denmeden uygulanmaz.**
- Kartvizitin temel amacı değişmez. Yeni katman kartın **sonunda** B2B networking alanıdır.
- Canonical QR: **QR → mevcut dijital kartvizit sayfası.** Ayrı lead landing’e gitmez.
  - *“Kartvizit QR’ı her zaman aynı kart sayfasını açar.”*
  - *“QR okutulduğunda ayrı bir lead sayfasına gitme yaklaşımını değiştirelim. Mevcut davranış korunmalı.”*
- QR’ın basılı / yazılı payload’ı **statik** kalır. Kart profili ve okunabilir slug değişebilir; QR yeniden basılmaz.
  - QR içindeki URL: immutable `https://id.yenomi.com/p/{publicId}`
  - Kullanıcıya gösterilen canonical paylaşım URL’si: `https://id.yenomi.com/p/{slug}`
- NFC ve QR aynı networking backend’ine düşer; ikisi de **Open Digital Card**.
- **GPS kullanılmaz.** Lead ili / şehir / ülke kullanıcının beyanıdır.
  - `lead.city` (ve uluslararası katmanda `lead.country`) kart sahibinin şirket lokasyonu ile karıştırılmaz.
- vCard / **Kartviziti Kaydet** kalır.
- Karttan otomatik tanıtım maili gitmez. Önce izinli lead capture; mail owner panelinden, kredi düşümü başarılı gönderimde.
- Bu özellikleri bağımsız mikro-özellikler olarak parçalama. Tek lifecycle:

```
QR / NFC
  → CONTACT
  → LEAD
  → MAIL | MEETING
  → PRESENTATION
  → VIEWED
  → FOLLOW-UP
  → CONVERTED
```

- Mevcut `public.corporate_leads` tablosu `/kurumsal` satış formu içindir. Bu CRM/networking lead deposu **o tabloyu yeniden kullanmaz.**
- `demo.kurumsal.lead@yenomi.test` bir fixture’dır; eksik CRM modülünün yer tutucusudur, çalışan ürün değildir.

Orta blokta geçen ayrı **“İletişim QR → [Şirket Adı] ile iletişim kurun”** sayfası kapanış kararıyla ana yol olmaktan çıkar. Ana QR mevcut kartı açar. Event bağlamı panelde seçilir / `?event=` ile taşınır; QR yine aynı kartı açar, lead’e etkinlik bağlanır.

---

## A. Kurumsal Networking + Lead Capture (ilk not)

Konumlandırma:

> “QR okutunca mail gönder” özelliği olarak değil, **Kurumsal Networking + Lead Capture + Follow-up CRM modülü** olarak kurgulamak çok daha doğru olur.
>
> kartvizitin temel amacı değişmiyor. Sadece kartın sonunda B2B networking katmanı oluşuyor.

Phase çerçevesi: **Phase 4 / Corporate Growth** seviyesinde ayrı ürün modülü.

### A.1 Canonical kart akışı

```
QR okut
   ↓
Mevcut Yenomi dijital kartvizit
   ↓
[ Profil / Kart ]
  Şirket bilgileri
  İletişim bilgileri
  Sosyal medya
  ...
  ──────────────────────────
  Sizinle iletişim kurmak isterim
  [ İletişim Bilgilerimi Paylaş ]
  [ Görüşme Talep Et ]
```

Kart sonu bloğu — **İletişimde Kalalım**

- Başlık: `İletişimde Kalalım`
- Metin: `Bilgilerinizi paylaşın, sizinle iletişim kuralım.`
- `[ İletişim Bilgilerimi Paylaş ]`
- `Bir görüşme planlamak ister misiniz?` → `[ Görüşme Talep Et ]`
- Alternatif copy: `Sizinle iletişim kurmak isterim` / `İletişim bilgilerinizi paylaşarak bizimle bağlantı kurabilir, görüşme talebinde bulunabilirsiniz.`

**İki CTA ayrımı zorunlu.** Herkes görüşmek istemeyebilir.

- Paylaş = lead
- Görüşme talep et = lead + meeting request

Paylaşınca confirmation: `[ Şirket Adı ] iletişim bilgilerinizi aldı.`  
`[ Kartviziti Kaydet ]` veya vCard indirme devam eder.

### A.2 Lead formu + il beyanı

Kişi lead ilini **kendi belirler. Kesinlikle.** QR’ı okutan kişinin konumu GPS’ten otomatik alınmaz.

Alanlar:

- Ad Soyad *
- Şirket
- Pozisyon
- E-posta *
- Telefon
- Bulunduğunuz il (Adana, Ankara, … İzmir)

İl zorunlu veya en azından görüşme talebi sırasında zorunlu.

Örnek: Yenomi şirketi İzmir’de, lead İstanbul’da. Şirket ili lead ili değildir.

### A.3 Görüşme talebi (TR / yurt içi kural)

Talep formu: Online / Yüz yüze, tarih, saat, not. İl tekrar sorulmaz.

Backend kuralı:

- İl = İzmir → online veya yüz yüze
- İl ≠ İzmir → yüz yüze alınır ama **planlama gerekli**

UX: `Yüz yüze görüşmeler lokasyon ve ekip uygunluğuna göre planlanır.` Kullanıcıya yanlış kesinlik verilmez.

Şirket tarafı: `[ Kabul Et ] [ Alternatif Öner ] [ Reddet ]`

### A.4 Owner panel

Lead listesi + detay (ör. Ahmet Yılmaz / ABC Teknoloji / İzmir, kaynak `QR / Dijital Kart`).

CTA: `[ Tanıtım Maili Gönder ] [ Görüşme Talebi Oluştur ]`

Durumlar: Yeni, Temas Edildi, Mail Gönderildi, Görüşme Talep Edildi, Görüşme Planlandı, Görüşme Gerçekleşti, Takipte, Kazanıldı, Kapatıldı.

Mail karttan değil, lead sonrası:

```
QR → kart → paylaş → lead panele düşer → Tanıtım Maili → kredi kontrolü → gönder
```

Panel CTA örneği: **Etkinlikte Tanıştık**  
Konu örneği: `Etkinlikte sizinle tanışmıştık — [Şirket Adı]`

### A.5 Mail senaryoları + kredi

- A — Etkinlik Öncesi
- B — Etkinlikte Tanıştık
- C — Görüşme Sonrası

**Tanıtım Maili Kredisi** ayrı model. `1 başarılı gönderim = 1 kredi.`  
Mail gönderme isteği ile kredi düşümü aynı şey değildir. Bounce / invalid / rejected / spam ayrı raporlanır.

### A.6 Şirket kimliği, fatura, sunum

Zorunlu şirket + iletişim + faturalandırma katmanı.

Ayır:

- Platform ID / Corporate ID — örn. `YEN-CORP-000123` (kullanıcı değiştiremez)
- Vergi No (yasal kimlik)

Faturalar ayrı nav.

Sunum: `uploaded_at` / `updated_at` / `published_at` / `version`.  
Lead mail’de `presentation_id` + version + `sent_at` — *“Ahmet’e hangi sunumu göndermiştik?”*  
Sunum görüntüleme event’i tutulur.

### A.7 Etkinlik, funnel, IA (kurumsal panel)

Modül **Etkinlikler**: leads, QR scans, mailler, görüşmeler, sunum views, dönüşüm. Event-specific QR attribution.

Funnel örneği: `128 QR Scan → 74 Lead → 61 Mail → 42 Presentation View → 18 Meeting Request → 11 Meeting Scheduled`

Kurumsal nav (bu not + İngilizce kart notunun birleşik hali bölüm D’de).

---

## B. International Networking Profile (İngilizce kart notu)

Konumlandırma:

> Yenomi ID = Digital Business Card + B2B Networking + Lead Capture + Meeting + Follow-up
>
> İngilizce kartı sadece “dil seçeneği” olarak değil, **International Networking Profile** olarak tasarla.
>
> Özellikle uluslararası etkinliklerde çok güçlü olur. Premium kurumsal paketin güçlü parçası olabilir.

### B.1 İngilizce dijital kart — kesin

Kart sahibi Türkçe kartını kullanırken **TR | EN** switch’i olur.

Bu yalnızca metin çevirisi değildir. İngilizce kart **ayrı bir içerik katmanıdır.** Panelden yönetilir.

Örnekler:

| TR | EN |
| --- | --- |
| Kurumsal Satış Müdürü | Corporate Sales Manager |
| İş Geliştirme | Business Development |
| Hakkımızda | About Us |
| Görüşme Talep Et | Request a Meeting |

### B.2 Otomatik dil algılama

QR’ı yabancı biri okutursa:

```
Browser language = EN → English Card
Browser language = TR → Türkçe Card
```

Kullanıcı her zaman TR | EN ile değiştirebilir.

### B.3 International Networking Mode

Kurumsal kullanıcı **International Networking** modunu açar. Kart:

- İngilizce
- daha kısa şirket tanımı
- international contact
- meeting CTA
- LinkedIn, website, company presentation, brochure
- WhatsApp / e-mail
- meeting request

B2B networking odaklı hale gelir.

### B.4 I’m interested in…

Kartı açan kişi seçer. Örnek:

- Partnership
- Distribution
- Investment
- Procurement
- Sales
- Business Development
- Employment
- Media / Press

Lead kaydına `interest` eklenir.

### B.5 What brings you here?

Klasik “adınızı ve mailinizi bırakın” formundan çıkış. Qualification:

I’m interested in: Partnership / Distribution / Product information / Meeting / Investment / Become a customer / Other

### B.6 Save my contact

İngilizce kartta güçlü CTA: **Save Contact** → tek dokunuşla vCard.  
Şirket tarafında **Contact saved** event’i.

### B.7 Let’s Connect

CTA’lar: Save Contact, Send Message, Request a Meeting, Email Us, Visit Website, Connect on LinkedIn.

### B.8 Networking badge

Etkinlik boyunca yaşayan kart. Örnek:

```
WEB SUMMIT 2026
Meet us in Istanbul
Booth B42
[ Request a Meeting ]
```

### B.9 Event-specific card

Normal: `yenomi.com/card/company`  
Etkinlik: `yenomi.com/card/company?event=websummit2026`

QR aynı kartı açar. Sistem ziyaretçinin Web Summit 2026 üzerinden geldiğini kaydeder.

### B.10 About You

Sadece “benim bilgilerim” değil:

- Company, Position, Industry, City, Country
- What can we help you with?

### B.11 Ülke + şehir

Türkiye: City = İzmir  
Yurtdışı: Country = Germany, City = Berlin  

Veri: `country`, `city`. Görüşme planlaması global çalışır.

### B.12 Meeting request (global)

Request a Meeting:

- Meeting type: Online / In person
- Preferred date / time
- **Timezone** (GMT+1 Berlin ile GMT+3 Istanbul karışmaz)
- Message

### B.13 Available for meetings

Panel: Meeting availability (Online 09:00–18:00, In person İzmir).  
Açıkken kartta **Book a Meeting**. Mini Calendly benzeri B2B özelliği; mevcut “Toplantı Planla” düz URL/PDF slotunun yerini ancak bu not uygulandığında alır.

### B.14 Introduce yourself

`What would you like to discuss?`  
Örn. “We are looking for a distributor in Germany.”  
Çalışan QR’ı okuttuğunda: Ahmet Yılmaz — ABC GmbH, Interested in distribution in Germany.

### B.15 Lead scoring

Örnek 82 / 100 — Hot:

- +10 QR interaction
- +15 Contact shared
- +20 Meeting requested
- +10 Presentation viewed
- +15 Presentation viewed 3+ times
- +20 Interested in partnership

### B.16 Presentation tracking

ABC Company Presentation v3  
Uploaded / Sent / Opened / Viewed 3 times  
Sinyal: “John Smith viewed your presentation 3 times.”

### B.17 Follow-up önerisi

“John Smith requested a meeting 2 days ago.” `[ Follow Up ]`  
Hazır mail: “Hi John, It was great connecting with you at…”

### B.18 Business card exchange

İki kişi de Yenomi kullanıyorsa **Exchange Contact** (QR / NFC) iki tarafta bağlantı kaydı. Klasik “kartınız var mı?” problemini çözer.

### B.19 NFC + QR birlikte

Yenomi Networking: QR ve NFC aynı sistemi kullanır. İkisi de Open Digital Card. Event / lead / analytics aynı backend.

### B.20 Networking Analytics

QR Scans, Contacts Collected, Qualified Leads, Meeting Requests, Presentations Viewed, Follow-ups Sent, Conversion.

### B.21 Lead timeline

John Smith / Global Trade Ltd. / Berlin, Germany:

- QR scanned
- Contact shared
- Interest: Partnership
- Presentation sent / viewed
- Meeting requested / confirmed

### B.22 İngilizce kart ideal iskeleti (~5 saniye)

Kartı açan yabancı kullanıcı şunu anlamalı: Who are you? What do you do? Why should I talk to you? How can I contact you?

```
[ Company Logo ]
YENOMI LABS
Digital Identity & Networking
Istanbul / Türkiye
[ Save Contact ] [ Request a Meeting ]

About
Solutions
Company Presentation [ View Presentation ]
Let's Connect [ Share My Contact ]
I'm interested in...  Partnership / Distribution / Business Development
Contact  Email / Phone / LinkedIn / Website
```

Ürün fırsatı zinciri:

Digital Card (QR/NFC) → International Profile (TR/EN) → Lead Capture → Qualification → Event Networking → Presentation (version + timestamp + tracking) → Meeting → Follow-up (mail credits) → Analytics (funnel + conversion)

---

## C. Super Admin şirket provisioning / tenant management

Super Admin tarafı **temel şirket provisioning / tenant management** sistemidir.

**Şirket oluşturma** ile **şirkete kullanıcı atama** birbirinden ayrılır.

### C.1 Yeni şirket formu

Super Admin → Şirket Yönetimi → `[ + Yeni Şirket Oluştur ]`

| Alan | Durum |
| --- | --- |
| Şirket Adı | Zorunlu |
| Vergi No | Zorunlu |
| Vergi Dairesi | Zorunlu |
| Şirket Resmi Adresi | Zorunlu |
| Şehir | Zorunlu |
| İlçe | Zorunlu |
| Ülke | Zorunlu |
| Çalışan Limiti | Zorunlu |
| Şirket Durumu | Aktif / Pasif |

Çalışan Limiti örneği: `50` → şirket oluşunca **50 kapasite, 0 / 50 kullanım.** Limit sonradan Super Admin tarafından değiştirilebilir.

### C.2 Sistemsel kimlik

Şirket oluşunca otomatik **Corporate ID**, kullanıcı değiştiremez. Örnek: `YEN-CORP-000184`

Ayrıca tutulur: `created_at`, `created_by`, `updated_at`, `status`.

Örnek özet:

- Corporate ID `YEN-CORP-000184`
- Şirket `ABC Teknoloji A.Ş.`
- Oluşturan Super Admin
- Oluşturulma `19.08.2026 18:32`
- Durum Aktif

### C.3 Şirket oluştuktan sonra kişi ekleme

Formun sonunda **Şirket Yöneticileri**. Super Admin yeni kullanıcı oluşturmak zorunda değildir.

`[ Kişi Ekle ]` → sistemdeki mevcut kullanıcılar. Arama: isim / e-posta.

Roller (bu adımda): **Owner / Admin / HR**

Örnek:

- Ahmet Yılmaz — Owner
- Ayşe Demir — HR
- Mehmet Kaya — Admin

Seçim sonrası: Şirket Rolü `[ Owner ▼ ]` → `[ Şirkete Ekle ]`

### C.4 Mimari karar: User ≠ Membership ≠ Company

Aynı kişi farklı şirketlerde olabilir.

```
User
  ↓
Membership
  ↓
Company
```

Örnek: Ayşe Demir → ABC Teknoloji / HR ve XYZ Holding / Admin. Çoklu şirket ilişkisi mimariyi bozmaz.

### C.5 Owner / Admin / HR (tenant içi)

**Owner** — şirketin sahibi: şirket bilgileri, faturalandırma, lisans, kullanıcılar, roller, içerik, şirket ayarları.

**Admin** — operasyonel yönetici: çalışanlar, kartlar, içerikler, lead’ler, etkinlikler.

**HR** — insan kaynakları: çalışan ekleme/çıkarma, çalışan bilgileri, departman, unvan, kart durumu. **Fatura / ödeme / şirket sahipliğine erişmez.**

Bu ayrım mevcut panel yetkileriyle hizalanır; Super Admin notu DEPARTMENT_MANAGER’ı bu provisioning adımında atamaz (departman yöneticisi tenant içi operasyondur).

### C.6 Super Admin şirket detay

```
ABC Teknoloji A.Ş.
YEN-CORP-000184
● Aktif

Şirket Bilgileri  …  Çalışan Limiti 50  Kullanılan 17 / 50
Yöneticiler       Ahmet Yılmaz Owner  /  Ayşe Demir HR
Lisanslar         17 aktif çalışan  /  20 dijital kart  /  15 fiziksel kart
Finans            Toplam fatura …

[ Şirketi Düzenle ] [ Kullanıcı Ekle ] [ Limit Değiştir ] [ Şirketi Pasifleştir ]
```

Liste görünümü (hedef): Şirket, Corporate ID (`YEN-CORP-…`), Vergi No, Kullanım, Limit, Durum (Aktif / Pasif). Üstte `[ + Yeni Şirket ]`. Arama: şirket adı / vergi no / Corporate ID. Filtre: Aktif, Pasif, Limit dolu, Limit yaklaşan, Yeni oluşturulan.

### C.7 Limit sistemi (entitlement)

Yalnız çalışan limiti değil. İleride:

- Çalışan Limiti
- Dijital Kart Limiti
- Fiziksel Kart Limiti
- Tanıtım Maili Kredisi
- Depolama Limiti

Super Admin şirket limitlerini yönetir. Yapı paket sistemine bağlanabilir.

### C.8 Limit aşımı

`20 / 20` olunca: `Çalışan limiti doldu.` Super Admin limiti yükseltir.

Kurumsal kullanıcı: `Limitinizi yükseltmek için yöneticinizle iletişime geçin.`  
Satın alma yetkisi varsa `[ Limiti Yükselt ]`.

### C.9 Vergi no doğrulama — tenant uniqueness

Vergi No sıradan text değildir:

- zorunlu
- format validation
- **duplicate kontrolü**

Aynı vergi numarasıyla ikinci şirket: `Bu vergi numarasıyla kayıtlı bir şirket zaten bulunuyor.`

**Şirket adı duplicate olabilir.** Güvenilir tanım: **Corporate ID + Tax Number.**

### C.10 Wizard (tercih edilen provisioning)

Tek dev form yerine:

1. Şirket Bilgileri (ad, vergi no, daire, resmi adres)
2. Limitler (çalışan, dijital kart, fiziksel kart, mail kredisi, depolama)
3. Yöneticiler (kullanıcı ara + rol)
4. Onay → `[ Şirketi Oluştur ]`

### C.11 Oluşturma = tek transaction

```
Company
  → Company Settings
  → Entitlements / Limits
  → Memberships
  → Default Roles
  → Default Content Settings
  → Billing Profile
```

Yarım tenant yok: “şirket oluştu ama limit oluşmadı”, “şirket oluştu ama admin bağlanmadı”.

### C.12 Super Admin ≠ şirket admin

```
SUPER ADMIN
  ├── Company A  Owner / Admin / HR
  ├── Company B  Owner / HR
  └── Company C  Owner
```

Super Admin **tenant yönetir.** Owner/Admin/HR **tenant içindeki operasyonu** yönetir. Güvenlik sınırı kritiktir.

---

## D. Birleşik bilgi mimarisi

Hedef zincir:

```
Super Admin → Company → Membership → Role → Entitlement → Billing → Networking
```

Yeni şirket, paket, limit veya kurumsal rol eklendiğinde mevcut sistemi ezmeden büyütmek için bu zincir baştan doğru kurulur.

### Super Admin nav

```
GENEL
  Dashboard

KURUMLAR
  Şirketler
  Şirket Oluştur

KULLANICILAR
  Tüm Kullanıcılar

LİSANSLAR
  Paketler
  Limitler
  Mail Kredileri

FİNANS
  Faturalar
  Ödemeler

SİSTEM
  Roller & Yetkiler
  Audit Logs
  Sistem Ayarları
```

### Kurumsal panel nav

```
GENEL
  Genel Bakış

NETWORKING
  Lead’ler
  Etkinlikler
  Görüşmeler

EKİP & KARTLAR
  Çalışanlar
  Kartlar

MARKA & İÇERİK
  Kurumsal İçerik
  Sunumlar

FİNANS
  Lisanslar
  Mail Kredileri
  Faturalar

YÖNETİM
  Organizasyon
  Roller & Yetkiler
```

---

## E. Mevcut kod tabanı (hedef değil)

Uygulama başladığında bu gerçeklikten evrilinir; üzerine sahte ekran örülmez.

- `/admin` bugün sipariş + mutabakat + kurumsal sekmesi. Provision formu şirket adı + **yeni owner e-postası + plan + koltuk** ile **şirket ve sahibi aynı anda** yaratır (`POST /api/admin/organizations`). Bu not şirket oluşturmayı üye atamadan ayırır.
- Corporate ID (`YEN-CORP-…`), vergi no uniqueness, vergi dairesi / resmi adres alanları, çoklu entitlement (dijital/fiziksel kart, mail kredisi, depolama) Super Admin’de yok.
- Üyelik modeli zaten `organization_members` üzerinden User → Membership → Company’dir; aynı kullanıcının birden fazla org üyeliği veri modelinde mümkün. Super Admin UI bunu yönetmez.
- `public.corporate_leads` = `/kurumsal` teklif formu. Networking CRM bu tabloyu reuse etmez.
- Kartta “İletişimde Kalalım”, TR|EN içerik katmanı, event query, meeting timezone, lead scoring, exchange-contact **yok**.
- Kurumsal “Toplantı Planla” bugün düz URL/PDF slotudur; Calendly değildir. Book a Meeting bu not uygulanınca ayrı ürün kararıdır.
- Public kart bugün üç yüzey: `/[slug]` (okunabilir, kök), `/p/[publicId]` (immutable), `/c/[cardCode]` (fiziksel kart kodu). Kullanıcıya gösterilen paylaşım hâlâ çoğu yerde slug; QR hedefi bu nottaki gibi `/p/{publicId}` altında tek host’ta toplanmış değil. `id.yenomi.com` public kart host’u henüz ürün kararı olarak uygulanmadı.

---

## F. Public card URL mimarisi (dördüncü not)

URL yapısı **baştan** doğru kurulmalı. QR’ın üzerine basılan link sonradan değiştirilmez. QR statik kalır; arkasındaki kart profili değişebilir.

### F.1 Hedef host ve iki URL

Öneri host: `id.yenomi.com`

Okunabilir / paylaşılabilir:

```
id.yenomi.com/p/{slug}
id.yenomi.com/p/ahmet-yilmaz
id.yenomi.com/p/ahmet-yilmaz-abc    (şirket çalışanı)
```

Asıl backend kimliği (immutable public profile ID):

```
id.yenomi.com/p/{publicId}
id.yenomi.com/p/8Kx4mQ72
```

Slug kullanıcıya tamamen bırakılmaz.

### F.2 Çözümleme

```
ahmet-yilmaz          ← kullanıcıya gösterilen slug
      ↓
public profile ID
      ↓
8Kx4mQ72              ← QR / NFC / sistem kimliği
      ↓
kişinin aktif kartı
```

Ahmet soyadını değiştirirse slug `ahmet-yilmaz` → `ahmet-demir` olabilir. QR değişmez. Eski slug yeni profile yönlendirilir.

### F.3 QR’ın içine ne konur?

QR doğrudan immutable public profile URL’sini içerir:

```
https://id.yenomi.com/p/8Kx4mQ72
```

```
QR
 ↓
/p/8Kx4mQ72
 ↓
kart profili
```

Slug değişse bile QR çalışmaya devam eder. Event bağlamı (`?event=websummit2026`) **ayrı bir kampanya QR’si** olabilir; ana kart QR’sinin publicId’sini değiştirmez.

### F.4 Kullanıcıya gösterilen link

Kart sahibinin panelinde:

Dijital Kartım → Kart bağlantım

```
id.yenomi.com/p/ahmet-yilmaz
[ Kopyala ] [ Paylaş ] [ QR Kodunu Gör ]
```

QR önizlemesi immutable `/p/{publicId}` payload’ını basar; kopyalanan paylaşım linki okunabilir slug’dır.

### F.5 Kullanıcı slug’ı kontrollü seçer

```
Kart bağlantısı
id.yenomi.com/p/
[ ahmet-yilmaz              ]
Kullanılabilir ✓
```

Kurallar:

- sadece `a-z`, `0-9`, `-`
- Türkçe karakter yok
- boşluk yok
- minimum uzunluk
- unique
- reserved words yasak

Yasak örnekleri: `admin`, `login`, `api`, `support`, `company`, `settings`, `superadmin`, `help`

### F.6 Uygulanırken mevcut route’lardan evrilme (hedef değil, harita)

Bugünkü kod:

- `/p/{publicId}` zaten `card_profiles.public_id` ile çalışır; isim/e-posta/telefondan türetilmez.
- Okunabilir slug bugün kökte `/[slug]`; bu not slug’ı da `/p/{slug}` altına alır.
- Eski slug yönlendirmesi ürün kuralıdır (`ahmet-yilmaz` → yeni slug). Kök `/[slug]` geriye dönük kalıcı yönlendirme olarak korunabilir.
- Fiziksel NFC `/c/{cardCode}` ayrı immutable kimliktir; networking notu NFC’nin de aynı kart profilini açmasını ister. PublicId QR ile fiziksel cardCode birleştirilmez; ikisi de aktif karta çözülür.

`/p/{slug}` ile `/p/{publicId}` aynı path parametresini paylaşır. Uygulama sırasında token önce publicId, değilse slug, değilse eski-slug redirect olarak çözülür. Slug, publicId formatını taklit edemez.

---

## G. Uygulama kapısı

Bu belge **spesifikasyondur, iş emri değildir.**

Yapılacaklar `notu uygula` sonrası, inspect-first sırayla:

1. Tenant provisioning (şirket ≠ üye atama, Corporate ID, vergi uniqueness, transaction)
2. Public URL sözleşmesi (QR = `/p/{publicId}`, paylaşım = `/p/{slug}`, eski slug redirect, reserved words)
3. Kart sonu lead/meeting (TR, GPS yok, mevcut kart korunur)
4. International profile (TR|EN içerik katmanı, event context)
5. CRM lifecycle, mail kredisi, sunum tracking, analytics

O cümle gelene kadar QA / bugfix / mevcut panel işleri bu notu uygulamaya açmaz.
