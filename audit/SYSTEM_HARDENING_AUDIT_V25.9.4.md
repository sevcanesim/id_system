# Yenomi ID — System Hardening Audit

**Baseline:** v25.9.4 · Next.js App Router · Supabase · emekli ödeme sağlayıcısı
**Date:** 21 August 2026
**Surface:** Web / Safari / PWA. There is no Xcode, Keychain, Core Data or native iOS binary in this repository. Mobile findings map to Safari and the installed web app.

## Verification

| Check | Status | Note |
| --- | --- | --- |
| `verify:runtime-prerequisites` | PASS | Node 22 / npm 10 / lockfile aligned |
| `vitest run` | PASS | 106 tests |
| `tsc --noEmit` | PASS | After this change set |
| `next build` | PASS | 90 routes; CSS autoprefixer warnings only |
| HttpOnly session contract | PASS | Restore header + navigation reject |
| Phase 6 / 18 / 21 / 22 / Faz 3 / 4 / 13 | PASS | Static contracts |
| Secrets hygiene | PASS | `--allow-local-env` |
| Playwright E2E | NOT RUN | `tests/` reset; no e2e specs |
| `verify:db` / catalog | BLOCKED | No Supabase env in this environment |
| emekli ödeme sağlayıcısı sandbox / production env | BLOCKED | Provider secrets absent |
| Phase 11 employee verifier | FAIL | Pre-existing: stale `return null` / header / version needles. Not introduced here |

Never treat BLOCKED or NOT RUN as PASS.

---

## 1. Business logic loopholes

1. **Identity swap on retry.** Checkout fingerprint hashed name/phone/identityType but not the TCKN. Same idempotency key + different TCKN reused the payment attempt. KYC/AML hole. **Fixed:** `identityNumber` is now part of the fingerprint hash.
2. **Spare card sold to guests.** Catalog CTA looked live; checkout 403'd after payment intent. Conversion dead-end. Spare-card gate lives on PR #81; this branch does not change catalog copy.
3. **Guest extra-card in localStorage.** A crafted cart can still hold `YENOMI-NFC-EXTRA`. Checkout rejects it. Remaining risk: confusing error, not free fulfillment.
4. **Recover-by-UUID.** `/api/payments/paytr/recover` accepts a body order UUID when the pending-order cookie is absent. Anyone who learns an order id can probe settlement. Rate-limited. Do not remove email/deep-link recover; bind recover to cookie **or** authenticated ownership.
5. **Webhook has no provider signature.** Settlement still `retrieveCheckout`s the token against emekli ödeme sağlayıcısı, so a random token cannot mark paid. Token leak = settle oracle. Response no longer echoes `orderId`.
6. **Legacy `nfc_orders` callback path** still writes `payment_attempts.raw_result`. Dual state machines. Keep 410 on init; finish draining the retrieve path.
7. **`/hesabim` was a client-only gate.** Unauthenticated users saw a loading shell before login. **Fixed:** middleware session required.
8. **Seat-pack `user_id: null`.** Capacity add-on already requires auth. Guest extra-card uses `.eq("user_id", authenticatedUserId)` — null user never matches an entitlement. Server is correct; UI was the lie.

## 2. Persistence and logging gaps

1. **emekli ödeme sağlayıcısı `raw_result` stored buyer TCKN, email, GSM, BIN, last4.** Checkout copy said Yenomi does not keep identity. The ledger did. **Fixed:** whitelist settlement fields only.
2. **`console.error(..., error)` dumped SDK objects** on callback/webhook/recover/claim. **Fixed:** message-only on those paths. Remaining: organization member/analytics logs still print `code`/`message` (acceptable).
3. **Card draft in `localStorage`** stored phone, email, whatsapp, image. Shared Mac/iPad = PII. **Fixed:** draft keeps name/role/company/social structure; contact and image are dropped on read and write.
4. **Activation token in `sessionStorage` + URL.** URL is stripped after load (good vs referrer). Session tab still holds the secret. XSS reads it. Keep hashing at rest; do not persist the raw token longer than the claim POST.
5. **Remembered email in localStorage.** Non-secret preference. Demo `@yenomi.test` already purged. Keep.
6. **Cart is localStorage, not server.** Background kill + another device = empty cart. Guest checkout depends on this. Accept for guests; authenticated carts should eventually be server-side.
7. **Abandoned AWAITING_PAYMENT orders** are created before emekli ödeme sağlayıcısı init. Failed init deletes when `createdNewOrder`. Retry path can leave unpaid rows. Need a sweeper, not a UI spinner.
8. **Funnel `dataLayer` is a stub.** No GA4/PostHog. Conversion is unmeasured. `console.debug` is dev-only.

