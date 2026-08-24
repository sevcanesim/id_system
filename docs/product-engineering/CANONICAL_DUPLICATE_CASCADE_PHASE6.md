# Canonical Duplicate & Cascade Dependency Analysis — Phase 6

> **Phase 6 Audit Baseline**:
> - **mixedBlocks**: 1868
> - **mixedBytes**: 289976 B
> - **uniqueClasses**: 914
> - **duplicatedClasses**: 690
> - **duplicateOccurrencesTotal**: 3885

---

## 1. Executive Summary & Category Distribution

Every duplicated CSS class in `canonical-mixed.csspart` was analyzed against selector specificity, media/container scopes, domain ownership rules, declaration property values, and repository TS/TSX usage.

Each duplicate has been classified into **exactly one** of the 8 canonical categories:

| Category | Count | Description |
| :--- | :--- | :--- |
| **IDENTICAL_DUPLICATE** | 5 | Exact matching declarations across blocks in identical scope & specificity. Extremely safe to merge. |
| **LEGACY_PATCH_CHAIN** | 31 | Chronological override sequence where later blocks shadow earlier property declarations in same scope. |
| **PARTIAL_OVERRIDE** | 12 | Same scope & specificity, but later blocks add non-overlapping properties or partially override. |
| **RESPONSIVE_VARIANT** | 140 | Duplicate occurrences differ across `@media`, `@supports`, or `@container` breakpoint scopes. |
| **STATE_VARIANT** | 71 | Occurrences involve state pseudo-classes (`:hover`, `:focus`) or theme modifier classes (`.theme-dark`). |
| **SPECIFICITY_LAYER** | 167 | Occurrences target the class with different CSS specificities (e.g. `.foo` vs `.parent .foo`). |
| **CROSS_DOMAIN_COLLISION** | 264 | Class is used across multiple conflicting product/corporate/commerce domain components. |
| **UNKNOWN_REVIEW** | 0 | Edge cases requiring manual architectural review before consolidation. |

---

## 2. Top 30 Highest-Occurrence Duplicated Classes

| Class Name | Total Occurrences | Category | Source Span | Cleanup Score | Canonical Block IDs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `p10-corporate-platform` | 183 | `CROSS_DOMAIN_COLLISION` | 2238 | 0 | `001402, 001403, 001404, 001405, 001406...` |
| `yi-icon` | 76 | `RESPONSIVE_VARIANT` | 4406 | 10 | `000034, 000035, 000088, 000099, 000142...` |
| `public-site-chrome` | 56 | `CROSS_DOMAIN_COLLISION` | 1966 | 0 | `002411, 002412, 002413, 002414, 002818...` |
| `v26-reference-kpis` | 39 | `CROSS_DOMAIN_COLLISION` | 2552 | 0 | `000835, 000837, 000951, 001297, 001298...` |
| `v26-reference-activity` | 39 | `CROSS_DOMAIN_COLLISION` | 2001 | 10 | `001311, 001313, 001314, 001315, 001326...` |
| `how-step-visual` | 36 | `CROSS_DOMAIN_COLLISION` | 2589 | 0 | `001527, 001544, 001545, 001546, 002402...` |
| `yi-product-ui--compact` | 36 | `SPECIFICITY_LAYER` | 1715 | 50 | `002384, 002385, 002386, 002387, 002388...` |
| `corporate-sales-page` | 32 | `CROSS_DOMAIN_COLLISION` | 4207 | 0 | `000071, 000164, 000761, 002523, 003893...` |
| `v25-kpi-grid` | 32 | `CROSS_DOMAIN_COLLISION` | 2571 | 0 | `000816, 000817, 000950, 000951, 001361...` |
| `v26-reference-bottom` | 31 | `CROSS_DOMAIN_COLLISION` | 2542 | 0 | `000845, 000951, 001311, 001313, 001315...` |
| `active` | 29 | `RESPONSIVE_VARIANT` | 4137 | 10 | `000294, 000367, 000369, 000458, 000715...` |
| `yi-product-ui--profile` | 29 | `RESPONSIVE_VARIANT` | 3844 | 10 | `000279, 002348, 002384, 002385, 002386...` |
| `business-kpis` | 29 | `CROSS_DOMAIN_COLLISION` | 2571 | 0 | `000816, 000817, 000950, 000951, 001435...` |
| `how-it-works-page` | 28 | `CROSS_DOMAIN_COLLISION` | 2668 | 0 | `001448, 001523, 001524, 001527, 001530...` |
| `v26-hero-capabilities` | 25 | `CROSS_DOMAIN_COLLISION` | 2553 | 0 | `000834, 000836, 000951, 001279, 001280...` |
| `v26-reference-chart` | 24 | `CROSS_DOMAIN_COLLISION` | 2001 | 0 | `001311, 001312, 001313, 001314, 001315...` |
| `yi-profile-body` | 22 | `SPECIFICITY_LAYER` | 1753 | 50 | `002352, 002353, 002354, 002387, 002388...` |
| `ds-button` | 21 | `RESPONSIVE_VARIANT` | 3527 | 10 | `000858, 000862, 001242, 001840, 002547...` |
| `v26-overview-copy` | 21 | `RESPONSIVE_VARIANT` | 2358 | 10 | `000833, 001254, 001255, 001256, 001257...` |
| `corporate-lead-form` | 21 | `CROSS_DOMAIN_COLLISION` | 134 | 0 | `004144, 004145, 004146, 004147, 004148...` |
| `v25-panel` | 20 | `CROSS_DOMAIN_COLLISION` | 2794 | 10 | `000465, 000466, 001371, 001372, 001373...` |
| `section-kicker` | 19 | `RESPONSIVE_VARIANT` | 4172 | 10 | `000072, 000073, 000151, 000761, 001451...` |
| `yi-btn` | 19 | `RESPONSIVE_VARIANT` | 3058 | 10 | `000997, 000998, 001004, 001042, 001044...` |
| `v25-recent` | 19 | `RESPONSIVE_VARIANT` | 1763 | 10 | `001375, 001376, 001378, 001379, 001380...` |
| `enterprise-nav-entry` | 18 | `CROSS_DOMAIN_COLLISION` | 2776 | 0 | `000792, 000794, 000795, 003026, 003028...` |
| `v25-card-strip` | 18 | `RESPONSIVE_VARIANT` | 2436 | 10 | `000826, 001390, 001391, 001392, 001393...` |
| `corporate-cta` | 17 | `CROSS_DOMAIN_COLLISION` | 4196 | 0 | `000082, 000083, 000085, 002526, 003720...` |
| `yi-product-ui--card` | 17 | `SPECIFICITY_LAYER` | 4056 | 50 | `000277, 002358, 002359, 002392, 002393...` |
| `ds-input` | 17 | `STATE_VARIANT` | 3373 | 50 | `000901, 000903, 000905, 000906, 003589...` |
| `ds-textarea` | 17 | `STATE_VARIANT` | 3373 | 50 | `000901, 000903, 000904, 000905, 000906...` |

