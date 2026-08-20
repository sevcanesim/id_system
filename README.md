# Yenomilabs NFC + Dijital Kartvizit v11

Bu sürümde kullanıcının kartvizit yönetim paneli tamamlandı.

## Eklenenler

- Supabase hesabına bağlı kartvizit oluşturma ve düzenleme
- `qr.yenomilabs.com/adsoyad` biçiminde kalıcı profil bağlantısı
- Otomatik `.vcf` kişi kartı
- Gerçek profil URL'sinden otomatik QR kod üretimi
- Yüksek çözünürlüklü PNG QR indirme
- Bağlantıyı panoya kopyalama
- Kartviziti yayından kaldırma ve aynı URL ile yeniden yayınlama
- Kart yayın durumu göstergesi
- NFC kart sipariş çağrısı
- Sevcan ve Ali Emre profilleriyle aynı kartvizit şablonu

## Kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` içine gerçek proje değerlerini yaz. README örneğindeki `PROJE-ID` metnini bırakırsan giriş açılmaz.

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdxyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Supabase SQL Editor içinde çalıştırılacak dosya:

```text
supabase/migrations/001_initial_schema.sql
```

## Test akışı

1. `/giris` üzerinden hesap oluştur veya giriş yap.
2. `/olustur` üzerinden kart bilgilerini doldur ve yayınla.
3. `/kartim` ekranında bağlantıyı kopyala ve QR kodu indir.
4. `Yayından Kaldır` düğmesiyle kartı kapat.
5. Aynı düğmeyle yeniden yayınla; URL değişmez.

## v12.1 form fix
- The third step no longer publishes on Enter or implicit form submission.
- Publishing occurs only after clicking “Kartviziti Oluştur”.


## v12.2 — Kullanıcı sipariş takibi

- `/siparislerim` kullanıcının kendi NFC siparişlerini listeler.
- Sipariş durumu görsel ilerleme çubuğuyla takip edilir.
- Kart rengi, adet, teslimat bölgesi ve sipariş numarası gösterilir.
- Sipariş sonrası kullanıcı doğrudan takip ekranına yönlendirilir.


## v12.3
Kartım paneli premium dashboard düzenine geçirildi; QR, ana aksiyonlar ve canlı önizleme tek ekranda birleştirildi.


## 
## v12.7 — Aktif oturum UX düzeltmesi

- Aktif oturum varken giriş ve kayıt formu gizlenir.
- Kartvizitime Git, Çıkış Yap ve Başka hesap kullan seçenekleri gösterilir.
- Oturum kapatıldıktan sonra normal giriş ekranı görünür.


## Production rate limiting

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel. Local development uses an in-memory fallback when these variables are absent. Protected flows include checkout, activation, claim and organization member mutations.


## Product Engineering Contract

Yenomi ID development is governed by the repository-level product engineering contract:

- `AGENTS.md`
- `docs/product-engineering/00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md`
- `docs/product-engineering/01_CURRENT_ARCHITECTURE_BASELINE.md`
- `docs/product-engineering/16_AGENT_WORKING_CONTRACT.md`

Verify the contract with:

```bash
npm run verify:product-engineering
```
