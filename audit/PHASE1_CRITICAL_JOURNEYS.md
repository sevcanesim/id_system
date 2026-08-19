# YENOMI ID — Phase 1 Business-Critical Journeys

## J1 — Individual Purchase — P0
`/` → `/urunler/nfc-kart` → `/sepet` → `/checkout` → `/odeme/basarili` → hesap/oturum → `/olustur` → `/kartim`

Success criteria:
- Kullanıcı her adımda nerede olduğunu ve sıradaki adımı anlar.
- Fiyat, kargo, hizmet süresi ve yenileme belirsiz değildir.
- Başarılı ödeme, aktivasyon/profil oluşturma aksiyonuna bağlanır.
- Sipariş ve kullanım hakkı aynı hesaba bağlanır.

Primary regression risk: checkout/payment/account binding.

## J2 — Existing Individual — P0
`/giris` → `/hesabim` role gateway → `/kartlarim` veya `/kartim` → `/olustur` → preview → `/istatistikler`

Success criteria:
- Tek auth foundation vardır.
- Giriş sonrası yanlış corporate/individual portala düşülmez.
- Profil kaydı ve preview aynı veriyi gösterir.

Primary regression risk: role-aware routing and profile mutations.

## J3 — Lost Card — P0
`/kartim` → Lost Mode → confirmation → physical card access disabled → `/p/:publicId` safe state.

Success criteria:
- Kayıp modu görünür ve anlaşılırdır.
- Geri dönüşü etkileyen işlem açık confirmation kullanır.
- Public profile kişisel bilgi sızdırmaz.

Primary regression risk: card status / public visibility.

## J4 — Corporate Purchase / Provisioning — P0
`/kurumsal` → purchase/request → organization creation → OWNER invitation → `/kurumsal/panel` → employee setup.

Success criteria:
- Satılan değer yalnız seat sayısı değil; profil, dashboard, branding, content ve analytics olarak anlaşılır.
- Organization owner aktivasyonu ve lisans oluşumu kopmaz.

Primary regression risk: organization + subscription provisioning.

## J5 — Employee Onboarding — P0
Admin → employee invite → `/kurumsal/davet` → auth verification → `/olustur?business=1...` → allowed fields → published card.

Success criteria:
- Çalışan yalnız izin verilen kişisel alanları düzenler.
- Corporate template/content merkezi olarak uygulanır.
- Davet ve kart durumu admin paneline geri yansır.

Primary regression risk: permissions / invitations / card assignment.

## J6 — Employee Offboarding — P0
Corporate panel → employee detail → deactivate → profile disabled → card disabled → license released.

Success criteria:
- Destructive confirmation vardır.
- Public access durur.
- Seat yeniden kullanılabilir olur.

Primary regression risk: authorization + lifecycle + license accounting.

## J7 — Subscription Renewal — P1
`/yenile` → current status → renewal/payment → service active.

Success criteria:
- Kullanıcı yeni kart alması gerekmediğini anlar.
- Renewal date/status/payment açıkça görünür.

## J8 — Public Card Contact — P1
NFC/QR → `/c/:cardCode` veya `/p/:publicId` → identity → primary contact → save contact.

Success criteria:
- İlk viewport kartvizit görevini yerine getirir.
- Lost/inactive/suspended states güvenlidir.