## 3. Load and timeouts

1. **Rate limiter falls back to in-memory Map** when Upstash is missing. Serverless instances do not share the map. Production env check already requires Upstash — treat missing Redis as a release blocker, not a silent degrade, if the threat model is paranoid.
2. **`x-forwarded-for` is the rate-limit IP.** Spoofable unless the edge strips it. Trust only the platform-provided client IP.
3. **`middlewareClientMaxBodySize: 21mb`.** Upload routes need it; every other API inherits it. Memory DoS on JSON POST. Cap JSON routes at ~100kb; keep 21mb only on `links/upload`.
4. **Checkout does several serial admin queries** (products, membership, subscription, entitlements, insert order/items/address/consents, reserve attempt, emekli ödeme sağlayıcısı). emekli ödeme sağlayıcısı timeout after order insert leaves AWAITING_PAYMENT + FAILED attempt — recover exists. Under burst, emekli ödeme sağlayıcısı is the bottleneck, not Next.
5. **Middleware calls GoTrue `/auth/v1/user` on every protected page** when the access cookie is present. That is a sync auth hop on `/kartim`, `/olustur`, corporate panel. Cache a short-lived “access valid until exp” in the JWT `exp` without a network call; refresh only when expired (already the refresh path).
6. **No Playwright journey** covers callback delay, double POST, or tab-close-during-3DS. Those are the production incidents.

## 4. Sales / premium friction

1. Theme contract is **warm light** (`#F9F8F6` / gold), not `#0B0B0B`–`#1A0F2E`. Forcing a dark luxury skin would fight `theme-policy.css` and Phase 11. Premium here is paper, type, and restraint — not OLED purple.
2. Typography is **local Inter / Inter Display**, not Playfair/Gilroy. Do not load a second display family on the purchase path.
3. Canonical CTAs **“NFC Kartı Satın Al”** and **“Sepete Ekle”** are locked by Faz 4 / Phase 5 verifiers. Changing them without updating those contracts fails release.
4. Guest checkout is the conversion asset. Spare card must not look like a first purchase. First-card PDP is frictionless; add-ons are account-bound. That is correct luxury: the cheap path is not the add-on path.
5. Checkout is a client island (~13 kB). Identity wipe on `pagehide` is right. Three steps (buyer / shipping / approval) is acceptable; do not add an account wall in front of physical checkout.
6. `/nfc-siparis` still exists beside `/checkout`. Two payment UIs. Kill or redirect the legacy page once traffic is zero.

## 5. Action plan (scenario → risk → change)

| Scenario | Risk | Change |
| --- | --- | --- |
| Attacker opens `/api/auth/session` in Safari | Access + refresh tokens render as JSON | **Done:** GET requires `x-yenomi-session: 1` and rejects `document`/`navigate` |
| emekli ödeme sağlayıcısı retrieve payload archived | TCKN/BIN in DB backups | **Done:** whitelist `sanitizeProviderPayload` |
| Retry checkout with another TCKN | Fingerprint collision | **Done:** identity in fingerprint |
| Bookmark `/hesabim` while logged out | Private router flash | **Done:** middleware protect |
| iOS app switcher on checkout | Snapshot of TCKN | **Done:** blur when `visibilityState !== visible` — does **not** stop the Screenshot button |
| Shared iPad card editor | Phone/email in localStorage | **Done:** sanitize draft |
| Webhook JSON includes order UUID | Order enumeration | **Done:** `{ ok, paid, pending, failed }` only |
| `window.alert` on public copy | Anti-premium, fake DRM | **Done:** watermark remains; alert removed |
| Redis down in production | Per-instance rate limit | Fail closed on checkout/auth if Upstash missing |
| JSON POST 21 MB | Memory exhaustion | Per-route body cap |
| Recover UUID without cookie | Settlement probe | Require cookie or auth |
| No E2E | Silent payment regressions | Rebuild Playwright journeys below |

