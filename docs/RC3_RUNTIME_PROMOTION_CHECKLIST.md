# Yenomi ID v25.8.61-rc.3 — Runtime Promotion Checklist

Bu dosya yalnızca hedef ortamda üretilebilen kanıtları takip eder. Kod/statik inceleme bu maddeleri PASS yapamaz.

## Staging Supabase

- [ ] `STAGING_SUPABASE_PROJECT_REF` production ref'ten farklı.
- [ ] `PRODUCTION_SUPABASE_URL` ve staging URL birbirinden farklı.
- [ ] `npm run verify:phase20:staging` PASS.
- [ ] Fresh DB/schema smoke (`verify:db`) PASS.
- [ ] Catalog price verification PASS.
- [ ] E2E seed yalnız staging project üzerinde tamamlandı.

## Phase 19 authenticated browser suite

- [ ] `npm run test:phase19` PASS.
- [ ] Full `npm run test:e2e` PASS.
- [ ] Authenticated individual flow PASS.
- [ ] Authenticated corporate owner flow PASS.
- [ ] Retired role rejection flow PASS.

## Visual regression

- [ ] Staging public visual regression PASS.
- [ ] Authenticated desktop baselines PASS.
- [ ] Authenticated mobile baselines üretildi/doğrulandı.
- [ ] Diff artifact yok veya review edilip açıkça onaylandı.

## iyzico sandbox

- [ ] `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`.
- [ ] Sandbox API key/secret staging environment'ta mevcut.
- [ ] Payment initialize PASS.
- [ ] Callback staging domain'e ulaştı.
- [ ] Payment attempt state doğru güncellendi.
- [ ] Order state doğru güncellendi.
- [ ] Entitlement/activation lifecycle doğru tamamlandı.
- [ ] Callback replay/idempotency kontrolü PASS.

## Production promotion

- [ ] Staging workflow tamamen yeşil.
- [ ] Production environment approval alındı.
- [ ] `npm run verify:phase20:production` PASS.
- [ ] Production Supabase project ref ve URL eşleşiyor.
- [ ] Production iyzico base URL `https://api.iyzipay.com`.
- [ ] `ALLOW_STAGING_MUTATIONS` production'da aktif değil.
- [ ] Production Vercel build PASS.
- [ ] Deploy sonrası smoke test PASS.

## Promotion kararı

- [ ] RC3 -> Production: APPROVED
- [ ] RC3 -> Production: BLOCKED

> Kural: Yukarıdaki runtime maddeleri gerçek staging/sandbox/production logu olmadan işaretlenmez.
