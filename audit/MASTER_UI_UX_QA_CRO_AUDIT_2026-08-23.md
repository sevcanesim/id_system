# Yenomi ID — Master UI / UX / QA / CRO / Business Flow Audit

**Date:** 23 August 2026  
**Auditor role:** Senior QA + UX/UI + CRO + business-flow review  
**Live surface:** https://yenomi-id.vercel.app  
**Code baseline reviewed:** `origin/main` @ `e76f308` (#125 audit + #126 canonical/honesty merged) plus in-flight PR **#127** (CSP nonce hydration + catalog 4-row grid)  
**Package:** 25.9.4  

## Evidence bounds (read first)

This is not a full Apple/Stripe-grade lab run. What was actually executed:

| Check | Result |
| --- | --- |
| Live HTML crawl of public routes | Done: `/`, `/urunler`, `/urunler/nfc-kart`, `/nasil-calisir`, `/kurumsal`, `/destek`, `/giris`, `/sepet`, `/checkout`, `/gizlilik`, `/aktivasyon`, 404, `/p/invalid-id` |
| Interactive Chrome at 1440 / 1280 / 390 | Homepage + several public pages. Tablet 768 not fully exercised. No real iPhone Safari, Firefox, Edge, or Android device. |
| Authenticated dashboard / corporate panel | **Not run** (no production credentials in this environment) |
| iyzico sandbox purchase → entitlement → activation | **Not run** (`IYZICO_*` absent). Playwright E2E-01…05 and E2E-07 are skipped skeletons. |
| `verify:db` / staging mutations | **BLOCKED** |
| Production deploy of current `main` | **Not on live.** Live Vercel is a cache HIT of an older build. Protected Production Deploy still fails `verify:phase20:production` on missing `PRODUCTION_*` / `LEGAL_*` / Vercel secrets. |

Never treat BLOCKED or NOT RUN as PASS.

**Product contract (binding, not optional taste):** public chrome stays warm-light `#F9F8F6`. Dark luxury is specimen-only. Do not restyle the shell to `#0B0B0B`. Specimen identity is Selin Kaya / Ürün Yöneticisi / Yenomi Labs. Public purchase CTA is `NFC Kartı Satın Al`. Corporate header CTA is `Paketleri İncele`.

Live vs `main` delta is itself a conversion defect: customers on Vercel do not yet have merged how-it-works board, Campaign Mail removal, hamburger overlay, or CSP nonce on static documents. Recrawl 23 Aug ~14:24 UTC: `/` `/giris` `/sepet` `/checkout` `/aktivasyon` `/nasil-calisir` are Vercel HTML HITs with **zero** `nonce=` (scripts blocked). `/urunler` `/destek` `/urunler/nfc-kart` `/kurumsal` are MISSes that already stamp a matching nonce — those pages can hydrate, but live CSS still has `.public-site-chrome{transform:translateZ(0)}` and no `.yi-nav-backdrop`, so the overlay bug remains even where JS runs.

## Follow-through (23 August, same day)

Code fixes that do not require production secrets:

| Item | Status |
| --- | --- |
| QA-001 hamburger overlay | **Code on `main`.** PR **#124** merged. Live still has no `.yi-nav-backdrop`. |
| QA-001b CSP hydration (was QA-015 P3) | **Code in PR #127.** Live recrawl: `/giris` (age ~14h), `/checkout`, `/sepet`, `/aktivasyon`, `/` are HITs with 0 `nonce=`. Login, cart, and pay never hydrate on those documents. Overlay fix alone cannot open a menu (or a login tab) that never hydrates. Do not add `unsafe-inline`. |
| QA-002 production secrets / deploy | **Unchanged. Human-only.** Do not weaken `verify:phase20:production`. |
| QA-003 Campaign Mail card | **Code on `main`** (PR #119). Live `/kurumsal` still has `Campaign Mail` (15) / `CAMPAIGN-MAIL` (9). |
| QA-004 how-it-works board | **Code on `main`** (PR #123). Live still lacks `how-steps-board`. |
| QA-005 canonical host + sitemap | **Merged.** PR **#126** on `main` (`e76f308`). Live `/sitemap.xml` still hardcodes `qr.yenomilabs.com` and omits marketing routes. |
| QA-006 guest purchase E2E | **Not run.** Still needs iyzico sandbox. Skipped specs are not a pass. |
| QA-008 checkout / activation first paint | **Merged in #126.** Live still serves the stale first-paint copy. |
| QA-009 footer product links | **Merged in #126.** |
| QA-010 recover-by-UUID | **Already gated in current code** (`cookie` or authenticated owner). Not re-opened. |
| QA-011 ticker duplicate | **Merged in #126.** |
| QA-007 catalog equal height | **Code in PR #127.** Card grid is `auto auto auto 1fr` with CTA `flex-end`; spare-card hint/login sit above Sepete Ekle so the three purchase controls share one baseline. |

Remaining to close the audit in **production**, not in git: land **#127**, fill `PRODUCTION_*` / `LEGAL_*` / Vercel secrets, dispatch Protected Production Deploy, then retest hamburger on a real iPhone and confirm live SHA === `main`.

---

# 1. EXECUTIVE SUMMARY

Live production is a warm-light, contract-compliant marketing site with a **broken mobile navigation**, **non-hydrating login/checkout/cart documents**, a **stale deploy**, and **unproven payment/entitlement journeys**. Desktop public pages look intentional. Mobile cannot open the primary nav on `/`. Canonical URLs still advertise `qr.yenomilabs.com` (this environment cannot resolve that host). Playwright covers **1/7** critical journeys.

The product is not failing because it looks “not dark-luxury enough.” It is failing because:

1. Static Vercel HITs ship HTML without the response CSP nonce, so Next never hydrates (`/`, `/giris`, `/sepet`, `/checkout`, `/aktivasyon`).
2. Live CSS still creates a containing-block overlay over the hamburger (`translateZ(0)`).
3. Production cannot be promoted (secrets / env contract).
4. Guest purchase → pay → activate is not E2E-proven.
5. Live pages still show retired Campaign Mail merchandising and the old how-it-works 4-up.

Fix those before another visual restyle.

---

# 2. P0 CRITICAL ISSUES

---

TEST ID: QA-2026-08-23-001  
CATEGORY: [FUNCTIONAL] [UX] [RESPONSIVE] [CRO]  
SEVERITY: P0  
PAGE: Public header (all public routes)  
URL: https://yenomi-id.vercel.app/  
BROWSER: Chrome DevTools  
DEVICE: 390px iPhone emulation  
PRECONDITIONS: Logged-out visitor, viewport ≤1180px  

PROBLEM: Hamburger is visible but does not open the drawer. Mobile visitors cannot reach Ürünler, Nasıl Çalışır, Kurumsal, Destek, or Giriş from the header. Same CSP miss also leaves `/giris`, `/sepet`, and `/checkout` as dead documents on cache HIT.

STEPS TO REPRODUCE:  
1. Open https://yenomi-id.vercel.app/ at 390px.  
2. Tap the three-line control top-right.  
3. Wait for a drawer or overlay.  

EXPECTED RESULT: Drawer opens; links are reachable; overlay/toggle can close it.  
ACTUAL RESULT: No drawer. Control does not toggle.  
FAIL CONDITION: `aria-expanded` stays false / `.yi-nav.is-open` never appears after a tap.  
BUSINESS IMPACT: Majority of traffic is mobile. Discovery and purchase paths are header-dependent.  
UX IMPACT: The chrome looks tappable and does nothing. Trust drops immediately.  
RECOMMENDED FIX: Overlay/stacking is PR **#124** (merged). Hydration is PR **#127**: root layout must read `x-nonce`, documents must be `no-store`, Next scripts must carry the same nonce as the response CSP. Overlay without hydration is still a dead control; hydration without overlay fix still fails on live CSS. **Land #127 and run Protected Production Deploy.** Do not add `unsafe-inline`.  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-002  
CATEGORY: [BUSINESS LOGIC] [CRO]  
SEVERITY: P0  
PAGE: Release / production  
URL: GitHub Actions “Protected Production Deploy”  
BROWSER: n/a  
DEVICE: n/a  
PRECONDITIONS: Human has repo admin on `sevcanesim/id_system`  

PROBLEM: Live Vercel is not current `main`. Deploy job fails `verify:phase20:production` because workflow maps `PRODUCTION_*` secrets and production still lacks required names (`PRODUCTION_SITE_URL`, `PRODUCTION_SUPABASE_PUBLISHABLE_KEY`, `PRODUCTION_IYZICO_*`, `PRODUCTION_UPSTASH_*`, `LEGAL_*`, Vercel IDs).  

STEPS TO REPRODUCE:  
1. Compare live `/nasil-calisir` (4-up cards) to `main` (`how-steps-board`).  
2. Compare live `/kurumsal` (Campaign Mail card still listed) to `main` (card removed in PR #119).  
3. Open latest production-deploy workflow logs.  

EXPECTED RESULT: Production SHA equals `main`; merchandising matches merged product.  
ACTUAL RESULT: Live lag + deploy FAIL.  
FAIL CONDITION: Production SHA ≠ `main` after an intended release.  
BUSINESS IMPACT: Fixes customers already reported (hamburger, how-it-works, Campaign Mail) never reach them.  
UX IMPACT: Support and ads point at a different product than engineering.  
RECOMMENDED FIX: Human-only: add production env secrets with the **workflow’s `PRODUCTION_*` names**, set `LEGAL_CONTENT_APPROVED=true` only after legal review, add Vercel org/project/token, then dispatch Protected Production Deploy. Do not weaken `verify:phase20:production`. Do not put staging mutation back into `staging-integration.yml`.  
AUTOMATION CANDIDATE: NO (secret plumbing)  
REGRESSION TEST REQUIRED: YES (post-deploy smoke)  
CLASSIFICATION: [MANUAL]

---

# 3. P1 HIGH ISSUES

---

TEST ID: QA-2026-08-23-003  
CATEGORY: [CRO] [BUSINESS LOGIC]  
SEVERITY: P1  
PAGE: `/kurumsal` live  
URL: https://yenomi-id.vercel.app/kurumsal  
BROWSER: any  
DEVICE: desktop  
PRECONDITIONS: Logged-out  

PROBLEM: Live still merchandises **Campaign Mail** as a priced card and lead-form option. Copy says it is not sold at checkout, but the page still presents SKUs and prices. `main` already removed the public card (PR #119).  

STEPS TO REPRODUCE:  
1. Open live `/kurumsal`.  
2. Scroll to Network Mail / Campaign Mail.  
3. Open the teklif `<select>`.  

EXPECTED RESULT: Only live, purchasable or quote-true offers. Campaign Mail is catalog/ledger, not a sales card.  
ACTUAL RESULT: Campaign Mail card + lead option still on live.  
FAIL CONDITION: Public corporate page sells a COMING_SOON SKU.  
BUSINESS IMPACT: Quote pipeline fills with a product that cannot be checked out. Sales time wasted; buyer feels baited.  
UX IMPACT: Two mail products compete; Business pack is no longer the only “natural” next step.  
RECOMMENDED FIX: Deploy `main`. Do not re-add a Campaign Mail pricing card.  
AUTOMATION CANDIDATE: YES (faz4 already locks absence of the card on `main`)  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-004  
CATEGORY: [CRO] [UX]  
SEVERITY: P1  
PAGE: `/nasil-calisir` live  
URL: https://yenomi-id.vercel.app/nasil-calisir  
BROWSER: Chrome 1440  
DEVICE: desktop  
PRECONDITIONS: Logged-out  

PROBLEM: Live still shows the old 4-column step row. `main` (PR #123) is a left scene board + stacked Adım 3/4. Ads and support that describe the new story do not match production.  

STEPS TO REPRODUCE:  
1. Open live `/nasil-calisir`.  
2. Compare to `app/nasil-calisir/page.tsx` on `main` (`how-steps-board`).  

EXPECTED RESULT: Live matches merged board (gallery + live role sync + stacked 3/4).  
ACTUAL RESULT: Four equal cards in a row.  
FAIL CONDITION: Production HTML lacks `how-steps-board`.  
BUSINESS IMPACT: The “how it works” conversion page is the stale version.  
UX IMPACT: Weaker narrative than the locked Faz4 composition.  
RECOMMENDED FIX: Deploy `main`.  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-005  
CATEGORY: [CRO] [DATA]  
SEVERITY: P1  
PAGE: SEO / share / vCard  
URL: https://yenomi-id.vercel.app/sitemap.xml and `app/layout.tsx` `metadataBase`  
BROWSER: n/a  
DEVICE: n/a  
PRECONDITIONS: This audit environment  

PROBLEM: Sitemap, robots, Open Graph, slug/vCard helpers hardcode `https://qr.yenomilabs.com`. In this environment that hostname **does not resolve**. Live browsing happens on `yenomi-id.vercel.app`. Sitemap omits `/`, `/nasil-calisir`, `/kurumsal`, `/destek`.  

STEPS TO REPRODUCE:  
1. GET `/sitemap.xml` (200; locs are `qr.yenomilabs.com/...`).  
2. Resolve `qr.yenomilabs.com` from the audit host (fails here).  
3. Diff sitemap paths vs public IA.  

EXPECTED RESULT: Canonical host is the live HTTPS origin that actually serves the product; sitemap lists all indexable marketing routes.  
ACTUAL RESULT: Dual-host; marketing routes missing from sitemap.  
FAIL CONDITION: Shared OG URL 404s or NXDOMAIN; Google indexes a host customers never use.  
BUSINESS IMPACT: Share cards, QR printed URLs, and search can point at a dead or split origin.  
UX IMPACT: “Open this card” from iMessage/LinkedIn fails if DNS/HTTPS is wrong.  
RECOMMENDED FIX: Single source of truth: `NEXT_PUBLIC_SITE_URL`. Drive `metadataBase`, `sitemap.ts`, `robots.ts`, `lib/public-card/urls.ts`. Add `/`, `/nasil-calisir`, `/kurumsal`, `/destek` to the sitemap **and** robots `allow` (code on `main` + #127). Confirm DNS + TLS for the chosen host **before** printing QR plates.  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [HYBRID]

---

TEST ID: QA-2026-08-23-006  
CATEGORY: [FUNCTIONAL] [DATA]  
SEVERITY: P1  
PAGE: Guest purchase chain  
URL: `/urunler/nfc-kart` → `/sepet` → `/checkout` → iyzico → `/odeme/basarili` → `/aktivasyon`  
BROWSER: untested live  
DEVICE: untested  
PRECONDITIONS: Sandbox iyzico + staging DB  

PROBLEM: The revenue path is not covered by a running E2E. `e2e/critical-journeys.spec.ts` documents **COVERAGE: 1/7**. Unit tests cover settlement idempotency; they do not prove 3DS, callback delay, or guest claim.  

STEPS TO REPRODUCE:  
1. Run Playwright against `E2E_BASE_URL` without skipping E2E-01…05.  

EXPECTED RESULT: Green guest physical purchase in sandbox.  
ACTUAL RESULT: Tests skip.  
FAIL CONDITION: Release treated as “journeys verified” while specs skip.  
BUSINESS IMPACT: Silent payment/entitlement regressions.  
UX IMPACT: “Did my payment happen?” remains possible in production incidents.  
RECOMMENDED FIX: Do not call skipped E2E a pass. After secrets exist, implement E2E-01 (guest pay), E2E-02 (recover), E2E-04 (claim). Keep unit replay tests.  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

# 4. P2 MEDIUM ISSUES

---

TEST ID: QA-2026-08-23-007  
CATEGORY: [UI] [CRO]  
SEVERITY: P2  
PAGE: `/urunler`  
URL: https://yenomi-id.vercel.app/urunler  
BROWSER: Chrome 1440  
DEVICE: desktop  
PRECONDITIONS: Logged-out  

PROBLEM: Live catalog trio does not read as equal-height. Flex + `margin-top: auto` still lets the Premium badge wrap and the Yedek Kart guest hint steal the footer row. **#127** uses `grid-template-rows: auto auto auto minmax(0, 1fr)` and packs the CTA to the bottom so Sepete Ekle stays on one baseline.  

STEPS TO REPRODUCE:  
1. Open `/urunler` at 1440.  
2. Align the three card bottom edges.  
3. Repeat logged-out (Yedek Kart shows hint + disabled control).  

EXPECTED RESULT: One row, one CTA baseline.  
ACTUAL RESULT: Uneven bottoms on live.  
FAIL CONDITION: Card footer CTAs not on a shared baseline.  
BUSINESS IMPACT: Catalog looks unfinished; Premium (the upsell) looks accidental rather than chosen.  
UX IMPACT: Hierarchy leaks through leftover height.  
RECOMMENDED FIX: Shipped in **#127** (CTA row grows; hint/login above the purchase button). Recheck bounding boxes after production deploy.  
AUTOMATION CANDIDATE: YES (Playwright screenshot + bounding boxes)  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [HYBRID]

---

TEST ID: QA-2026-08-23-008  
CATEGORY: [PERFORMANCE] [UX]  
SEVERITY: P2  
PAGE: `/checkout`, `/aktivasyon`  
URL: https://yenomi-id.vercel.app/checkout  
BROWSER: first HTML (no JS wait)  
DEVICE: any  

PROBLEM: Empty checkout first paint is “Ödeme hazırlanıyor…”. Activation first paint is “Aktivasyon hazırlanıyor…”. After hydrate, empty checkout becomes “Kartın henüz sepette değil.” Activation without token shows resend. Crawlers and slow JS users see a fake pending payment.  

STEPS TO REPRODUCE:  
1. Open `/checkout` with empty cart; disable JS or view first HTML.  
2. Open `/aktivasyon` with no `token`.  

EXPECTED RESULT: Empty checkout is a shop CTA immediately; tokenless activation is resend, not “checking your order.”  
ACTUAL RESULT: Suspense/client ready flags look like in-flight payment.  
FAIL CONDITION: Copy implies a charge is in progress when none is.  
BUSINESS IMPACT: Anxiety (“did I pay?”) on the highest-trust surface.  
UX IMPACT: Anti-premium.  
RECOMMENDED FIX: Server-render the empty-cart checkout branch. Activation fallback copy: “Bağlantını bekliyoruz” / resend, not “Sipariş bağlantın kontrol ediliyor.”  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-009  
CATEGORY: [CRO] [UX]  
SEVERITY: P2  
PAGE: Footer  
URL: all public pages  
BROWSER: any  
DEVICE: any  

PROBLEM: Footer is brand + Opsola/Yenomilabs + legal only. No `/urunler`, `/nasil-calisir`, `/kurumsal`. After a how-it-works or legal scroll, the next commercial action is gone.  

STEPS TO REPRODUCE:  
1. Scroll to footer on `/gizlilik` or `/destek`.  
2. Try to start a purchase without using the header.  

EXPECTED RESULT: One quiet product cluster (Kart, Nasıl çalışır, Kurumsal) plus legal.  
ACTUAL RESULT: Legal-only nav.  
FAIL CONDITION: User on a legal/help URL cannot reach catalog without the header.  
BUSINESS IMPACT: Footer exits leak.  
UX IMPACT: Site feels like a brochure, not a store.  
RECOMMENDED FIX: Add three text links in `SiteFooter` using existing footer type. Do not add a second gold.  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-010  
CATEGORY: [SECURITY]  
SEVERITY: P2  
PAGE: `/api/payments/iyzico/recover`  
URL: API  
BROWSER: n/a  
DEVICE: n/a  
PRECONDITIONS: Known from `audit/SYSTEM_HARDENING_AUDIT_V25.9.4.md`; not re-exploited here  

PROBLEM: Recover can accept an order UUID in the body when the pending-order cookie is missing. Rate-limited. Settlement still requires iyzico retrieve. Residual: order-id oracle.  

EXPECTED RESULT: Recover bound to pending-order cookie **or** authenticated ownership.  
ACTUAL RESULT: UUID probe still in the threat model.  
FAIL CONDITION: Unauthenticated client learns paid/pending/failed for an arbitrary UUID.  
BUSINESS IMPACT: Privacy of payment state.  
UX IMPACT: Indirect (support/fraud).  
RECOMMENDED FIX: Require cookie or session ownership. Keep email deep-link recover.  
AUTOMATION CANDIDATE: YES (API test)  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-011  
CATEGORY: [PERFORMANCE] [ACCESSIBILITY]  
SEVERITY: P2  
PAGE: Announcement ticker  
URL: all loud public pages  
BROWSER: any  
DEVICE: any  

PROBLEM: Marquee duplicates the four trust items (animation loop). HTML dump shows the block twice. There is an `aria-label` on the bar; inner text still repeats for some AT.  

EXPECTED RESULT: One accessible name; decorative copies `aria-hidden`.  
ACTUAL RESULT: Duplicated strings in the document.  
FAIL CONDITION: Screen reader announces SSL / iyzico / kargo twice on every page.  
BUSINESS IMPACT: Low conversion; high annoyance on first visit.  
UX IMPACT: Noise before the H1.  
RECOMMENDED FIX: `aria-hidden="true"` on `.yi-brand-marquee__track`; keep the existing `role="note"` label.  
AUTOMATION CANDIDATE: YES  
REGRESSION TEST REQUIRED: YES  
CLASSIFICATION: [AUTOMATE]

---

# 5. P3 LOW ISSUES

---

TEST ID: QA-2026-08-23-012  
CATEGORY: [UI] [ACCESSIBILITY]  
SEVERITY: P3  
PAGE: Global  
URL: n/a  
PROBLEM: Gold (`#A37B2C` / `#9E7728`) on cream fails some AA pairings for small text (kickers, ticker stars). Large CTA gold-on-ink is the intended fill and is acceptable.  
RECOMMENDED FIX: Keep gold as fill on buttons only. Kickers stay `#8b6835` (already locked). Do not punch gold saturation.  
AUTOMATION CANDIDATE: YES (contrast tokens)  
REGRESSION TEST REQUIRED: NO  
CLASSIFICATION: [HYBRID]

---

TEST ID: QA-2026-08-23-013  
CATEGORY: [UI]  
SEVERITY: P3  
PAGE: 404  
URL: https://yenomi-id.vercel.app/this-page-does-not-exist  
PROBLEM: Document title stays the default site title, not a 404 title. Body copy is good (“Bu sayfa yok. Kartın duruyor.”).  
RECOMMENDED FIX: `not-found` metadata title.  
CLASSIFICATION: [AUTOMATE]

---

TEST ID: QA-2026-08-23-014  
CATEGORY: [UX]  
SEVERITY: P3  
PAGE: `/nfc-siparis`  
PROBLEM: Legacy order UI still exists beside `/checkout` (hardening audit). Two payment surfaces.  
RECOMMENDED FIX: Redirect `/nfc-siparis` → `/checkout` once traffic is zero. Do not skin both.  
CLASSIFICATION: [MANUAL]

---

TEST ID: QA-2026-08-23-015  
CATEGORY: [SECURITY] [FUNCTIONAL]  
SEVERITY: P0 (originally filed P3 as console noise; runtime retest 23 August)  
PAGE: All public documents  
URL: https://yenomi-id.vercel.app/ and local `next start`  
PROBLEM: Middleware CSP is `script-src 'nonce-…' 'strict-dynamic'`. Live homepage HIT (`age` ~4700s) and `/giris` HIT (`age` ~52000s) have **zero** `nonce=` attributes. Parser-inserted Next chunks are blocked. React never hydrates; hamburger `onClick`, login tabs, cart, and checkout never attach. Dynamic routes such as `/urunler` already stamp a matching nonce (30+ attrs) — proof the runtime can do it when the document is not a static HIT. Local `next start` reproduced the homepage block until the root layout consumed `x-nonce`.  
RECOMMENDED FIX: PR **#127** — `headers()` in root layout, document `Cache-Control: private, no-store`, Playwright journey at 390px plus nonce assertions on `/giris` `/sepet` `/checkout`. Do **not** add `unsafe-inline`.  
CLASSIFICATION: [AUTOMATE]

---

# 6. UI / VISUAL AUDIT

PROBLEM: Live mobile header control is ornamental.  
CURRENT BEHAVIOR: Three lines render; tap is a no-op.  
WHY IT LOOKS / FEELS WRONG: Premium products do not ship a fake control.  
PREMIUM IMPACT: Immediate “assembled, not designed.”  
CONVERSION IMPACT: Direct — catalog/corporate unreachable from header.  
RECOMMENDED CHANGE: Ship PR #124. “Şu hatalı: overlay, sticky `transform` yüzünden hamburgerin üstünde. Bunun yerine: transform yok; gerçek backdrop; toggle z-index 23.”  
PRIORITY: P0  

PROBLEM: Live how-it-works is a flat 4-up; `main` is a board.  
CURRENT BEHAVIOR: Four equal cards, phone mockups in a row.  
WHY IT LOOKS / FEELS WRONG: Not because 4-up is ugly — because it is not the product you just designed.  
PREMIUM IMPACT: Split-brain brand.  
CONVERSION IMPACT: Weaker “Adım 2 live sync” story.  
RECOMMENDED CHANGE: Deploy `main`. Do not invent a third layout.  
PRIORITY: P1  

PROBLEM: Catalog cards on live look ragged.  
CURRENT BEHAVIOR: Premium column taller.  
WHY IT LOOKS / FEELS WRONG: Feature lists of different length without a shared CTA row.  
PREMIUM IMPACT: Medium.  
CONVERSION IMPACT: Premium badge fights the grid instead of anchoring it.  
RECOMMENDED CHANGE: Code in **#127**. Recheck live after deploy.  
PRIORITY: P2  

PROBLEM: Dark-luxury shell is **not** a defect.  
CURRENT BEHAVIOR: Canvas `#F9F8F6`; specimens matte black + champagne.  
WHY IT LOOKS / FEELS WRONG: It would be wrong to invert this.  
PREMIUM IMPACT: Correct for this brand.  
CONVERSION IMPACT: Warm paper + one gold fill is the CRO system.  
RECOMMENDED CHANGE: None. Reject `#0B0B0B` html.  
PRIORITY: n/a (PASS)

PROBLEM: Specimen identity is correct on live.  
CURRENT BEHAVIOR: Selin Kaya / Ürün Yöneticisi / Yenomi Labs.  
RECOMMENDED CHANGE: Keep. No field-label mockups.  
PRIORITY: n/a (PASS)

---

# 7. UX / FRICTION AUDIT

| Step | Friction | Severity |
| --- | --- | --- |
| Land on mobile | Header nav dead | P0 |
| Understand value | Homepage copy is clear: one press, live profile, lost mode | PASS |
| Trust ticker | Duplicated in DOM | P2 |
| Select product | Catalog 3-up; Premium secondary CTA (correct CRO) | PASS on `main` |
| Spare card | Guest sees Sepete Ekle label + “Giriş gerekli” hint (live HTML may still show a live-looking button if deploy is old) | verify post-deploy |
| Cart empty | Two honest CTAs | PASS |
| Checkout empty first paint | Looks like payment in progress | P2 |
| Auth | Tabs work (Bireysel / Kurumsal); `/giris` does not repeat Giriş Yap in header | PASS |
| Legal | Pages render with seller identity | PASS |
| Activation no token | After hydrate, resend form exists; first paint lies | P2 |
| Footer | No product links | P2 |

No evidence of a required account wall in front of first-card checkout in code. Keep it that way.

---

# 8. CRO / SALES AUDIT

**Visit → understand:** Homepage H1 and two paths (bireysel / kurumsal) are clear. Primary gold is `NFC Kartı Satın Al`. Secondary is text `Ekip paketini incele`. Do not add a third gold.

**Trust:** iyzico / no PAN stored is repeated (ticker, home, PDP, checkout). Slightly noisy but on-strategy. Ticker duplication is the fix, not deleting the claim.

**Select:** PDP package switcher Bireysel ₺799 / Premium ₺1.250. Hero owns fill `Sepete Ekle`; mid/end jumps stay text on `main` (faz4). Live PDP fetch showed multiple Sepete Ekle — confirm post-deploy that only the buy box is filled.

**Corporate:** Slider + table + Enterprise quote is a real pack picker. Business/10-pack is marked Öne çıkan and has the lowest person price among small packs — anchoring works. Campaign Mail on **live** breaks that story (P1). Network Mail as add-on is fine.

**CTA wording:** Locked strings must stay (`NFC Kartı Satın Al`, `Paketleri İncele`, `Teklif Al`, `Sepete Ekle`). Do not change to “Satın Al” / “Devam Et” for style.

**Drop-off likely order:** mobile nav → stale corporate merchandising → unpaid deploy → unproven checkout.

---

# 9. RESPONSIVE AUDIT

| Viewport | What we know |
| --- | --- |
| 1440 / 1280 | Public desktop usable; corporate table needs horizontal scroll (wrapped) — acceptable |
| 1024 | Hamburger breakpoint is 1180; tablet-landscape is already a drawer. Untested interactively in this pass |
| 834 / 768 | **Not fully tested** |
| 430 / 414 / 390 / 375 | 390: hamburger dead (P0). Homepage hero readable. No proven `overflow-x` on home. `/kurumsal` table is `min-width: 720px` inside `overflow-x: auto` — expected |

Safari macOS / iPhone: **not run**. PR #124 specifically targets WebKit containing-block behavior. Must retest on a real iPhone after deploy.

---

# 10. ACCESSIBILITY AUDIT

| Item | Status |
| --- | --- |
| Skip link | Present |
| Hamburger `aria-label` / `aria-expanded` | Markup exists; **behavior fails live** |
| Login tabs | Real links/buttons; 44px target (faz4/phase6) |
| Form labels on login / legal | Present |
| Heading hierarchy on NFC PDP | `PublicPageTitle` h1 in code; benefits use multiple `h2` — acceptable |
| Ticker duplication | P2 |
| Gold/cream small text | P3 |
| Keyboard trap / focus | **Not run** |
| Screen reader | **Not run** |

---

# 11. PERFORMANCE AUDIT

| Item | Status |
| --- | --- |
| Live homepage | Vercel HIT, prerendered, **no script nonce** |
| Checkout / activation / login / cart | Client islands on **HIT HTML with 0 nonce** — JS does not run |
| `/urunler` `/destek` | Dynamic MISS; nonce matches CSP |
| Ticker animation | 90s+ loop; `prefers-reduced-motion` disables |
| Layout shift | Not measured (no CLS lab) |
| CSP | Functional break on static documents (P0), not console noise |

---

# 12. DATA PERSISTENCE AUDIT

**Not run** for save → refresh → logout → login.

Known from current code and prior hardening (do not re-open as new P0 if still true):

- Cart is `localStorage` (guest). Other device = empty cart. Accepted.  
- Card draft no longer persists phone/email/image.  
- Session is HttpOnly cookies + memory supabase client.  
- Activation token in `sessionStorage` + stripped from URL.

---

# 13. SECURITY-MINDED QA FINDINGS

Performed as **normal use only**. No exploit payloads.

| Observation | Severity |
| --- | --- |
| `/p/invalid-id` → 404, not a profile leak | PASS |
| Lost/inactive public states exist in `app/p/[publicId]/page.tsx` | code PASS, live card not sampled |
| `/giris` disallowed in robots | PASS |
| `/checkout` first HTML does not include TCKN | PASS |
| Recover-by-UUID residual | P2 (see 010) |
| CSP is nonce + strict-dynamic; live HTML has no matching nonce, so Next chunks are blocked | P0 (see 015 / #127). Do not add `unsafe-inline` |
| `/api/auth/session` GET requires `x-yenomi-session: 1` (hardening) | prior PASS, not retested live |
| Public card “protection” is watermark, not security | documented; do not sell as DRM |

Authenticated-after-logout and IDOR were **not** retested (no session).

---

# 14. BUSINESS LOGIC FINDINGS

| Journey | Code | Live | E2E |
| --- | --- | --- | --- |
| J1 Individual purchase | Guest checkout route exists; server re-prices | UI reachable; pay **unproven** | skipped |
| J2 Existing individual | Account router corporate vs individual | untested | skipped |
| J3 Lost card | Public LOST state | untested | none |
| J4 Corporate purchase | Pack picker + RPC commerce | Campaign Mail still on live | skipped |
| J5 Employee invite | `/kurumsal/davet` | untested | none |
| J6 Offboarding / seats | SUSPENDED still consumes a seat (product decision, PR #118). Do not “fix” by decrementing seats | n/a | unit |
| J7 Renewal | `/yenile` | untested | none |
| J8 Public card | `/p` `/c` | invalid id 404 | none |

Do **not** introduce `CommercePipelineService` or reverse SUSPENDED seat policy.

---

# 15. DESIGN SYSTEM INCONSISTENCIES

Group, do not file 40 tickets:

1. **Button heights:** 44px header/ghost vs 48px some corporate fills vs `min-height: 52px` checkout pay. Intentional: page primary 48, chrome 44, pay 52. Do not flatten to one number without a token.  
2. **Card radius:** 18 vs 20 vs 28 appears across marketing cards. Pick the existing catalog 18 and corporate 18 as the public card radius; leave specimens alone.  
3. **Shadows:** layered warm shadows on `main` are the system. Do not add glow.  
4. **Secondary vs primary on catalog:** Premium and Yedek are `appearance="secondary"` — correct CRO, not an inconsistency.  
5. **Inter only.** No Playfair.

---

# 16. PRICING PAGE AUDIT (`/kurumsal`)

What works:

- Start/small packs in the table; 10-pack marked Öne çıkan; kişi başı falls as seats rise.  
- Header CTA `Paketleri İncele` (live).  
- Enterprise is quote, not a fake price.  
- Slider exists for 2–100.

What fails:

- Live Campaign Mail card (P1).  
- Network Mail vs Campaign Mail explanation is long; after Campaign Mail removal it should get shorter.  
- Table `min-width: 720px` is a horizontal scan on phones — acceptable if the slider remains the mobile decision UI. Verify slider is usable at 390 after hamburger works.  
- Lead form still lists Campaign Mail on live.

Business 10-pack is the designed default. Do not invent “market data.” Do not add annual-vs-monthly that the ledger does not sell.

---

# 17. MOCKUP / VISUAL ASSET AUDIT

| Item | Verdict |
| --- | --- |
| Phone + card specimens | CSS/HTML, not AI raster — PASS |
| Identity | Selin Kaya — PASS |
| QR in specimens | Decorative/product UI, not a live payable QR — acceptable if not scannable-as-real-account |
| Logo mark | Dark circular mark on warm header — PASS |
| Distortion | No raster phone frames found on public TSX (`how-phone-mockup` banned) |
| Live how-it-works phones | Old 4-up composition — deploy `main` |

Do not generate AI mockups to “improve premium.”

---

# 18. AUTOMATION RECOMMENDATIONS

**Do now (after #124 merge):**

1. Playwright: 390px click `Menüyü aç` → `#site-primary-nav` visible → link to `/urunler`.  
2. Faz4 lock already on hamburger backdrop / no `translateZ(0)` (on #124).  
3. Sitemap includes marketing routes; loc host === `NEXT_PUBLIC_SITE_URL`.  
4. `/kurumsal` HTML must not include a Campaign Mail sales card (already on `main`).  
5. `/nasil-calisir` must include `how-steps-board` (already on `main`).  

**Do when sandbox exists:** E2E-01, 02, 04.

**Keep skipped tests skipped** until then. Do not greenwash.

**Manual/hybrid:** iPhone Safari hamburger; catalog card baselines; corporate slider at 390; SSO in a clean browser.

---

# 19. REGRESSION TEST SUITE

Minimum after every public CSS/header change:

1. 390 / 768 / 1180 / 1440: header toggle, cart, primary CTA.  
2. `/`, `/urunler`, `/urunler/nfc-kart`, `/nasil-calisir`, `/kurumsal`, `/giris`, `/sepet`, `/checkout` empty.  
3. `npm run verify:faz4:product-ux` (or `node scripts/verify-faz4-product-ux.mjs`).  
4. `npm run verify:phase6:auth`.  
5. `npm run verify:ui-system`.  
6. `npm run lint`.  
7. Post-deploy: live hamburger tap on iPhone; confirm Campaign Mail card gone; confirm how-it-works board.

Payment chain: only with sandbox. Until then report **NOT RUN**.

---

# 20. TOP 20 FIXES — ORDERED BY BUSINESS IMPACT

1. **Merge PR #124 and deploy** — mobile nav.  
2. **Fill production secrets and dispatch Protected Production Deploy** — everything else is invisible until this.  
3. **Confirm live SHA === `main`** — Campaign Mail gone, how-it-works board live.  
4. **One canonical host** (`NEXT_PUBLIC_SITE_URL`) for sitemap, OG, vCard, QR print.  
5. **Sitemap completeness** — `/`, `/nasil-calisir`, `/kurumsal`, `/destek`.  
6. **Real iyzico sandbox E2E-01** — guest pay.  
7. **E2E-02 recover after closed tab.**  
8. **E2E-04 guest claim email bind.**  
9. **Empty checkout first paint** — no “ödeme hazırlanıyor” without a cart.  
10. **Activation first paint** — no “sipariş kontrol ediliyor” without a token.  
11. **Footer product links** (text, not gold).  
12. **Ticker `aria-hidden` on duplicate track.**  
13. **Catalog card 4-row grid** — code in #127; verify live after deploy.  
14. **Recover API ownership** (cookie or session).  
15. **iPhone Safari hamburger retest.**  
16. **390px corporate slider + table** after nav works.  
17. **Keyboard pass** on header drawer (Escape already on #124).  
18. **404 document title.**  
19. **Redirect `/nfc-siparis` → `/checkout`** when traffic allows.  
20. **Do not** dark-restyle, rename Faz4 CTAs, reverse SUSPENDED seats, or add `CommercePipelineService`.

---

## Out of scope / rejected recommendations

- Dark canvas, Playfair, extra gold glow.  
- Treating skipped Playwright as coverage.  
- Filing every radius delta as its own P3.

---

## Next engineering move

1. Land **#127** (CSP nonce on Next scripts, funnel document nonce lock, catalog 4-row grid).  
2. Human: fill production secrets and dispatch Protected Production Deploy.  
3. Post-deploy smoke: live HTML `nonce=` matches CSP; iPhone hamburger; Campaign Mail gone; how-it-works board; sitemap locs match `PRODUCTION_SITE_URL`.  
4. Do not add `unsafe-inline`, restyle the shell, or treat skipped iyzico E2E as coverage.