---

## Security (attacker view)

### Memory, cache, logs

- Native Xcode console / jailbreak Keychain: **N/A**. This is a website.
- Access + refresh tokens live in **JS heap** (supabase-js memory storage) and **HttpOnly cookies**. XSS still owns the heap. CSP has `'unsafe-inline' 'unsafe-eval'` — XSS is the real token theft path. Tighten CSP next; do not pretend pinning exists in Safari.
- bfcache / iOS snapshot: checkout, ödeme, aktivasyon and `/nfc-siparis` set `html[data-sensitive-obscured]` when hidden (AuthSessionBridge). Screenshot while focused still captures the DOM. Web cannot set `FLAG_SECURE`.
- Production source maps are off (`productionBrowserSourceMaps: false`).

### Screenshots and recording

- Public profile “protection” is watermark + contextmenu/copy block. DevTools, reader mode, and screenshots bypass it. Keep watermark as **attribution**, not security.
- Checkout/ödeme/aktivasyon: blur-on-hide. Screen Recording in iOS Control Center is not stoppable from the web.

### Transport

- HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, emekli ödeme sağlayıcısı frame allowlist: present.
- **SSL pinning is not available in Safari for web apps.** MitM with a trusted profile CA still works on a supervised device. Compensate with HSTS + tight `connect-src` (already scoped to Supabase + Google Maps).
- emekli ödeme sağlayıcısı retrieve is server-side with apiKey/secret. Browser never sees the secret. Good.

### Local storage (web equivalent of UserDefaults)

| Store | Content | Jailbreak / disk |
| --- | --- | --- |
| HttpOnly cookies | access + refresh | Readable on jailbroken device / desktop profile; HttpOnly stops XSS document.cookie |
| Memory supabase storage | session | XSS / heap dump |
| localStorage cart | SKUs, prices (server re-prices) | Fine |
| localStorage card draft | name/role/company after sanitize | Contact/image no longer persisted |
| sessionStorage activation token | raw claim secret | XSS; tab scoped |
| IndexedDB / SQLite / Core Data | unused | — |

### Remaining mitigations (not in this PR)

1. Remove `'unsafe-eval'` from CSP; nonce scripts.
2. Fail closed on rate-limit Redis outage for `/api/commerce/checkout` and `/giris`.
3. Per-route JSON body limit.
4. Recover authorization (cookie or user).
5. Server-side authenticated cart.
6. Expire activation `sessionStorage` on `pagehide`.
7. Do not put TCKN in DOM longer than the emekli ödeme sağlayıcısı POST; already wiped on pagehide.

---

## UX / visual

1. Product theme is warm light. `#0B0B0B` luxury is a different product. Do not overlay it.
2. Inter Display on headlines + Inter on UI is the system. Playfair would split the brand.
3. `.products-plan-card a { margin-top: auto }` still treats every descendant link as a flex footer. Do not put inline `<a>` inside plan cards.
4. Autoprefixer warns on `end` vs `flex-end` in canonical.css — visual, not blocker.
5. Contrast is locked to the light token set; Phase 13 passes statically. Do not invent dark-gold CTAs on warm paper.
6. Spare-card “İlk kartım yok” is a CRO bug; fix is on PR #81.

**Do this, not that**

- Do not replace “Sepete Ekle” on first-card PDP. It is the verb. Replace it only on **gated** add-ons (disabled + “Giriş gerekli”).
- Do not add a second gold button under a disabled gold button except “Hesabına gir”.
- Do not use `window.alert` on public profiles.
- Do not ship a dark hero “to look more Apple”. Apple’s commerce sites are light.

---

## Copy (locked CTAs stay; recommendations only)

Canonical purchase strings are release-gated. Changing them here would fail Faz 4.

