# Yenomi ID Premium Product Audit

## Executive findings

1. The visual system has strong semantic tokens, but `canonical.css` has grown into a 600KB+ monolith. UI ownership is therefore implicit rather than component-scoped, which makes regressions and duplicate selectors hard to detect.
2. Corporate pricing currently exposes a 2/3/5/10/25/50/100-seat ladder. This is operationally flexible but conversion-heavy: seven public choices plus Enterprise create decision fatigue.
3. Browser E2E coverage public ve görsel yüzeylerde aktiftir; PayTR sandbox ödeme → entitlement → aktivasyon zinciri ile yetkili staging akışları hâlâ dış ortam kabul testi gerektirir. Statik test sözleşmesi, bu dış koşuların yerine geçmez.
4. Security fundamentals are present (HttpOnly session flow, CSP nonce, no-store, request IDs, route-specific rate limits). Security work should focus on data minimization, sensitive-screen masking, redaction, and regression evidence rather than attempting impossible browser-level screenshot prevention.

## UI / Design system

### P0 — Split CSS ownership

**Problem:** `app/canonical.css` is a global monolith. A selector change can affect unrelated routes and makes pixel-level review expensive.

**Action:** keep tokens and primitives global, but move route/component rules into colocated CSS modules or bounded layer files. Add a selector-budget check and prevent duplicate route selectors.

### P0 — Corporate pricing choice overload

**Problem:** seven public package choices conflict with a frictionless sales funnel.

**Action:** surface three decision tiers while keeping granular SKUs as fulfillment variants:

- Start: up to 5 seats
- Business: up to 25 seats, recommended
- Enterprise: 26+ / custom

The picker may still calculate exact seat pricing after the user enters team size, but the first impression should contain three decisions, not seven.

### P1 — CTA hierarchy

Primary CTA must express the next outcome, not an implementation step. Prefer `Ekibimi Kur` / `Paketi Seç` for self-serve and `Kurumsal Teklif Al` for assisted sales. Keep only one primary CTA per visual section.

### P1 — Typography

Use Inter/Inter Display as the canonical product typeface. Do not introduce Playfair Display into application UI: it creates a second visual language and weakens consistency. Serif can be reserved for campaign artwork only.

### P1 — Mockups

Prefer CSS/SVG product mockups using real UI strings and vector icons. Do not ship raster mockups containing text or QR payloads. Every preview string must be valid product copy, never AI-generated filler.

## QA

### Critical regression matrix

| ID | Journey | Automation |
| --- | --- | --- |
| E2E-01 | Public route hydration, login form and mobile navigation | Playwright — mevcut |
| E2E-02 | Homepage/catalogue CTA ve paket fiyatı tutarlılığı | Playwright — mevcut |
| E2E-03 | Public satış metni, güven ve ödeme sınırı | Playwright — mevcut |
| E2E-04 | Responsive public/commerce/protected-route sınırı | Playwright — mevcut |
| E2E-05 | Bireysel ve kurumsal giriş sonrası panel düzeni | Playwright — environment credentials gerekli |
| E2E-06 | PayTR sandbox ödeme → callback → entitlement → aktivasyon | Sandbox kabul testi — açık |
| E2E-07 | Corporate invite → accept → profile publish | Seeded staging Playwright — açık |
| E2E-08 | Member LEFT/SUSPENDED protected mutation reddi | Seeded staging Playwright — açık |
| E2E-09 | Lost physical card public vCard/profile reddi | Staging + DB assertion — açık |

### Algorithmic test format

`[Test ID] | Purpose | Preconditions | Steps | Expected Result | Fail Condition`

Example:

`E2E-09 | Prevent suspended member mutation | seeded org + suspended member | login → open card editor → attempt save | editor is read-only or access-stopped and API mutation returns 403 | any mutation succeeds or UI presents active controls`

### Release gate

A skipped critical E2E is not a pass. CI should publish `critical automated / critical total` and block production when a journey marked `release_required` is skipped.

## Architecture / persistence

### State model

Keep orthogonal state axes. Do not infer one lifecycle from another:

- Member: `ACTIVE | INVITED | SUSPENDED | LEFT`
- Digital profile: `NONE | DRAFT | PUBLISHED | DISABLED`
- Physical card: `UNASSIGNED | ASSIGNED | ACTIVE | LOST | DISABLED | REPLACED`
- Invitation: `PENDING | ACCEPTED | EXPIRED | REVOKED`
- Entitlement: `AVAILABLE | CLAIMED | ACTIVE | EXPIRED | GRACE`

Every API response and UI badge should consume one central state mapper.

### Persistence requirements

Persist immutable/auditable events for:

- payment initiated / authorized / failed / recovered
- entitlement created / claimed / expired
- invitation created / accepted / revoked / expired
- physical card assigned / lost / disabled / replaced
- member suspended / left / reactivated
- corporate lead submitted and sales status changes

Never rely on UI state to reconstruct these histories.

## Security

### Existing baseline

The middleware already enforces CSP, request IDs, private/no-store responses on sensitive routes, stricter referrer policy for activation/checkout/payment surfaces, route-level rate limiting, payload limits, and protected-page session resolution.

### Required hardening

1. Never log access/refresh tokens, activation tokens, payment payloads, full emails, phone numbers, or request bodies on sensitive routes.
2. Add a shared structured logger with field redaction and production log allowlists.
3. Add `visibilitychange` masking for sensitive payment/profile surfaces so background tab/app-switch snapshots do not show secrets. This is privacy hardening, not screenshot prevention.
4. Treat screenshot blocking in a web app as non-guaranteed. Do not market it as a security control.
5. Add automated headers tests for CSP, Referrer-Policy, Cache-Control, X-Robots-Tag, cookie flags, and protected redirects.
6. Keep card/payment data out of localStorage/sessionStorage. Persist only non-sensitive UI preferences client-side.

## Pricing recommendation

Keep exact SKU prices configurable in the backend, but simplify public positioning:

### Start
- up to 5 employees
- centralized profiles and card lifecycle
- shared brand template
- annual plan

### Business — recommended
- up to 25 employees
- role-based management
- analytics
- Network Mail allowance
- priority onboarding

### Enterprise
- 26+ employees / custom capacity
- migration/import
- custom reporting and integrations
- named onboarding/support
- annual contract + implementation fee when custom work is required

Pricing should reward annual commitment and team growth, but discounts must be calculated from gross margin floors rather than arbitrary percentages.

## Conversion copy

Hero should answer three questions in under five seconds: what it is, why it is better, what to do next.

Recommended structure:

- Kicker: `YENOMI BUSINESS`
- H1: `Ekibinizin dijital kimliğini tek merkezden yönetin.`
- Supporting copy: `NFC + QR kartlar, canlı profil güncelleme, kayıp kart kontrolü ve ekip yönetimi. Yeniden baskı beklemeden herkes güncel.`
- Primary CTA: `Ekibimi Kur`
- Secondary CTA: `25+ Kişi İçin Teklif Al`

Trust microcopy should be concrete: `Kart numarası saklanmaz`, `Ödeme iyzico altyapısında`, `Yetkiler rol bazlı`, `Kayıp kart panelden kapatılır`.

## Code-cleanliness policy

- Remove comments that narrate obvious code.
- Keep comments that encode invariants, security decisions, non-obvious lifecycle rules, or external constraints.
- Rename generic variables only when domain meaning improves; do not rename mechanically.
- Reject duplicated helpers, speculative abstractions, dead feature flags, and placeholder copy.
- Prefer small domain modules over one large catch-all utility file.
