# Yenomi ID — Project Decisions

> Phase 1 — product decisions, information architecture and data-model contract  
> Decision date: 15 August 2026  
> Source baseline: Yenomi ID Next.js/TypeScript codebase + UI/UX audit dated 14 August 2026.

## 1. Product identity

### 1.1 Brand

**Brand:** Yenomi ID

The current production-facing metadata and routes already identify the product as Yenomi ID. We will not introduce a second working brand during the refactor.

### 1.2 Product definition

Yenomi ID is a **hybrid physical + digital identity product**:

- Physical NFC card / QR-enabled card products.
- A managed digital identity/profile associated with the physical product.
- QR/public profile sharing.
- Activation and entitlement lifecycle.
- Individual customer account management.
- Corporate/team management with seats, roles, templates and subscriptions.

The visual language is **light application chrome + premium purple brand accents**. Dark surfaces are restricted to explicit artwork/preview contexts rather than being used as a competing application theme.

## 2. Target customers

### Individual

Primary:

- Professionals and freelancers.
- Founders, consultants and sales-oriented users.
- Users who want a reusable digital contact/profile identity.
- Customers buying one or a small number of NFC cards.

Secondary:

- Users who need a QR-only digital identity without frequent physical-card changes.

### Corporate

Primary:

- Small and medium-sized teams.
- Companies purchasing multiple identities/cards.
- Teams needing centralized templates, employee lifecycle, roles, seats and billing.
- Organizations that need basic usage analytics and centralized support.

## 3. Product catalog

Canonical product families for the first product architecture:

1. **NFC + QR physical cards**
   - Physical NFC card.
   - QR fallback/share mechanism.
   - Card/profile activation lifecycle.

2. **Digital identity / profile**
   - Public profile.
   - Contact details and professional information.
   - QR/public URL.
   - Profile editing and publishing.

3. **Corporate seat / license plans**
   - Starter / Growth / Business / Enterprise plan family already represented by `business_plans`.
   - Seat limits and billing cadence.
   - Enterprise is quote-led rather than a self-serve public checkout product.

4. **Activation / renewal entitlements**
   - Service windows, expiration and grace periods.
   - Renewal flows.
   - Entitlements remain a domain concern, not a UI concern.

The catalog must remain extensible for future physical accessories or digital services without coupling product pages to one product type.

## 4. Geography, currency and delivery

- **Primary market:** Türkiye.
- **Currency:** TRY / Turkish Lira.
- **Physical delivery:** Türkiye for the first release.
- **Digital delivery:** globally accessible where legally and commercially supported.
- **Address model:** Turkish address conventions are first-class; country/region fields remain extensible for future international delivery.

The current codebase already contains commerce, fulfillment and shipping-address migrations. This decision keeps the first release focused instead of introducing international tax/shipping complexity prematurely.

## 5. Payments

**Primary payment provider:** PayTR.

Payment integration must remain behind a provider abstraction so Stripe or another provider can be introduced without changing checkout/domain rules.

Rules:

- Never store raw card numbers in application tables.
- Store provider references/tokenized payment method metadata only when permitted by the provider.
- Payment status is server-authoritative.
- Order creation and payment callbacks are idempotent.
- Client-submitted price, stock and order totals are never trusted.

## 6. Checkout/account decision

The product is **account-first for digital ownership**, but checkout should not create an unnecessary pre-purchase wall.

Decision:

- Browsing and cart: no account required.
- Physical-product checkout: guest checkout may be used where the fulfillment flow supports it.
- Digital identity activation/management: verified account is required.
- If a guest completes a physical purchase, the post-purchase flow must make the account/claim step explicit and low-friction.
- Existing authenticated checkout and entitlement-claim mechanisms remain server-authoritative.
- **Current v25.8.80 runtime note:** the existing `/checkout` implementation still requires an authenticated Supabase session. Until a server-authorized guest checkout path is enabled, the PDP must disclose this requirement before purchase rather than implying guest checkout is currently available.

This preserves conversion while protecting the digital asset/account boundary.

## 7. Individual vs corporate roles