| Eski | Yeni (öneri; verifier güncellenmeden uygulamayın) |
| --- | --- |
| NFC Kartı Satın Al | Kartını al |
| Sepete Ekle (first card) | Kartı sepete al |
| Sepete Ekle (yedek, misafir) | Giriş gerekli — **bu PR’de disable + hint** |
| İlk kartım yok | Sil. Bireysel kart zaten yanda. |
| Hesabımı Oluştur ve Bağla | Hesabını aç, kartını bağla |
| emekli ödeme sağlayıcısı ile güvenle öde | emekli ödeme sağlayıcısı ile öde. Kartın Yenomi’de durmaz. |
| Kart numarası Yenomi’de saklanmaz | Kartın emekli ödeme sağlayıcısı’da işlenir. Kimlik numarası ödeme için kullanılır, Yenomi defterine yazılmaz. |
| Hesap açmadan ödeyebilirsin | Kartı şimdi al. Hesabı teslimattan sonra bağlarsın. |

Trust line that is already honest after this PR: identity is not stored in `raw_result`. Keep saying it.

---

## QA plan

Classify: **A** = automate (Playwright) · **M** = manual device · **S** = static/unit already present.

### E2E critical

| ID | Amaç | Ön koşul | Adımlar | Beklenen | Fail |
| --- | --- | --- | --- | --- | --- |
| E2E-01 | Misafir fiziksel satın alma | emekli ödeme sağlayıcısı sandbox | PDP → sepet → checkout → 3DS success | `/odeme/basarili`, activation email, unpaid≠fulfilled | Client “success” without PAID row |
| E2E-02 | Callback gecikmesi | Paid at emekli ödeme sağlayıcısı, no browser POST | Close tab, recover | Order PAID via recover; no second charge | Stuck AWAITING_PAYMENT |
| E2E-03 | Çift callback | Same token twice | Replay POST | Second is ALREADY_PAID; one entitlement | Duplicate entitlement |
| E2E-04 | Guest claim | Paid guest order | `/aktivasyon?token=` → signup | Email match binds; wrong email 403 | Cross-account claim |
| E2E-05 | Auth purchase auto-claim | Logged-in individual | Checkout success | No activation email; `/olustur` ready | Guest token issued to auth user |
| E2E-06 | Yedek kart misafir | Logged out `/urunler` | Inspect Yedek Kart | Sepete Ekle disabled; Giriş gerekli | Add to cart succeeds |
| E2E-07 | Yedek kart + aktif hak | Logged-in ACTIVE entitlement | Sepete Ekle | Cart + checkout 200 | 403 |
| E2E-08 | İnternet kopması checkout | Mid-submit | Offline | Error copy, no double order | Duplicate AWAITING_PAYMENT |
| E2E-09 | Arka plan / arama | iPhone Safari checkout | App switcher | Blurred snapshot; TCKN wiped on return if pagehide fired | TCKN still in input after hide (wipe is pagehide) |
| E2E-10 | Token düşmesi | Expire access cookie | Open `/kartim` | Refresh cookie rotates or `/giris` | 500 / blank |
| E2E-11 | Kurumsal davet | Pending invite | Login business → accept | Member ACTIVE | Replay used token |
| E2E-12 | Kayıp modu | Assigned physical card | Toggle lost | Public NFC/QR shows lost state | Profile still public |

### Edge / crash / App Store-adjacent (web)

| ID | Amaç | Fail |
| --- | --- | --- |
| EDGE-01 | GET `/api/auth/session` in address bar | JSON contains accessToken — **now 401** |
| EDGE-02 | Fingerprint TCKN change | Same attempt reused — **now conflict** |
| EDGE-03 | Provider payload in DB | TCKN in `raw_result` — **now whitelist** |
| EDGE-04 | Invalid TCKN | Checkout 400 |
| EDGE-05 | emekli ödeme sağlayıcısı timeout after order insert | Recoverable; no silent success |
| EDGE-06 | XSS copy on public profile | Alert — **removed**; watermark only |
| EDGE-07 | 21mb JSON to checkout | Should 413 after route cap (remaining) |
| EDGE-08 | Demo user on production | `verify:production:no-demo-users` |

### UI / data loss

| ID | Amaç | Fail |
| --- | --- | --- |
| UX-01 | Card draft after kill | Phone/email restored from disk — **must stay empty** |
| UX-02 | Cart after login | Guest lines claimed to user id |
| UX-03 | Plan card grid 320–1280 | No overlapping gold CTAs |
| UX-04 | Reduced motion | No large motion on checkout |

Rebuild Playwright under `tests/e2e/` against the demo matrix. Do not invent parallel `@yenomi.test` users.