---

## 3. Top 30 Largest Source-Order Spans

| Class Name | Source Span | Occurrences | Category | First Order | Last Order | Canonical Block IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `yi-icon` | 4406 | 76 | `RESPONSIVE_VARIANT` | 33 | 4439 | `000034, 000035, 000088, 000099, 000142...` |
| `corporate-sales-page` | 4207 | 32 | `CROSS_DOMAIN_COLLISION` | 70 | 4277 | `000071, 000164, 000761, 002523, 003893...` |
| `corporate-lead-section` | 4207 | 5 | `CROSS_DOMAIN_COLLISION` | 70 | 4277 | `000071, 000761, 000763, 002925, 004278` |
| `corporate-hero-actions` | 4197 | 8 | `CROSS_DOMAIN_COLLISION` | 80 | 4277 | `000081, 004043, 004055, 004066, 004228...` |
| `corporate-cta` | 4196 | 17 | `CROSS_DOMAIN_COLLISION` | 81 | 4277 | `000082, 000083, 000085, 002526, 003720...` |
| `corporate-secondary-cta` | 4196 | 11 | `CROSS_DOMAIN_COLLISION` | 81 | 4277 | `000082, 000084, 000085, 002526, 003979...` |
| `section-kicker` | 4172 | 19 | `RESPONSIVE_VARIANT` | 71 | 4243 | `000072, 000073, 000151, 000761, 001451...` |
| `p6-auth-portal-tabs` | 4148 | 5 | `RESPONSIVE_VARIANT` | 293 | 4441 | `000294, 003958, 004221, 004431, 004442` |
| `active` | 4137 | 29 | `RESPONSIVE_VARIANT` | 293 | 4430 | `000294, 000367, 000369, 000458, 000715...` |
| `yi-product-ui--card` | 4056 | 17 | `SPECIFICITY_LAYER` | 276 | 4332 | `000277, 002358, 002359, 002392, 002393...` |
| `compact-card` | 3930 | 2 | `LEGACY_PATCH_CHAIN` | 464 | 4394 | `000465, 004395` |
| `p4-kicker` | 3915 | 4 | `CROSS_DOMAIN_COLLISION` | 71 | 3986 | `000072, 000073, 002525, 003987` |
| `products-public-v2-kicker` | 3915 | 4 | `CROSS_DOMAIN_COLLISION` | 71 | 3986 | `000072, 000073, 002525, 003987` |
| `p6-auth-message` | 3905 | 4 | `LEGACY_PATCH_CHAIN` | 319 | 4224 | `000320, 000321, 000322, 004225` |
| `error` | 3903 | 3 | `LEGACY_PATCH_CHAIN` | 321 | 4224 | `000322, 000474, 004225` |
| `p4-announcement` | 3886 | 4 | `CROSS_DOMAIN_COLLISION` | 38 | 3924 | `000039, 001530, 002412, 003925` |
| `secondary` | 3875 | 11 | `STATE_VARIANT` | 83 | 3958 | `000084, 000184, 000597, 000598, 001893...` |
| `public-reference-page` | 3875 | 4 | `CROSS_DOMAIN_COLLISION` | 70 | 3945 | `000071, 000147, 000761, 003946` |
| `primary` | 3859 | 8 | `STATE_VARIANT` | 82 | 3941 | `000083, 000520, 000521, 001263, 001264...` |
| `yi-product-ui--profile` | 3844 | 29 | `RESPONSIVE_VARIANT` | 278 | 4122 | `000279, 002348, 002384, 002385, 002386...` |
| `reference-hero-art` | 3795 | 5 | `CROSS_DOMAIN_COLLISION` | 151 | 3946 | `000152, 000153, 000154, 000761, 003947` |
| `checkout-progress` | 3581 | 6 | `CROSS_DOMAIN_COLLISION` | 366 | 3947 | `000367, 000369, 000437, 000761, 003939...` |
| `cart-page` | 3576 | 3 | `CROSS_DOMAIN_COLLISION` | 333 | 3909 | `000334, 003690, 003910` |
| `public-page-title` | 3563 | 14 | `CROSS_DOMAIN_COLLISION` | 545 | 4108 | `000546, 000547, 000548, 000549, 000554...` |
| `order-page` | 3540 | 2 | `CROSS_DOMAIN_COLLISION` | 333 | 3873 | `000334, 003874` |
| `p9-metric` | 3531 | 8 | `CROSS_DOMAIN_COLLISION` | 475 | 4006 | `000476, 000477, 000478, 003182, 003217...` |
| `ds-button` | 3527 | 21 | `RESPONSIVE_VARIANT` | 857 | 4384 | `000858, 000862, 001242, 001840, 002547...` |
| `premium-order-shell` | 3525 | 6 | `CROSS_DOMAIN_COLLISION` | 422 | 3947 | `000423, 003937, 003938, 003940, 003945...` |
| `p6-auth-mini-phone` | 3519 | 3 | `LEGACY_PATCH_CHAIN` | 278 | 3797 | `000279, 003797, 003798` |
| `product-trust-grid` | 3517 | 5 | `CROSS_DOMAIN_COLLISION` | 430 | 3947 | `000431, 000432, 003940, 003945, 003948` |

