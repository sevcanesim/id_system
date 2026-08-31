# Yenomi ID Responsive Finalization Roadmap

Baseline: `main` at `3c5040e0b81e6f927c811caac590d7baec6d4642`

## Operating rule

Each phase is isolated in its own branch. Shared responsive primitives land first; route-family fixes are based on the latest accepted foundation. Business logic, pricing, payment, auth policy and entitlement changes are never hidden inside responsive work.

## Branch sequence

1. `responsive/01-foundation-shell-v2`
   - design-token and breakpoint audit
   - public shell/header/announcement/footer contracts
   - mobile gutter, safe-area, touch target and z-index contracts
   - remove overflow masking where root cause can be fixed safely
   - fixed/sticky inventory and route eligibility rules

2. `responsive/02-home-products`
   - `/`
   - `/urunler`
   - `/urunler/*`
   - hero/display typography, package cards, trust rows, comparison, FAQ and sticky purchase CTA
   - 320/360/390/430 mobile, 768/820/1024 tablet, 1440 desktop

3. `responsive/03-commerce`
   - `/sepet`
   - `/checkout`
   - commerce loading/error/empty states
   - cart badge, quantity controls, order summary and checkout CTA
   - price/SKU consistency verification against server-side catalog without changing business pricing

4. `responsive/04-how-support`
   - `/nasil-calisir`
   - `/destek`
   - step/list layouts, support search, categories, FAQ accessibility, long Turkish copy and direct-support journey

5. `responsive/05-corporate-public`
   - `/kurumsal`
   - employee preview, capacity table, CTA map, lead form, enterprise spacing and data-preview responsiveness
   - 100+ lead journey and table usability

6. `responsive/06-auth`
   - `/giris` and all real login/signup/password-reset states discovered in repository
   - auth shell density, account type switcher, form controls, keyboard/autofill, OAuth buttons, errors/loading/success
   - return-path behavior and security-sensitive findings reported separately

7. `responsive/07-authenticated-surfaces`
   - individual user-facing authenticated routes
   - corporate panel responsive shell and critical user journeys
   - kept separate from public surfaces to avoid CSS leakage

8. `responsive/08-regression-cleanup`
   - cross-route regression pass
   - dead/duplicate responsive CSS cleanup
   - final viewport matrix, accessibility/reflow, fixed/sticky collision pass
   - final build/verification and release verdict

## Required validation per branch

- repository scripts are taken from `package.json`; nonexistent scripts are never invented
- minimum static gates: `npm run typecheck`, `npm run verify:ui-system`, `npm run verify:typography`, relevant phase verifier, `npm run build`
- Playwright/live browser QA when runtime prerequisites are available
- no branch is accepted with known P0 issues

## Viewport matrix

Mobile: 320x568, 360x800, 375x812, 390x844, 393x852, 430x932.
Tablet: 768x1024, 810x1080, 820x1180, 1024x1366; meaningful landscape checks.
Desktop: 1280x800, 1366x768, 1440x900, 1512x982, 1728x1117.

The primary acceptance checkpoints are 320, 390, 430, 820, 1024 and 1440 widths.

## Severity gates

P0: horizontal page overflow, inaccessible navigation/form/checkout action, clipped critical content, sticky/fixed overlap, broken drawer, price/CTA unreadability.

P1: bad heading wrap, extreme whitespace, inconsistent shared chrome, broken tablet layout, oversized cards, table/data preview degradation, footer excessive height.

P2: minor alignment, subtle border/shadow/radius polish. P2 never blocks P0/P1 work.

## Foundation findings from current main

- Next.js 15.3.2 / React 19.
- `PublicSiteShell` already defines `marketing`, `commerce`, `support-legal`, `auth` and `checkout` header variants; preserve and harden this contract instead of creating route-local headers.
- `SiteHeader` already implements mobile drawer focus management, Escape handling and scroll locking; audit before replacing.
- canonical design tokens already include 640/768/1024/1280/1440 breakpoint primitives, section-spacing tokens, 44px control height and safe-area variables.
- root layout imports many overlapping global CSS layers; cascade ownership is a major regression risk and must be reduced deliberately rather than patched with more late overrides.
- `canonical-responsive-production.css` currently uses global `overflow-x: clip` and announcement ellipsis behavior. These can hide root causes and must be reviewed against the no-overflow-masking acceptance rule.
- current `/nasil-calisir` implementation is a simplified four-step semantic flow, not the older interactive screenshot concept; current repository truth wins.

## Merge policy

Do not create all later branches from the current `main` in advance. Each next branch is created from the accepted predecessor (or refreshed `main` after merge). This prevents eight diverging copies of shared CSS and sharply reduces merge conflicts.
