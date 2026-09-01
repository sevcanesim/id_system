# Yenomi ID — Full Visual & Layout Audit Ledger

This document is the evidence ledger for the route-wide visual/layout audit. It supplements, and does not replace, the product-engineering, responsive, accessibility, auth, commerce, or database contracts.

## Inventory reconciliation

The supplied directive says 47 pages, but the route list contains **42 concrete URL patterns**: 16 public/general, 6 commerce, 8 individual, and 12 corporate. The audit therefore treats those 42 patterns as the requested inventory. Any additional repository route discovered during route inventory is recorded separately; five routes are not invented to satisfy the stated number.

Dynamic public routes (`/[slug]`, `/p/[publicId]`, `/c/[cardCode]`, `/e/[eventPublicId]`) require stable fixture identifiers. Signed-in individual and corporate routes require an isolated authenticated fixture/storage state. Production seeding is prohibited.

## Canonical visual contract

Repository design tokens remain authoritative. Public marketing display typography is intentionally larger than dashboard typography and must not be reduced merely to fit the dashboard H1/H2 ranges from the audit brief. Audit checks focus on semantic consistency within each surface family, local Inter/system-sans usage, line-height, containment, component spacing, card alignment, data-table/preview fit, and document overflow.

Hard guardrails for this audit:

- no new `!important`;
- no edits to global CSS selector definitions;
- no raw replacement design language outside the canonical tokens;
- no auth/RLS/commerce/business-rule changes;
- no document-level overflow masking as a substitute for component fixes.

## Automated viewport matrix

`tests/e2e/visual-layout-audit.spec.ts` executes the requested 375, 390, 768, 1280, and 1920 CSS-pixel widths. For renderable routes it checks:

- HTTP response below 500;
- document horizontal overflow;
- visible non-scroll-container elements escaping the viewport;
- Times/Arial-family leakage and compressed line-height;
- long e-mail/URL/title containment without hidden overflow hacks.

Authenticated routes are deliberately marked BLOCKED in this suite until a safe signed-in fixture is available. Existing auth-boundary suites remain responsible for unauthenticated protection.

## Route ledger

| Route | Family | Live audit status | Notes |
| --- | --- | --- | --- |
| `/` | Public | PENDING CI | 5 viewport matrix |
| `/urunler` | Public | PENDING CI | 5 viewport matrix |
| `/urunler/nfc-kart` | Public | PENDING CI | 5 viewport matrix |
| `/kurumsal` | Public | PENDING CI | 5 viewport matrix |
| `/nasil-calisir` | Public | PENDING CI | 5 viewport matrix |
| `/destek` | Public | PENDING CI | 5 viewport matrix |
| `/giris` | Public/Auth | PENDING CI | signed-out render |
| `/gizlilik` | Public/Legal | PENDING CI | 5 viewport matrix |
| `/kvkk` | Public/Legal | PENDING CI | 5 viewport matrix |
| `/iade-iptal` | Public/Legal | PENDING CI | 5 viewport matrix |
| `/mesafeli-satis-sozlesmesi` | Public/Legal | PENDING CI | 5 viewport matrix |
| `/hizmet-sartlari` | Public/Legal | PENDING CI | 5 viewport matrix |
| `/[slug]` | Public profile | BLOCKED FIXTURE | `E2E_PUBLIC_SLUG` required |
| `/p/[publicId]` | Public profile | BLOCKED FIXTURE | `E2E_PUBLIC_ID` required |
| `/c/[cardCode]` | Public card | BLOCKED FIXTURE | `E2E_CARD_CODE` required |
| `/e/[eventPublicId]` | Public event | BLOCKED FIXTURE | `E2E_EVENT_PUBLIC_ID` required |
| `/sepet` | Commerce | PENDING CI | empty-cart render is still valid layout evidence |
| `/checkout` | Commerce | PENDING CI | signed-out/default state only |
| `/odeme/basarili` | Commerce | PENDING CI | parameterless state only |
| `/odeme/basarisiz` | Commerce | PENDING CI | parameterless state only |
| `/nfc-siparis` | Commerce | PENDING CI | 5 viewport matrix |
| `/yenile` | Commerce/Auth | BLOCKED AUTH | isolated individual fixture required |
| `/kartim` | Individual | BLOCKED AUTH | isolated individual fixture required |
| `/olustur` | Individual | BLOCKED AUTH | phone-preview fit requires signed-in data |
| `/hesabim` | Individual/router | BLOCKED AUTH | server role routing requires signed-in fixture |
| `/ayarlar` | Individual | BLOCKED AUTH | isolated individual fixture required |
| `/siparislerim` | Individual | BLOCKED AUTH | isolated individual fixture required |
| `/kartlarim` | Individual | BLOCKED AUTH | isolated individual fixture required |
| `/istatistikler` | Individual | BLOCKED AUTH | isolated individual fixture required |
| `/leadler` | Individual | BLOCKED AUTH | isolated individual fixture required |
| `/kurumsal/panel` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/organizasyon` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/calisanlar` | Corporate | BLOCKED AUTH | employee table/card live fit requires fixture |
| `/kurumsal/panel/roller` | Corporate | BLOCKED AUTH | source already provides desktop matrix + mobile cards; live verification still required |
| `/kurumsal/panel/sablon` | Corporate | BLOCKED AUTH | phone-preview fit requires fixture |
| `/kurumsal/panel/icerik` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/etkinlikler` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/leadler` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/gorusmeler` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/istatistikler` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/lisans` | Corporate | BLOCKED AUTH | isolated corporate fixture required |
| `/kurumsal/panel/ayarlar` | Corporate | BLOCKED AUTH | isolated corporate fixture required |

## Evidence-backed findings and fixes

| Route / scope | Category | Finding | Root cause / action | State |
| --- | --- | --- | --- | --- |
| Audit CI | Architecture validation | First audit workflow stopped at CSS architecture before Playwright ran. | `verify-css-budget.mjs` compares against `HEAD^`; default `actions/checkout` depth did not include history. Audit workflow now uses `fetch-depth: 0`. No production CSS was changed. | FIXED |
| `/kurumsal/panel/roller` | Layout fit | Source does not force the six-column role matrix into a phone viewport. | `RolesPanel.module.css` hides the desktop matrix below 767px and renders tokenized mobile role cards with `min-width:0` and long-label wrapping. Keep this architecture; verify live with corporate fixture. | SOURCE PASS / LIVE BLOCKED |
| Global document | Overflow observability | Legacy mobile layer contains document-level clipping, while the later production responsive layer intentionally restores overflow observability. | Do not modify global selectors in this audit due explicit guardrail. Fix any component overflow reported by Playwright at component ownership instead. | MONITOR |

## Required final report

The final audit is not complete until every non-blocked route/viewport has browser evidence and every changed route is re-run after its fix. The final user-facing report uses: Route | Category | Detected problem | Fix / CSS or TSX file, and distinguishes PASS, FIXED, and BLOCKED rather than guessing authenticated results.