### Individual

A user account owns:

- Profile/digital identity.
- Orders and order history.
- Shipping/billing addresses.
- Payment-method references.
- Entitlements/activation state.
- Support tickets.
- Account/security settings.

### Corporate

Corporate membership is organization-scoped.

Canonical product roles:

- **Owner** — organization ownership, billing and highest-level administration.
- **Admin** — operational administration and team management.
- **Member** — normal team usage and assigned identity/card operations.
- **Viewer** — read-only access.

The existing database contains additional operational roles/history in the current enterprise implementation. Those must not be accidentally removed during UI refactors; the product-facing first-release role model remains Owner/Admin/Member/Viewer, while lower-level authorization may retain additional internal roles where required by existing business rules.

Authorization is enforced at:

1. UI visibility.
2. Server/API/domain layer.
3. PostgreSQL/Supabase RLS.

Client-side role checks are never the security boundary.

## 8. Information architecture

### Public

- `/` — Home
- `/urunler` — Product catalog
- `/urunler/nfc-kart` — NFC card product detail
- `/kurumsal` — Corporate sales / lead generation
- `/giris` — Authentication
- Legal: `/gizlilik`, `/iade-iptal`, `/mesafeli-satis-sozlesmesi`

### Commerce

- `/sepet` — Cart
- `/checkout` — Checkout
- `/odeme/basarili` — Payment success
- `/odeme/basarisiz` — Payment failure
- `/nfc-siparis` — Existing order/fulfillment surface

### Individual account

The canonical navigation label is **Hesabım**.

- `/hesabim` — Overview
- `/siparislerim` — Orders
- `/kartlarim` — Digital/physical card collection
- `/kartim` — Selected card / identity management
- `/olustur` — Identity/card creation wizard
- `/aktivasyon` — Activation
- `/ayarlar` — Account/security/settings
- `/istatistikler` — Individual analytics where applicable

Terminology decision: use **Kartlarım** for the collection/list and **Kartım** only for the selected card detail. Use **Dijital Kimlik** as the product concept, not as an inconsistent alternate navigation label.

### Corporate

- `/kurumsal/panel` — Corporate overview
- `/kurumsal/panel/organizasyon` — Organization
- `/kurumsal/panel/calisanlar` — Members/team
- `/kurumsal/panel/roller` — Roles
- `/kurumsal/panel/lisans` — Licenses/seats
- `/kurumsal/panel/kartlar` — Corporate cards
- `/kurumsal/panel/icerik` — Content/profile management
- `/kurumsal/panel/sablon` — Templates
- `/kurumsal/panel/istatistikler` — Analytics
- `/kurumsal/panel/ayarlar` — Organization settings
- `/kurumsal/davet` — Invitation acceptance

Corporate self-service registration is **not** assumed. The public corporate page is the lead/quote entry point. Auth must provide a real, clickable CTA to `/kurumsal` rather than dead-end explanatory copy.

## 9. Data model decision

The existing database already has a mature commerce/enterprise model. We will **not create duplicate generic tables** merely to match UI terminology.

Canonical mapping:

| Product/domain concept | Existing persistence |
|---|---|
| User profile/account | `user_accounts`, `card_profiles` |
| Products | `products` |
| Product variants | `product_variants` |
| Product images | Product/catalog image metadata where currently supported; add only if the existing catalog contract requires it |
| Cart | Existing commerce/cart implementation; inspect before adding a second cart model |
| Orders | `commerce_orders`, `commerce_order_items` |
| Payments | `commerce_payment_attempts`, `payment_attempts` |
| Invoices | Existing legal/commerce artifacts; introduce a dedicated invoice table only when invoice lifecycle is defined |
| Addresses | `shipping_addresses` |
| Discounts | Existing commerce pricing contract; extend only if discount-code persistence is required |
| Support | Product support domain to be added as a dedicated module/table when the support UI is implemented |
| Organizations | `organizations` |
| Organization members | `organization_members` |
| Invitations | `organization_invites` |
| Subscriptions | `organization_subscriptions` |
| Entitlements | `entitlements` |
| Audit | `admin_audit_log` plus organization/member lifecycle history |

