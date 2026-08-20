# Yenomi ID — Phase 4 Public Website / Conversion

Version: 25.8.44

## Scope

Phase 4 migrates the public homepage conversion experience onto the canonical design foundation without changing authentication, Supabase, payment, activation, card assignment, analytics, subscription or corporate business logic.

The live homepage is `app/page.tsx`. Do not recreate `app/LandingClient.tsx`. Public chrome lives in `app/canonical.css`. Do not recreate `app/public-conversion.css`.

## Information architecture

1. Hero — explains Yenomi ID in the first viewport and shows physical card + live profile specimens.
2. Individual / corporate split — self-service NFC card versus team packs.
3. Product proof — physical card, live digital profile, lost mode.
4. How it works — choose, bind, share, with a dedicated `/nasil-calisir` page.
5. Final conversion CTA.

## Design decisions

- Public conversion uses the canonical semantic token names from Phase 2.
- Live homepage classes are `.home-mockup` / `.home-premium`.
- No new `--yi-*`, `--yp-*`, `--store-*`, `--brand-*`, `--ui-*` or `--y-*` tokens are introduced.
- Product and checkout route redesign remain owned by commerce surfaces.

## Responsive / accessibility

The homepage has explicit desktop, tablet, 760px mobile and 430px compact-mobile behavior. Primary actions meet the 44–50px touch-target intent, focus-visible states are present, semantic headings and labelled sections are used, and reduced-motion preferences are respected.

## Business logic protection

No Supabase queries, RLS policies, mutations, payment logic, activation flows, NFC/QR routing or account routing were changed.
