# Yenomi ID — Phase 4 Public Website / Conversion

Version: 25.8.44

## Scope

Phase 4 migrates the public homepage conversion experience onto the canonical design foundation without changing authentication, Supabase, payment, activation, card assignment, analytics, subscription or corporate business logic.

## Information architecture

1. Hero — explains Yenomi ID in the first viewport and shows physical card → NFC → digital profile.
2. Product proof — explains that the package is physical card + QR identity + digital profile + management + updates + digital service.
3. Core benefits — touch, always-current identity, lost mode, professional impression.
4. How it works — buy → activate → share.
5. Individual / corporate split — separates self-service use from centralized organization management.
6. Trust — payment, delivery, privacy/contracts and Yenomilabs platform context.
7. FAQ.
8. Final conversion CTA.

## Design decisions

- Public conversion uses the canonical semantic token names from Phase 2.
- It intentionally uses a light neutral marketing context while product artwork retains controlled dark contrast.
- No new `--yi-*`, `--yp-*`, `--store-*`, `--brand-*`, `--ui-*` or `--y-*` tokens are introduced.
- No gradients are used by the new public-conversion layer.
- Header blur/glass is disabled in the Phase 4 homepage scope.
- Primary color is reserved for CTA, links, state and small emphasis.
- Marketing spacing is generous but the page is intentionally limited to eight conversion sections.
- Product and checkout route redesign are deferred to Phase 5 so commerce business logic is not mixed into this migration.

## Responsive / accessibility

The new homepage has explicit desktop, tablet, 760px mobile and 430px compact-mobile behavior. Actions are at least 48px high, focus-visible states are present, semantic headings and labelled sections are used, FAQ uses native details/summary, and reduced-motion preferences are respected.

## Business logic protection

No Supabase queries, RLS policies, mutations, payment logic, activation flows, NFC/QR routing or account routing were changed.