The user's requested conceptual names (`profiles`, `orders`, `payments`, `invoices`, etc.) are treated as **domain vocabulary**, not instructions to duplicate existing persistence.

### Required domain boundaries

- Catalog: products, variants, pricing, availability.
- Commerce: cart, order, fulfillment, payment lifecycle.
- Identity: auth account, profile, digital identity.
- Entitlement: activation/service window/renewal.
- Organization: company, membership, role, seats, invitations, billing.
- Support: tickets and order-linked conversations.
- Audit: security and business mutations.

## 10. Design-system contract

`app/design-tokens.css` is the canonical token source for new UI work.

Token families:

- Semantic colors.
- Typography.
- Spacing.
- Radius.
- Shadows.
- Layout/container sizes.
- Control sizes.
- Motion.

Required breakpoints for new work:

- 480px
- 768px
- 1024px
- 1280px

No new global CSS file is permitted as a local fix.

Existing legacy CSS is treated as migration debt. It will be consolidated in a later phase rather than overridden with another layer.

## 11. Architecture contract

Preferred layering:

```text
app route
  -> feature UI
    -> feature hook / action
      -> domain service
        -> repository / Supabase
```

Rules:

- Business rules do not live inside presentational components.
- Server Components are the default.
- Client Components exist only for interaction/state that requires them.
- Zod validates external input.
- React Hook Form is the preferred client form orchestration layer for new complex forms.
- Payment providers are accessed through a provider interface.
- Server-side authorization is mandatory.
- RLS remains a second enforcement boundary.
- Money is integer minor units (kuruş) or equivalent server-side monetary representation; never use client-provided formatted strings as truth.

## 12. Design QA contract

Every phase must report:

- Affected screens.
- Typecheck/unit/e2e/visual test status where available.
- CSS line count.
- `!important` count.
- Added/changed tokens.
- Added/changed shared components.
- Demo/seed scenario.
- Remaining architectural risks.

Visual regressions are not automatically treated as failures: each difference must be classified as either an intentional design correction or an actual regression.

## 13. Delivery sequence

1. Project decisions, IA and data model — **this phase**
2. Design tokens and shared UI components
3. Public site: header, footer, home
4. Product listing/detail
5. Cart and checkout
6. Auth
7. Individual account
8. Corporate foundation
9. Accessibility/responsive/performance QA
10. Tests, seed data and release documentation

## 14. Explicit non-decisions

The following are intentionally deferred until the relevant feature phase:

- International shipping/tax matrix.
- Automated recurring PayTR billing.
- Self-service enterprise provisioning.
- Final support SLA/ticket taxonomy.
- Full invoice PDF generation contract.
- Additional physical product categories.

These are not blockers for the current architecture.

## Checkout / Account Boundary

- Fiziksel bireysel ürünlerde guest checkout desteklenir.
- Oturum açmış kullanıcıda sipariş `user_id` ile bağlanır ve checkout e-postası hesap e-postasıyla eşleşmelidir.
- Guest siparişte `user_id` null kalabilir; `guest_email` sipariş/aktivasyon claim sürecinin girdisidir.
- Kurumsal kapasite/seat-pack satın alımları guest checkout değildir; yetkili organization member authentication zorunludur.
- Checkout UI, hesap gereksinimini ödeme başlamadan önce açıkça anlatmalıdır.

## V44 — Premium Product Framework
- Premium hierarchy is governed by one dominant message + one primary CTA per major surface.
- Public typography uses Yenomi Inter Display for headings and Yenomi Inter for body/UI; semantic sizes are centralized in canonical.css.
- Spacing follows 4/8 rhythm: 4/8/12/16/24/32/48/64/96/128px, with responsive section tokens.
- Body copy is constrained to readable measure; secondary information is visually quieter.
- Commerce prices use the UI/display family with tabular numerals instead of monospace, avoiding the Enterprise price inconsistency.
- Public header is persistent/sticky; public footer remains part of the shared shell.
