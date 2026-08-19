# Yenomi ID v25.8.61-rc.3 — FAZ 6 Final Release Qualification

## Amaç

FAZ 6 yeni ürün özelliği eklemez. FAZ 0–5 boyunca oluşturulan doğrulama zincirlerini tek final release sözleşmesinde toplar ve local kanıt ile staging/production runtime kanıtını birbirinden ayırır.

## Local qualification

Kanonik komut:

```bash
npm run verify:faz6:local
```

Bu zincir:

- FAZ 0–5 statik kontratlarını,
- typecheck'i,
- tüm unit testleri,
- production build'i,
- browser quality/a11y + responsive suite'ini,
- release source package üretimini,
- release artifact hygiene ve size budget kontrolünü

tek çalıştırmada doğrular.

## Staging qualification

Kanonik komut:

```bash
npm run verify:faz6:staging
```

Bu zincir gerçek linked/staging Supabase erişimi ister ve:

- local/remote migration drift kontrolünü,
- Phase 20 staging promotion gate'ini,
- Phase 19 authenticated browser akışını,
- staging seed ve catalog doğrulamasını,
- iyzico sandbox environment sözleşmesini

çalıştırır.

Visual regression staging workflow içinde ayrıca zorunludur.

## Production qualification

Kanonik komut:

```bash
npm run verify:faz6:production
```

Bu zincir production secrets/config ile `verify:phase20:production` çalıştırır. Production deploy workflow ayrıca başarılı staging gate'ine bağımlıdır.

## Promotion kararı

RC3 ancak aşağıdaki üç koşul birlikte sağlandığında stable/production olarak değerlendirilebilir:

1. `verify:faz6:local` PASS.
2. `verify:faz6:staging` ve staging visual workflow PASS.
3. `verify:faz6:production` PASS ve deploy sonrası smoke PASS.

Runtime kanıtları `docs/RC3_RUNTIME_PROMOTION_CHECKLIST.md` içinde gerçek loglara göre işaretlenir. Statik veya local test, runtime maddelerini otomatik PASS yapmaz.

## Master TODO kapanış ilkesi

- Kanıtlanmış ve düzeltilmiş alanlar tekrar refactor edilmez.
- Runtime-required maddeler gerçek hedef ortam logu olmadan kapatılmaz.
- Release artifact, source hygiene, accessibility ve regression gate'lerinden biri fail ise promotion BLOCKED kalır.
