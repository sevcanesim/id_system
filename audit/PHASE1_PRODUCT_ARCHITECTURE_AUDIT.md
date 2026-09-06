# YENOMI ID — PHASE 1 PRODUCT ARCHITECTURE AUDIT

**Baseline:** v25.8.40  
**Phase output:** v25.8.41  
**Scope:** Route inventory, user types, surface classification, component inventory, duplicate systems, design debt, UX severity, business-critical journeys.  
**Business logic changes:** None.

## Executive conclusion

Yenomi ID'nin ürün yüzeyleri işlevsel olarak mevcut: public, commerce, auth, individual dashboard, corporate dashboard ve public identity. Ana problem eksik ekran değil; aynı ürünün farklı dönemlerde büyümüş UI/CSS/component katmanlarının birlikte yaşaması.

Phase 1 kararı: **Yeni CSS yaması ekleme dönemi bitmeli.** Phase 2'den itibaren canonical foundation kurulmalı ve route'lar kontrollü component migration ile bu foundation'a geçirilmelidir.

## 1. Route inventory

28 `page.tsx` route tespit edildi. Tam makine-okunur envanter: `audit/PHASE1_ROUTE_INVENTORY.json`.

Domain dağılımı:
- Public / legal / marketing: homepage, products, corporate, legal pages.
- Commerce: product detail, cart, checkout, payment states, legacy NFC order.
- Auth / activation: login, activation, account gateway.
- Individual: home/cards, card, editor, analytics, orders, subscription, settings.
- Corporate: landing, invitation, panel.
- Public identity: `/p/:publicId`, `/c/:cardCode`, legacy `/:slug`.
- Internal: `/admin`.

### Route-level decisions

**Keep / canonical:** `/`, `/urunler/nfc-kart`, `/sepet`, `/checkout`, `/giris`, `/kartim`, `/olustur`, `/istatistikler`, `/siparislerim`, `/yenile`, `/ayarlar`, `/kurumsal`, `/kurumsal/panel`, `/kurumsal/davet`, `/p/:publicId`, `/c/:cardCode`.

**Gateway / clarify:** `/hesabim` is a role-aware entry point and should remain a gateway rather than a second settings experience.

**Naming debt:** `/kartlarim` acts as individual dashboard home while `/kartim` is the product-center screen. The distinction is valid technically but weak in navigation semantics. Phase 6 should decide whether dashboard home gets a neutral route (e.g. `/panel`) while preserving redirects.

**Legacy candidates — do not delete yet:** `/aktivasyon`, `/nfc-siparis`, `/:slug`. Removal requires traffic/usage and backward-compatibility evidence.

## 2. User type audit

The canonical corporate role set is:

`OWNER` → `ADMIN` → `HR` → `EMPLOYEE`.

Full matrix: `audit/PHASE1_USER_TYPE_MATRIX.md`.

## 3. Component architecture inventory

29 non-page TSX UI/component files were inventoried. Full file list and line counts: `audit/PHASE1_COMPONENT_INVENTORY.json`.

### High-risk oversized units

| File | Lines | Severity | Decision |
|---|---:|---|---|
| `app/kurumsal/panel/page.tsx` | 3095 | P0 | Split by route/domain after foundation |
| `EmployeesPanel.tsx` | 1049 | P0 | Split DataTable, toolbar, row/card, bulk actions |
| `EmployeeDrawer.tsx` | 925 | P0 | Split sections; keep drawer only for short contextual tasks or migrate detail to route |
| `CardWizard.tsx` | 800 | P1 | Split form sections + preview + save state |
| `AppHeader.tsx` | 257 | P1 | Separate identity/cart/role resolution from presentation |
| `UserPanelShell.tsx` | 77 | P1 | Migrate to canonical AppShell rather than add variants |

### Existing reusable assets worth preserving

- `AppHeader` already has keyboard Escape, focus cycling and mobile menu behavior.
- `UserPanelShell` already centralizes individual navigation and page header layout.
- Corporate panel already has domain components (`EmployeesPanel`, `RolesPanel`, `TemplatesPanel`, etc.), so route extraction can reuse them rather than rewrite business logic.

## 4. Design debt — measured

7 global CSS files total **5,320 lines**.

| Metric | Count |
|---|---:|
| `!important` | 2,899 |
| gradient declarations | 642 |
| `backdrop-filter` | 54 |
| hardcoded hex colors | 2,776 |
| classes defined in >1 global CSS file | 419 |
| inline `style={{...}}` occurrences | 54 |