---

## 4. Top 30 IDENTICAL_DUPLICATE Candidates

The following classes possess 100% identical CSS declarations across their occurrence blocks in matching media scopes. Merging these saves redundant CSS bytes without any visual risk.


### 1. `home-premium__final` (Score: 100)

- **Block IDs**: `002812, 002925`
- **Exact Selector**: `.home-premium__final h2`
- **Scope**: `@media (max-width: 760px)`
- **Declaration Hash**: `fc68397d50c1236b`
- **Equivalence Proof**: `Identical declaration set across 2 blocks: {"font-size":"clamp(38px, 11vw, 52px)"}`
- **Specificity**: `[0, 1, 1]`
- **Repository Usage**: `EXACT_MATCH` (1 locations)
- **Safety Rationale**: Identical declarations, same scope (@media (max-width: 760px)), same specificity, single domain 'public'. Merging saves 1 redundant blocks safely.


### 2. `home-premium__journey-steps` (Score: 100)

- **Block IDs**: `002812, 002925`
- **Exact Selector**: `.home-premium__journey-steps`
- **Scope**: `@media (max-width: 760px)`
- **Declaration Hash**: `5f12e1968cb9594a`
- **Equivalence Proof**: `Identical declaration set across 2 blocks: {"grid-template-columns":"1fr"}`
- **Specificity**: `[0, 1, 0]`
- **Repository Usage**: `APPEARS_UNUSED` (0 locations)
- **Safety Rationale**: Identical declarations, same scope (@media (max-width: 760px)), same specificity, single domain 'public'. Merging saves 1 redundant blocks safely.


### 3. `home-premium__journey-action` (Score: 100)

- **Block IDs**: `002812, 002925`
- **Exact Selector**: `.home-premium__journey-action`
- **Scope**: `@media (max-width: 760px)`
- **Declaration Hash**: `42fa5261698757d3`
- **Equivalence Proof**: `Identical declaration set across 2 blocks: {"align-items":"flex-start","flex-direction":"column"}`
- **Specificity**: `[0, 1, 0]`
- **Repository Usage**: `APPEARS_UNUSED` (0 locations)
- **Safety Rationale**: Identical declarations, same scope (@media (max-width: 760px)), same specificity, single domain 'public'. Merging saves 1 redundant blocks safely.


### 4. `p6-auth-kicker` (Score: 100)

- **Block IDs**: `003874, 003987`
- **Exact Selector**: `.p6-auth-kicker`
- **Scope**: `base`
- **Declaration Hash**: `28299f2c8a335285`
- **Equivalence Proof**: `Identical declaration set across 2 blocks: {"color":"#8b6835","font-size":"12px","font-weight":"650","letter-spacing":".12em"}`
- **Specificity**: `[0, 1, 0]`
- **Repository Usage**: `EXACT_MATCH` (1 locations)
- **Safety Rationale**: Identical declarations, same scope (base), same specificity, single domain 'account'. Merging saves 1 redundant blocks safely.


### 5. `corporate-outcomes` (Score: 95)

