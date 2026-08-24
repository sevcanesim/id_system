# Yenomi ID — Agent Working Contract

This file is the concise operational contract for any coding agent working in this repository.

## Before coding

- Read `docs/product-engineering/00_MASTER_PRODUCT_ENGINEERING_CONTRACT.md`.
- Read `docs/product-engineering/01_CURRENT_ARCHITECTURE_BASELINE.md`.
- Inspect the affected files, imports, routes, APIs, database contracts, CSS owners and tests.
- Search for an existing component/service/utility before creating a new one.
- Identify root cause before adding a workaround.

## While coding

- Preserve existing production behavior unless the task explicitly changes it.
- Prefer the existing design system.
- Do not create duplicate components.
- Do not create route-local or feature-local global CSS ad hoc.
- Do not append new feature rules to `app/canonical.css`. It is a legacy compatibility/cascade owner being reduced over time.
- New or refactored global CSS must live in an approved owned module under `app/styles/` and preserve the declared global import order.
- `app/design-tokens.css` is the single source of truth for palette, typography, spacing, radius, elevation, motion and layout tokens. Do not redefine those values in CSS modules.
- New UI consumes semantic tokens only; frozen legacy names such as `--gold`, `--violet`, `--ink` and `--void` are compatibility bridges, not authoring APIs.
- Do not add `!important`.
- Do not add business rules to UI components.
- Do not trust client-side prices, permissions, payment results or entitlement state.
- Keep server/API/database authorization authoritative.
- Do not create fake production functionality.
- Avoid opportunistic refactors.
- Follow the UI/UX guardrails below on every component you write, edit, or refactor.

## Global CSS ownership

Approved modules are introduced incrementally. Do not move rules between modules unless cascade order and relevant regression tests are preserved.

Target ownership:

- `app/canonical.css`: temporary legacy compatibility/cascade layer only; must not grow.
- `app/styles/canonical-foundation.css`: resets and shared structural primitives that are not tokens.
- `app/styles/canonical-public.css`: public marketing, support and legal surfaces.
- `app/styles/canonical-products.css`: product catalogue, NFC product and how-it-works surfaces.
- `app/styles/canonical-corporate.css`: corporate/enterprise management surfaces.
- `app/styles/canonical-account.css`: auth, account, individual card and profile surfaces.
- `app/styles/canonical-commerce.css`: cart, checkout, payment and order surfaces.

Rules:

- Preserve source order when extracting existing rules. Moving CSS is a behavior-preserving refactor, not a redesign opportunity.
- Do not duplicate a selector in a new module while leaving the old copy active.
- Do not delete a selector solely because static string search reports it unused. Dynamic/state/data-attribute usage must be ruled out first.
- Any dead-CSS removal requires targeted regression evidence; high-risk shared selectors require browser coverage.
- Keep module boundaries domain-based; do not create phase-number or one-off patch files.

## UI / UX guardrails (binding)

These rules protect visual consistency. They do **not** authorize a dark-canvas restyle.

### Theme

- Public, individual, and account chrome stay warm-light (`app/theme-policy.css`: canvas `#F9F8F6`, ink, champagne / `--brand-gold`).
- "Dark luxury" means foil, phone chrome, and product specimens — matte black and champagne **inside** the mockup — not `html` / `body` `#0B0B0B`.
- Do not introduce neon, leftover purple (`#8064ff`, `#6d3de0` as a surface accent), or random hues on marketing or account chrome.

### Mockups

- Never generate AI raster mockups of phones, cards, or devices.
- Build specimens with HTML/CSS (glass, radius, `linear-gradient`, layered `box-shadow`) or clean SVG.
- Specimen copy is a real identity (`Selin Kaya` / `Ürün Yöneticisi` / `Yenomi Labs`), never field labels or lorem.

### Cards and grids

- Side-by-side cards (pricing, features, steps) stretch to equal height (`align-items: stretch`, flex column, `margin-top: auto` on the CTA).
- Padding and gap stay on the existing scale. Do not invent one-off spacing. Mobile, tablet, and desktop must not clip or crush.

### Type

- Do not collapse the space between a heading (`h1`, `h2`) and its supporting paragraph.
- Heading `word-spacing` stays `normal`. `.ds-button` stays `font-weight: 700`.

### Pre-flight

Before coding a component, confirm:

1. Same card/grid standard as existing public pages?
2. Mobile: no vertical crush or overflow?
3. Mockup still feels luxury and minimal — not fake raster?

If any answer is no, ship the corrected version.

## After coding

Run the most relevant available checks yourself.

If a check fails:

1. inspect the full failure
2. classify implementation/test/environment/dependency/data/migration/infrastructure
3. fix the root cause where possible
4. rerun the targeted check
5. run relevant regression checks
6. report any remaining blocker honestly

Never call `BLOCKED` a `PASS`.
Never weaken a test just to make it pass.

## Completion

A task is complete only after implementation, targeted verification, regression review and QA status are documented.
