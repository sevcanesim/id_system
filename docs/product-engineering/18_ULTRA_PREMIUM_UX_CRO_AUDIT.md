# Yenomi ID — Ultra-Premium UX/UI & CRO Audit Contract

This document adds a second, evidence-based quality layer on top of the responsive master QA. It does not replace repository contracts, accessibility requirements, business rules, auth, commerce, or database behavior.

## Evidence rule

No subjective score may be published from source inspection alone. A route must have live browser evidence at the target viewport before it can receive a score. If live evidence is unavailable, use `NOT SCORED`.

Hard invariants and subjective scorecards are intentionally separated:

- hard invariant = measurable and release-blocking when required by repository contract
- scorecard = expert evaluation supported by rendered evidence, not an automated truth claim

## Evaluation dimensions

Each rendered route or journey is scored from 0–100 in four dimensions:

1. **Visual Integrity & Hierarchy** — grid, spacing, alignment, typography hierarchy, contrast, icon consistency, radius/shadow discipline.
2. **Premium Aesthetic** — restraint, material depth, warm-light surface discipline, polished component states, typography quality and consistency.
3. **CRO & Sales Strength** — value proposition clarity, CTA hierarchy, decision load, trust placement, objection handling and conversion continuity.
4. **Frictionless UX** — task completion effort, mobile ergonomics, thumb reach, touch target quality, form friction, sticky/safe-area behavior and navigation clarity.

Overall product score is the arithmetic mean of the four scored dimensions. Do not invent weighted formulas without a documented product decision.

## Score interpretation

- `90–100` — release-quality premium experience; only minor polish remains.
- `80–89` — strong, but one or more visible hierarchy/CRO/friction issues remain.
- `70–79` — acceptable structure with material premium or conversion debt.
- `60–69` — noticeable product-quality debt; should not be marketed as premium-ready.
- `<60` — major visual, trust, conversion or usability problems.

A high score never overrides a failed hard invariant.

## Hard mobile ergonomics checks

At minimum verify:

- critical interactive targets meet the Yenomi 44×44 CSS px product standard where applicable
- primary mobile CTA is reachable without covering essential content
- sticky/fixed actions respect `env(safe-area-inset-bottom, 0px)` through component-owned spacing/tokens
- keyboard opening does not hide form submit/error content
- document-level horizontal overflow is zero
- overflow is not hidden with `overflow-x: hidden` or `overflow-x: clip` on top-level page containers to manufacture a pass
- off-canvas navigation returns focus to its trigger and supports Escape where applicable

## Behavioral/CRO audit

For each conversion surface, answer with evidence:

- Can a first-time user explain the product/value proposition within roughly one scan of the hero?
- Is there one visually dominant primary action?
- Do secondary actions compete with the primary action?
- Are price, shipping, renewal, activation and next-step expectations visible before commitment where relevant?
- Are trust signals placed next to the anxiety they resolve rather than collected in a detached decorative section?
- Is social proof authentic and verifiable? Never fabricate customer counts, ratings, logos or testimonials.
- Does the interface reduce decisions, or merely expose every available feature at once?
- Does checkout preserve user progress and avoid asking for information earlier than necessary?

## Premium visual audit

Check rendered evidence for:

- inconsistent spacing/token rhythm
- misaligned icons/text baselines
- arbitrary border radii
- harsh or stacked shadows that create a low-cost visual effect
- weak text/background contrast
- accidental dark surfaces outside approved product specimen/chrome areas
- typography wrapping, orphan words and broken manual line breaks
- inconsistent button heights, icon families or badge language
- card grids with uneven heights or CTA baselines

Do not introduce glassmorphism, metallic effects, extra gradients or shadows merely because they sound premium. Repository visual language and design tokens remain the authority.

## Priority matrix

Every confirmed issue receives one priority:

- **P0 — Critical blocker:** broken primary task, unreadable/clipped CTA, severe overflow, inaccessible critical action, deceptive/missing commerce expectation, trust-breaking state.
- **P1 — CRO/UX:** material decision friction, weak CTA hierarchy, mobile ergonomics issue, avoidable form friction, misplaced trust/objection handling.
- **P2 — Visual polish:** alignment, spacing, type rhythm, shadow/border/icon polish that does not block task completion.

Use this format:

| Priority | Current problem | Root cause / why it hurts | Required new state | Evidence / verification |
| --- | --- | --- | --- | --- |
| P0/P1/P2 | ... | ... | ... | ... |

## Route scorecard

A route may only move from `NOT SCORED` when live render evidence exists.

| Route | Visual Integrity | Premium Aesthetic | CRO Strength | Frictionless UX | Overall | Evidence status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/urunler` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/urunler/nfc-kart` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/kurumsal` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/sepet` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/checkout` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/giris` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | pending live QA |
| `/kartim` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | authenticated live QA required |
| `/kurumsal/panel/*` | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | NOT SCORED | authenticated live QA required |

## Audit output contract

For every audited screen provide:

1. **Executive scorecard** — only evidence-backed scores.
2. **UI bug/alignment report** — exact area, viewport and reproducible symptom.
3. **Premium polish decisions** — only repository-compatible changes.
4. **CRO strategy** — concrete friction, trust and CTA hierarchy changes.
5. **P0/P1/P2 action matrix** — current state → root cause → target state → verification.

## Release relationship

Responsive QA `PASS` does not automatically mean premium/CRO `READY`.

Likewise, a high premium/CRO score cannot override failed tests, accessibility failures, document overflow, broken business logic, auth errors, typecheck/build failures or repository contract violations.

Final release readiness requires both objective engineering gates and completed evidence-based UX review for changed conversion-critical surfaces.