- **Block IDs**: `000761, 000763`
- **Exact Selector**: `.corporate-outcomes`
- **Scope**: `@media (max-width: 760px)`
- **Declaration Hash**: `5f12e1968cb9594a`
- **Equivalence Proof**: `Identical declaration set across 2 blocks: {"grid-template-columns":"1fr"}`
- **Specificity**: `[0, 1, 0]`
- **Repository Usage**: `DYNAMIC_UNCERTAIN` (8 locations)
- **Safety Rationale**: Identical declarations, same scope (@media (max-width: 760px)), same specificity, single domain 'corporate'. Merging saves 1 redundant blocks safely.


---

## 5. Top 30 LEGACY_PATCH_CHAIN Candidates

These classes have evolved across chronological blocks, where later blocks override or shadow earlier property definitions.


### 1. `p6-auth-message` (Occurrences: 4)

- **Chronological Block Order**: `000320 -> 000321 -> 000322 -> 004225`
- **Final Winning Declarations**: `{"background":"#fdf4f4","border":"1px solid #c98989","color":"#7a2424"}`
- **Fully Shadowed Properties**: `background, border, color`
- **Still Contributing Properties**: `None`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 2. `error` (Occurrences: 3)

- **Chronological Block Order**: `000322 -> 000474 -> 004225`
- **Final Winning Declarations**: `{"background":"#fdf4f4","border":"1px solid #c98989","color":"#7a2424","border-color":"rgba(239,119,119,.35)"}`
- **Fully Shadowed Properties**: `background, border, color`
- **Still Contributing Properties**: `border-color`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 3. `p6-auth-mini-phone` (Occurrences: 3)

- **Chronological Block Order**: `000279 -> 003797 -> 003798`
- **Final Winning Declarations**: `{"border-radius":"22px","border-width":"5px","min-height":"58px","display":"none","flex-basis":"46%"}`
- **Fully Shadowed Properties**: `min-height`
- **Still Contributing Properties**: `border-radius, border-width, display, flex-basis`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 4. `ds-dark-surface` (Occurrences: 3)

- **Chronological Block Order**: `001412 -> 003057 -> 003128`
- **Final Winning Declarations**: `{"background":"var(--background)","color":"var(--text-primary)","min-height":"calc(100svh - 82px)","padding":"0 34px 60px"}`
- **Fully Shadowed Properties**: `background, color`
- **Still Contributing Properties**: `min-height, padding`
- **Specificity**: `[0, 3, 0]`
- **Media Scope**: `base`


### 5. `yi-brand-marquee` (Occurrences: 3)

- **Chronological Block Order**: `003400 -> 004036 -> 004062`
- **Final Winning Declarations**: `{"background":"#1A1918","border-bottom":"1px solid rgba(255,255,255,.06)","color":"#F6F1E5","min-height":"36px","overflow":"hidden","-webkit-mask-image":"linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent)","mask-image":"linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent)","max-width":"100%"}`
- **Fully Shadowed Properties**: `min-height, overflow`
- **Still Contributing Properties**: `background, border-bottom, color, -webkit-mask-image, mask-image, max-width`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 6. `yi-product-ui--dashboard` (Occurrences: 3)

- **Chronological Block Order**: `002366 -> 002911 -> 002921`
- **Final Winning Declarations**: `{"background":"#211d19","border-radius":"18px","box-shadow":"0 24px 45px rgba(20,15,12,.22)","color":"#f3eee4","min-height":"0","padding":"18px","contain":"layout","aspect-ratio":"1.55 / 1"}`
- **Fully Shadowed Properties**: `min-height`
- **Still Contributing Properties**: `background, border-radius, box-shadow, color, padding, contain, aspect-ratio`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 7. `v25-complete-state` (Occurrences: 3)

- **Chronological Block Order**: `002041 -> 002042 -> 002046`
- **Final Winning Declarations**: `{"background":"var(--surface)","border":"1px solid var(--border)","border-radius":"12px","padding":"12px 14px","display":"grid","gap":"10px","align-items":"center","grid-template-columns":"auto minmax(0, 1fr)"}`
- **Fully Shadowed Properties**: `gap`
- **Still Contributing Properties**: `background, border, border-radius, padding, display, align-items, grid-template-columns`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 8. `v25-inline-warning` (Occurrences: 3)

- **Chronological Block Order**: `002041 -> 002042 -> 002045`
- **Final Winning Declarations**: `{"background":"var(--gold-dim)","border":"1px solid var(--border)","border-radius":"12px","padding":"12px 14px","display":"grid","gap":"10px","align-items":"start","border-color":"var(--border-gold)","grid-template-columns":"auto minmax(0, 1fr)"}`
- **Fully Shadowed Properties**: `background, gap`
- **Still Contributing Properties**: `border, border-radius, padding, display, align-items, border-color, grid-template-columns`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 9. `compact-card` (Occurrences: 2)

- **Chronological Block Order**: `000465 -> 004395`
- **Final Winning Declarations**: `{"background":"var(--surface)","border":"1px solid var(--border)","border-radius":"20px","box-shadow":"0 16px 40px rgba(0, 0, 0, 0.12)","display":"flex","flex-direction":"column","overflow":"hidden","position":"relative"}`
- **Fully Shadowed Properties**: `background, border, border-radius, box-shadow`
- **Still Contributing Properties**: `display, flex-direction, overflow, position`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 10. `public-page-title--catalog` (Occurrences: 2)

