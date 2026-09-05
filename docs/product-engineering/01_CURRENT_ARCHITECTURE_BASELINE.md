# Yenomi ID — Current Architecture Baseline

**Baseline:** v25.8.82 / Guest Checkout package  
**Date:** 15 August 2026  
**Purpose:** Canonical discovery baseline for future product-engineering work

## 1. Repository baseline

- Package: `yenomi-id`
- Version: `25.8.82`
- Framework: Next.js App Router
- Language: TypeScript
- Database/Auth: Supabase
- Payment provider: PayTR
- Unit test runner: Vitest
- E2E/visual/quality runner: Playwright
- Database migrations: 52 files at baseline
- API route handlers: 37
- `page.tsx` route surfaces: 37
- Unit test files: 88
- E2E spec files: 14
- Package lockfile: npm lockfile v3
- Canonical demo matrix: `tests/fixtures/demo-user-matrix.ts`
- Current QA report: `QA_RUN_REPORT_V25.8.82.md`
- Product decisions: `PROJECT_DECISIONS.md`

## 2. Application surface

### Public

- `/`
- `/urunler`
- `/urunler/nfc-kart`
- `/kurumsal`
- `/giris`
- `/gizlilik`
- `/iade-iptal`
- `/mesafeli-satis-sozlesmesi`
- `/[slug]`
- `/p/[publicId]`
- `/c/[cardCode]`

### Commerce

- `/sepet`
- `/checkout`
- `/odeme/basarili`
- `/odeme/basarisiz`
- `/nfc-siparis`
- `/yenile`

### Individual account

- `/hesabim`
- `/siparislerim`
- `/kartlarim`
- `/kartim`
- `/olustur`
- `/aktivasyon`
- `/ayarlar`
- `/istatistikler`

### Corporate

- `/kurumsal/davet`
- `/kurumsal/panel`
- `/kurumsal/panel/ayarlar`
- `/kurumsal/panel/calisanlar`
- `/kurumsal/panel/icerik`
- `/kurumsal/panel/istatistikler`
- `/kurumsal/panel/kartlar`
- `/kurumsal/panel/lisans`
- `/kurumsal/panel/organizasyon`
- `/kurumsal/panel/roller`
- `/kurumsal/panel/sablon`

### Platform admin

- `/admin`

## 3. API/domain surface

Commerce and lifecycle boundaries currently include:

- `/api/commerce/checkout`
- `/api/commerce/claim`
- `/api/commerce/activate`
- `/api/commerce/activation/resend`
- `/api/commerce/entitlements`
- `/api/commerce/orders`
- `/api/commerce/orders/status`
- `/api/payments/paytr/callback`
- `/api/cards`
- `/api/profiles/save`

Corporate boundaries include organization membership, invitations, physical cards, templates, links, member status, card/profile analytics and organization ownership routes.

## 4. Design system

Canonical UI foundation currently lives primarily under:

- `app/components/ui/DesignSystem.tsx`
- `app/components/ui/States.tsx`
- `app/design-system.css`
- `design-tokens.css` / token-related project styles where applicable

Existing reusable primitives must be preferred before introducing new UI implementations.

`States.tsx` delegates canonical empty-state behavior to the design-system implementation. Do not create parallel EmptyState implementations.

## 5. CSS architecture

The repository already has route/component ownership contracts and verification scripts.

Relevant areas include:

- `app/globals.css`
- `app/legacy-surfaces.css`
- `app/dashboard-flow.css`
- `app/canonical.css` (live commerce + public chrome; `app/commerce-flow.css` is retired and must not be recreated)
- `app/public-conversion.css`
- `app/auth-flow.css`
- `app/public-card.css`
- `app/qr.css`
- `app/design-system.css`
- token styles

Baseline QA reports 10 CSS files in the Phase 21 verifier surface, 9,075 CSS lines, and 4,016 existing `!important` declarations.

**Invariant:** new `!important` declarations must remain at zero and legacy debt must not increase.

## 6. Commerce model

The implementation must preserve the separation between:

```text
Payment
  ↓
Order
  ↓
Order Item
  ↓
Entitlement
  ↓
Digital Access / Activation
  ↓
Profile / Card
```

Corporate seat-pack purchase adds organization authorization and seat/license fulfillment.

Guest checkout is permitted for physical individual purchases according to the v25.8.82 contract. Authenticated checkout remains account-bound. Corporate seat-pack purchases remain authenticated and permission-bound.

## 7. Payment model

Payment lifecycle includes the project-defined states around:

- created
- pending
- processing
- succeeded
- failed
- cancelled
- expired
- refunded
- partially refunded

The repository also contains fulfillment/reconciliation concepts. Do not collapse payment success and fulfillment success into one state.

## 8. Demo QA source of truth

`tests/fixtures/demo-user-matrix.ts` is the canonical semantic registry for demo scenarios. `scripts/seed-demo-scenarios.mjs` imports the same registry; `DEMO_TEST_USERS.md` is generated from it (`npm run docs:demo-users`).

It currently covers, among others:

- super admin
- individual pending/complete
- corporate owners and managers
- HR
- employee without card
- digital card ready
- physical card assigned
- lost card
- backup card
- suspended employee
- departed employee
- pending invitation
- capacity scenarios
- template scenarios
- lead scenarios

Do not scatter new demo-user assumptions across individual tests.

## 9. QA baseline

`QA_RUN_REPORT_V25.8.82.md` records PASS for the current static contracts covering guest checkout, payment lifecycle, product variant UX, package alignment and CSS `!important` delta.

Runtime verification was explicitly BLOCKED because the supplied environment did not have all required project-local dependencies/type packages installed. Therefore runtime checks must not be represented as PASS merely because static contracts pass.

## 10. Existing verification infrastructure

The package exposes verification commands for:

- phase contracts
- CSS architecture
- legacy CSS isolation
- release gates
- migration drift
- secrets
- database/catalog
- unit tests
- E2E
- visual regression
- cross-browser quality
- staging/production checks

Future work must extend or reuse these contracts rather than creating ad-hoc verification logic when an existing contract can be reused.

## 11. Runtime qualification

`npm run verify:runtime-prerequisites` is the first runtime gate. It verifies Node/npm engine compatibility, dependency installation, required local binaries and lockfile/package alignment.

If this gate fails because `node_modules` is absent, runtime checks are **BLOCKED**, not application **FAIL**. Once dependencies are installed, run typecheck, unit, build and relevant Playwright suites.

## 12. Baseline change policy

Any change to a baseline contract must state:

1. what existing behavior changes
2. why the change is required
3. which routes/components/APIs are affected
4. which tests protect the change
5. which regressions were checked
6. whether a migration is required
7. whether production behavior changes

No silent contract changes.

## 13. User identity types

Every `user_accounts` row stores three types:

1. `account_type` — login occupancy (`INDIVIDUAL` / `CORPORATE` / `TEST`)
2. `identity_product_family` — Digital ID, Pet ID, Emergency ID, Restaurant, Business Mini Site, Vehicle ID
3. `package_code` — determined by the purchased or provisioned package (`UNASSIGNED` until then)

`user_identity_types` holds every triple a user may have so Digital ID and Pet ID can coexist. Analytics remains a measurement capability, not a user type. Canonical mapping: `lib/identity/user-types.ts`. Migration: `supabase/migrations/20260819230000_user_identity_types.sql`.