Full metrics: `audit/PHASE1_DESIGN_DEBT_METRICS.json`.

### Severity

**P0 — CSS ownership collision**  
`global-app-header`, `order-page`, product, auth, builder, order and panel classes are defined across multiple global CSS files. Correctness depends heavily on import/cascade order.

**P0 — Corporate monolith**  
Corporate panel combines navigation, data orchestration, many domain states and multiple screens under a query-string tab system in one 3,095-line page.

**P1 — Parallel token families**  
`--yp-*`, `--yi-*`, `--brand-*`, `--store-*`, `--ui-*`, `--y-*` coexist. Compatibility aliases are acceptable temporarily; new code must stop introducing legacy prefixes.

**P1 — Legacy route ambiguity**  
There are current and legacy flows for public profile, activation/order and account/dashboard entry. They must be mapped before removal.

**P1 — Inline presentation logic**  
54 inline style objects remain, concentrated in `kartlarim`, `yenile`, corporate panel, analytics and settings. Some are dynamic chart values and valid; static ones should move to components/tokens.

**P2 — Visual decoration residue**  
642 gradients and 54 backdrop filters remain. Not all are defects because card artwork/product previews may intentionally use them. Phase 2/3 must distinguish product artwork from application chrome before deletion.

## 5. UX problems by severity

### P0
1. Purchase → account → activation → profile is spread across multiple routes with different shells; must be treated as one journey.
2. Corporate panel information architecture is tabs inside one giant route; scalability and deep-link clarity are limited.
3. Corporate employee lifecycle is business-critical and must be protected during UI refactor.
4. CSS cascade ownership can reintroduce dark/public styles into dashboard surfaces.

### P1
1. `/kartlarim` vs `/kartim` terminology creates avoidable cognitive load.
2. `/hesabim` must remain a routing gateway, not compete with `/ayarlar` as a settings page.
3. Public/product/checkout/auth share AppHeader but context actions vary enough to create navigation density during checkout.
4. CardWizard is visually normalized but still structurally a large legacy editor.
5. Corporate roles need human-readable capability descriptions, not enum-first UX.

### P2
1. Legacy legal and internal admin surfaces should inherit foundation but not drive early design priorities.
2. Decorative visual residue can be removed after ownership migration, not before.

## 6. Business-critical flows

Eight flows are documented in `audit/PHASE1_CRITICAL_JOURNEYS.md`. P0 flows:
- Individual Purchase
- Existing Individual
- Lost Card
- Corporate Provisioning
- Employee Onboarding
- Employee Offboarding

These become mandatory regression journeys for later phases.

## 7. Phase 2 foundation requirements

Phase 2 must create a canonical foundation before further route redesign:

1. One canonical token namespace for color, typography, spacing, radius, shadow, motion and z-index.
2. Compatibility aliases for legacy token families; no new legacy token usage.
3. Canonical primitives: Button, Input, Textarea, Select, Checkbox, Switch, Badge, Card, PageHeader, EmptyState, ErrorState, Skeleton, Modal, Drawer, Tabs, Toast, Container, Stack/Grid.
4. One AppShell contract for dashboard contexts; individual and corporate may have variants but not unrelated foundations.
5. One DataTable foundation before employee table refactor.
6. Explicit styling ownership: marketing / commerce / dashboard / public-card artwork.
7. No business logic rewrite during component migration.

## 8. Phase 2 exit criteria

- Canonical tokens documented and implemented.
- New primitives have default/hover/focus/active/disabled/loading/error semantics where relevant.
- WCAG-visible focus baseline exists.
- No new `--yp-*`, `--yi-*`, `--brand-*`, `--store-*`, `--y-*` values introduced outside compatibility aliases.
- Foundation can render a representative marketing card, checkout form control and dashboard card without route-specific CSS.
- Existing routes still compile and retain current behavior.

## 9. Decisions explicitly deferred

- Do not delete legacy `/:slug`, `/aktivasyon`, `/nfc-siparis` until usage/backward compatibility is verified.
- Do not split corporate routes until Phase 2 foundation exists.
- Do not remove global CSS selectors merely because they appear duplicated; migrate usage first, then delete at zero references.
- Do not redesign public card artwork as part of application chrome cleanup.

## Phase 1 status

**COMPLETE.** Product architecture and design-debt baseline is now measurable and versioned. Next phase is **Phase 2 — Design System Foundation**.