- **Chronological Block Order**: `000558 -> 003436`
- **Final Winning Declarations**: `{"min-height":"0","padding":"16px 24px 10px"}`
- **Fully Shadowed Properties**: `min-height`
- **Still Contributing Properties**: `padding`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 11. `text-caption` (Occurrences: 2)

- **Chronological Block Order**: `000027 -> 002711`
- **Final Winning Declarations**: `{"font-size":"12px"}`
- **Fully Shadowed Properties**: `font-size`
- **Still Contributing Properties**: `None`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 12. `caption` (Occurrences: 2)

- **Chronological Block Order**: `000027 -> 002711`
- **Final Winning Declarations**: `{"font-size":"12px"}`
- **Fully Shadowed Properties**: `font-size`
- **Still Contributing Properties**: `None`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 13. `corp-link-current` (Occurrences: 2)

- **Chronological Block Order**: `001986 -> 003545`
- **Final Winning Declarations**: `{"color":"#68645D","font-style":"normal"}`
- **Fully Shadowed Properties**: `color, font-style`
- **Still Contributing Properties**: `None`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 14. `recommended` (Occurrences: 2)

- **Chronological Block Order**: `002109 -> 003607`
- **Final Winning Declarations**: `{"border-color":"var(--border-gold)","box-shadow":"var(--shadow-soft)","padding-top":"28px"}`
- **Fully Shadowed Properties**: `padding-top`
- **Still Contributing Properties**: `border-color, box-shadow`
- **Specificity**: `[0, 2, 1]`
- **Media Scope**: `base`


### 15. `seat-pack-badge` (Occurrences: 2)

- **Chronological Block Order**: `002110 -> 003608`
- **Final Winning Declarations**: `{"background":"var(--gold)","border-radius":"999px","color":"#17120c","font-size":"11px","font-weight":"800","letter-spacing":".08em","padding":"5px 9px","position":"absolute","right":"12px","text-transform":"uppercase","top":"8px","z-index":"1"}`
- **Fully Shadowed Properties**: `top`
- **Still Contributing Properties**: `background, border-radius, color, font-size, font-weight, letter-spacing, padding, position, right, text-transform, z-index`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 16. `products-plan-card__cta` (Occurrences: 2)

- **Chronological Block Order**: `003865 -> 004385`
- **Final Winning Declarations**: `{"width":"100%","align-self":"stretch","margin-top":"0"}`
- **Fully Shadowed Properties**: `width`
- **Still Contributing Properties**: `align-self, margin-top`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 17. `how-step-visual--01` (Occurrences: 2)

- **Chronological Block Order**: `002404 -> 002875`
- **Final Winning Declarations**: `{"max-width":"340px","width":"min(96%, 330px)"}`
- **Fully Shadowed Properties**: `width`
- **Still Contributing Properties**: `max-width`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 18. `yi-card-motto` (Occurrences: 2)

- **Chronological Block Order**: `003747 -> 004072`
- **Final Winning Declarations**: `{"font-family":"var(--font-ui)","font-size":"clamp(10px, 1.5vw, 13px)","font-style":"italic","letter-spacing":".01em","line-height":"1.35","margin":"0","max-width":"24ch"}`
- **Fully Shadowed Properties**: `font-family`
- **Still Contributing Properties**: `font-size, font-style, letter-spacing, line-height, margin, max-width`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 19. `legal-page--premium` (Occurrences: 2)

- **Chronological Block Order**: `003858 -> 004118`
- **Final Winning Declarations**: `{"letter-spacing":"-0.02em","word-spacing":"normal"}`
- **Fully Shadowed Properties**: `word-spacing`
- **Still Contributing Properties**: `letter-spacing`
- **Specificity**: `[0, 2, 1]`
- **Media Scope**: `base`


### 20. `home-final` (Occurrences: 2)

- **Chronological Block Order**: `003858 -> 004118`
- **Final Winning Declarations**: `{"letter-spacing":"-0.02em","word-spacing":"normal"}`
- **Fully Shadowed Properties**: `word-spacing`
- **Still Contributing Properties**: `letter-spacing`
- **Specificity**: `[0, 1, 1]`
- **Media Scope**: `base`


### 21. `home-compact__hero-copy` (Occurrences: 2)

- **Chronological Block Order**: `003858 -> 004118`
- **Final Winning Declarations**: `{"letter-spacing":"-0.02em","word-spacing":"normal"}`
- **Fully Shadowed Properties**: `word-spacing`
- **Still Contributing Properties**: `letter-spacing`
- **Specificity**: `[0, 1, 1]`
- **Media Scope**: `base`


### 22. `home-compact__close` (Occurrences: 2)

- **Chronological Block Order**: `003858 -> 004118`
- **Final Winning Declarations**: `{"letter-spacing":"-0.02em","word-spacing":"normal"}`
- **Fully Shadowed Properties**: `word-spacing`
- **Still Contributing Properties**: `letter-spacing`
- **Specificity**: `[0, 1, 1]`
- **Media Scope**: `base`


### 23. `products-public-v2-flow-arrow` (Occurrences: 2)

- **Chronological Block Order**: `000761 -> 000763`
- **Final Winning Declarations**: `{"transform":"rotate(90deg)","min-height":"22px"}`
- **Fully Shadowed Properties**: `transform`
- **Still Contributing Properties**: `min-height`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `@media (max-width: 760px)`


### 24. `corporate-conversion` (Occurrences: 2)

- **Chronological Block Order**: `000761 -> 000763`
- **Final Winning Declarations**: `{"padding":"24px","width":"min(calc(100% - 32px),var(--content))","grid-template-columns":"1fr","margin-bottom":"60px","gap":"28px"}`
- **Fully Shadowed Properties**: `grid-template-columns`
- **Still Contributing Properties**: `padding, width, margin-bottom, gap`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `@media (max-width: 760px)`


### 25. `products-public-v2-art-label` (Occurrences: 2)

- **Chronological Block Order**: `000761 -> 000763`
- **Final Winning Declarations**: `{"top":"4%","right":"4%"}`
- **Fully Shadowed Properties**: `top`
- **Still Contributing Properties**: `right`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `@media (max-width: 760px)`


### 26. `checkout-step-body` (Occurrences: 2)

- **Chronological Block Order**: `000380 -> 000381`
- **Final Winning Declarations**: `{"color":"var(--ink)","display":"grid","font-size":"12px","font-weight":"700","gap":"6px","background":"#fff","border":"1px solid var(--border)","border-radius":"10px","min-height":"44px","padding":"0 12px","width":"100%"}`
- **Fully Shadowed Properties**: `color`
- **Still Contributing Properties**: `display, font-size, font-weight, gap, background, border, border-radius, min-height, padding, width`
- **Specificity**: `[0, 1, 1]`
- **Media Scope**: `base`


### 27. `checkout-summary-thumb-card` (Occurrences: 2)

- **Chronological Block Order**: `000401 -> 000402`
- **Final Winning Declarations**: `{"background":"linear-gradient(155deg,#2a1f42,#0a0612)","transform":"translate(3px,3px)","color":"var(--gold-hi)","display":"grid","font":"800 6px var(--font-mono)","letter-spacing":".06em","place-items":"center"}`
- **Fully Shadowed Properties**: `background`
- **Still Contributing Properties**: `transform, color, display, font, letter-spacing, place-items`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 28. `corporate-pricing-card` (Occurrences: 2)

- **Chronological Block Order**: `001768 -> 001769`
- **Final Winning Declarations**: `{"font-family":"var(--font-sans,Inter,sans-serif)","font-variant-numeric":"tabular-nums"}`
- **Fully Shadowed Properties**: `font-family`
- **Still Contributing Properties**: `font-variant-numeric`
- **Specificity**: `[0, 2, 0]`
- **Media Scope**: `base`


### 29. `v25-drawer-manage-label` (Occurrences: 2)

- **Chronological Block Order**: `002025 -> 002026`
- **Final Winning Declarations**: `{"color":"var(--gold-hi)","display":"block","font-size":"11px","font-weight":"800","letter-spacing":".08em","margin":"0 0 8px","text-transform":"uppercase"}`
- **Fully Shadowed Properties**: `margin`
- **Still Contributing Properties**: `color, display, font-size, font-weight, letter-spacing, text-transform`
- **Specificity**: `[0, 1, 0]`
- **Media Scope**: `base`


### 30. `business-role-matrix` (Occurrences: 2)

- **Chronological Block Order**: `003381 -> 003382`
- **Final Winning Declarations**: `{"color":"var(--ink-3)","font-weight":"700"}`
- **Fully Shadowed Properties**: `color`
- **Still Contributing Properties**: `font-weight`
- **Specificity**: `[0, 3, 0]`
- **Media Scope**: `base`


---

## 6. Top CROSS_DOMAIN_COLLISION Cases

Classes used across multiple domain components that present collision risks:

| Class Name | Occurrences | Domains Involved | Block IDs |
| :--- | :--- | :--- | :--- |
| `p10-corporate-platform` | 183 | account, corporate, foundation | `001402, 001403, 001404, 001405, 001406, 001407, 001408, 001410, 001412, 001419, 001435, 001436, 001437, 001438, 001721, 001722, 001723, 001724, 001725, 001726, 001737, 002018, 003026, 003028, 003029, 003057, 003058, 003060, 003062, 003064, 003065, 003066, 003067, 003068, 003069, 003070, 003071, 003072, 003073, 003074, 003075, 003076, 003077, 003078, 003079, 003080, 003081, 003082, 003083, 003084, 003085, 003086, 003087, 003088, 003089, 003091, 003092, 003102, 003110, 003128, 003129, 003131, 003132, 003133, 003134, 003135, 003136, 003137, 003138, 003139, 003140, 003141, 003142, 003143, 003144, 003145, 003146, 003147, 003167, 003171, 003172, 003182, 003183, 003184, 003185, 003186, 003187, 003188, 003189, 003190, 003191, 003192, 003193, 003194, 003195, 003196, 003197, 003198, 003199, 003200, 003201, 003202, 003203, 003204, 003205, 003206, 003207, 003208, 003209, 003210, 003211, 003212, 003213, 003214, 003215, 003216, 003217, 003218, 003219, 003220, 003221, 003222, 003223, 003224, 003225, 003226, 003227, 003231, 003232, 003233, 003236, 003237, 003249, 003250, 003251, 003252, 003253, 003254, 003255, 003256, 003257, 003258, 003259, 003260, 003261, 003262, 003277, 003302, 003303, 003314, 003350, 003351, 003352, 003365, 003381, 003382, 003385, 003386, 003387, 003388, 003389, 003390, 003391, 003392, 003393, 003394, 003395, 003396, 003397, 003398, 003399, 003555, 003567, 003568, 003573, 003594, 003601, 003602, 003618, 003619, 003620, 003637, 003640` |
| `public-site-chrome` | 56 | account, corporate, foundation, products, public | `002411, 002412, 002413, 002414, 002818, 002819, 003409, 003410, 003411, 003412, 003413, 003414, 003415, 003416, 003417, 003418, 003419, 003432, 003433, 003487, 003652, 003653, 003654, 003655, 003656, 003657, 003658, 003659, 003660, 003661, 003731, 003732, 003856, 003860, 003861, 003924, 003925, 003974, 003975, 003976, 004028, 004034, 004039, 004040, 004041, 004042, 004054, 004064, 004065, 004067, 004135, 004136, 004217, 004218, 004376, 004377` |
| `v26-reference-kpis` | 39 | account, corporate, foundation | `000835, 000837, 000951, 001297, 001298, 001299, 001300, 001301, 001302, 001303, 001304, 001305, 001306, 001307, 001308, 001309, 001408, 001409, 001410, 003065, 003066, 003067, 003068, 003129, 003131, 003132, 003133, 003134, 003215, 003216, 003250, 003259, 003260, 003261, 003262, 003306, 003313, 003385, 003387` |
| `v26-reference-activity` | 39 | account, corporate | `001311, 001313, 001314, 001315, 001326, 001327, 001328, 001329, 001330, 001331, 001332, 001333, 001334, 001335, 001336, 001337, 001338, 003058, 003060, 003062, 003081, 003085, 003086, 003129, 003131, 003132, 003144, 003145, 003182, 003211, 003212, 003213, 003214, 003257, 003259, 003260, 003310, 003311, 003312` |
| `how-step-visual` | 36 | corporate, foundation, products, public | `001527, 001544, 001545, 001546, 002402, 002766, 002812, 002872, 002925, 003444, 003805, 003806, 003807, 003808, 003809, 003810, 003811, 003812, 003813, 003814, 003815, 003816, 003817, 003818, 003819, 003820, 003821, 003822, 003857, 004099, 004102, 004103, 004104, 004105, 004106, 004116` |
| `corporate-sales-page` | 32 | account, commerce, corporate, foundation, products, public | `000071, 000164, 000761, 002523, 003893, 003974, 003975, 003976, 004063, 004158, 004166, 004228, 004237, 004238, 004244, 004248, 004251, 004252, 004257, 004258, 004259, 004262, 004263, 004264, 004269, 004270, 004271, 004272, 004273, 004274, 004275, 004278` |
| `v25-kpi-grid` | 32 | account, corporate, foundation | `000816, 000817, 000950, 000951, 001361, 001362, 001363, 001364, 001365, 001366, 001367, 001368, 001408, 001409, 001410, 003065, 003066, 003067, 003068, 003129, 003134, 003182, 003215, 003217, 003218, 003236, 003237, 003249, 003259, 003262, 003385, 003387` |
| `v26-reference-bottom` | 31 | account, corporate, foundation | `000845, 000951, 001311, 001313, 001315, 001328, 001339, 001340, 001341, 001358, 001408, 001410, 003058, 003062, 003078, 003081, 003129, 003132, 003182, 003211, 003214, 003236, 003254, 003257, 003259, 003260, 003262, 003309, 003312, 003385, 003387` |
| `business-kpis` | 29 | account, corporate, foundation | `000816, 000817, 000950, 000951, 001435, 001436, 001437, 001438, 001737, 003058, 003060, 003062, 003064, 003129, 003131, 003132, 003133, 003182, 003215, 003217, 003218, 003236, 003237, 003249, 003258, 003259, 003262, 003385, 003387` |
| `how-it-works-page` | 28 | corporate, foundation, products, public | `001448, 001523, 001524, 001527, 001530, 001531, 001532, 001544, 001545, 001546, 003437, 003438, 003488, 003856, 003857, 003974, 003975, 003976, 004063, 004099, 004100, 004101, 004102, 004103, 004104, 004105, 004106, 004116` |
| `v26-hero-capabilities` | 25 | account, corporate, foundation | `000834, 000836, 000951, 001279, 001280, 001281, 001282, 001283, 001284, 001285, 001286, 001287, 001409, 001410, 003192, 003193, 003194, 003195, 003236, 003237, 003251, 003262, 003314, 003385, 003387` |
| `v26-reference-chart` | 24 | account, corporate | `001311, 001312, 001313, 001314, 001315, 001316, 001317, 001324, 001325, 001410, 003058, 003060, 003062, 003129, 003131, 003132, 003182, 003208, 003257, 003259, 003260, 003310, 003311, 003312` |
| `corporate-lead-form` | 21 | commerce, corporate, foundation | `004144, 004145, 004146, 004147, 004148, 004149, 004210, 004212, 004228, 004229, 004230, 004231, 004238, 004269, 004270, 004271, 004272, 004273, 004274, 004275, 004278` |
| `v25-panel` | 20 | account, corporate | `000465, 000466, 001371, 001372, 001373, 001374, 001405, 003058, 003060, 003062, 003079, 003080, 003081, 003092, 003129, 003131, 003132, 003182, 003257, 003259` |
| `enterprise-nav-entry` | 18 | account, corporate, foundation | `000792, 000794, 000795, 003026, 003028, 003029, 003091, 003110, 003271, 003272, 003277, 003297, 003300, 003350, 003352, 003555, 003567, 003568` |
| `corporate-cta` | 17 | commerce, corporate, foundation, products, public | `000082, 000083, 000085, 002526, 003720, 003849, 004055, 004066, 004148, 004149, 004208, 004228, 004238, 004262, 004274, 004275, 004278` |
| `corporate-pack-table` | 17 | commerce, corporate, foundation, products | `003509, 003520, 003715, 003716, 003717, 003718, 003719, 004196, 004197, 004198, 004235, 004236, 004237, 004257, 004258, 004259, 004278` |
| `add-to-cart-button` | 16 | commerce, corporate, foundation, products | `003715, 003716, 003717, 003718, 003719, 003720, 003849, 003935, 003959, 004198, 004228, 004236, 004238, 004259, 004275, 004278` |
| `home-mockup__link-secondary` | 15 | account, commerce, corporate, foundation, public | `003910, 003922, 003961, 003962, 003979, 003980, 003983, 004043, 004066, 004166, 004192, 004208, 004248, 004262, 004264` |
| `p14-management-row` | 14 | account, commerce, corporate, foundation | `000465, 000484, 000533, 000534, 000535, 000536, 000537, 000539, 000542, 000543, 000951, 003933, 003934, 003935` |
| `public-page-title` | 14 | account, corporate, foundation, products, public | `000546, 000547, 000548, 000549, 000554, 000555, 000556, 003014, 003436, 003662, 003730, 003858, 004108, 004109` |
| `settings-tristate` | 14 | account, corporate | `000853, 001721, 001725, 001726, 001946, 001947, 001948, 001949, 002017, 003182, 003621, 003622, 003623, 003624` |
| `v25-employee-drawer` | 14 | account, corporate, foundation | `002018, 002019, 002034, 002035, 002036, 002037, 002038, 002039, 002067, 002068, 002616, 002617, 003578, 003579` |
| `company-settings-grid` | 13 | account, commerce, corporate, foundation, products, public | `000469, 000626, 000761, 001920, 001940, 001941, 001942, 001943, 001944, 001945, 002015, 003635, 003637` |
| `how-hero` | 13 | account, corporate, foundation, products, public | `001451, 001527, 001544, 001546, 002437, 002812, 002925, 003438, 003488, 003662, 003858, 003868, 003985` |
| `products-single-visual` | 13 | corporate, foundation, products, public | `001626, 001650, 001651, 002744, 002811, 002812, 002852, 002853, 002925, 003758, 003760, 004033, 004070` |
| `v26-overview-hero` | 12 | account, corporate | `000465, 000832, 000950, 001253, 001409, 001410, 003058, 003129, 003182, 003183, 003184, 003236` |
| `p8-corporate-editor` | 12 | account, corporate, foundation | `000632, 001246, 003301, 003302, 003558, 003559, 003560, 003567, 003568, 003573, 003591, 003592` |
| `corporate-pricing-grid` | 12 | account, commerce, corporate, foundation, products, public | `000760, 000761, 000762, 000763, 002527, 002536, 002537, 002925, 003513, 003720, 003961, 003962` |
| `v26-reference-main-row` | 12 | account, corporate, foundation | `000843, 000844, 000950, 001310, 001409, 003236, 003253, 003261, 003307, 003308, 003385, 003386` |

---

## 7. Codebase Usage Scans & Risk Metrics

- **Responsive-Only Duplicates**: 60 classes
- **Equal-Specificity Conflicting Overrides**: 36 classes
- **Selectors Appearing Unused**: 128 classes
- **Uncertain / Dynamic Usage**: 141 classes

---

## 8. Recommended First Cleanup Batch

> **Important**: No CSS modifications were performed in Phase 6.

When cleanup begins in Phase 7, the following initial batch of 100-score `IDENTICAL_DUPLICATE` candidates is recommended:

- **Candidate Count**: 4 classes
- **Target Classes**: `home-premium__final`, `home-premium__journey-steps`, `home-premium__journey-action`, `p6-auth-kicker`
- **Estimated Block Reduction**: 4 blocks (from 1868 to 1864)
- **Estimated Byte Reduction**: ~10569 bytes saved
