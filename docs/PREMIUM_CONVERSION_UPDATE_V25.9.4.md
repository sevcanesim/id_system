# Premium Conversion Update — v25.9.4

## Objective

Strengthen the public purchase journey without changing commerce, payment,
entitlement, or authorization contracts.

## Changes

- The homepage now explains the purchase-to-activation-to-sharing sequence in
  a dedicated, responsive journey section.
- Product guarantees that can be verified in the existing product contract are
  retained next to the final conversion action.
- The NFC product detail page ends with a real `ProductBuy` control, so the
  final CTA uses the same cart flow as the primary purchase action.
- Mobile helper text in the active homepage surface was raised to the readable
  11px minimum; the typography verifier now excludes decorative device/card
  specimen artwork from its readable-copy check.
- The last legacy `--yi-*` token reference was replaced with the canonical
  surface token.

## Non-goals

- No payment, price, cart, entitlement, API, database, or authorization logic
  changed.
- No new global stylesheet, dependency, or `!important` declaration was added.

## Verification

- `npm run verify:phase4:public` — PASS
- `npm run verify:premium-components` — PASS
- `npm run verify:typography` — PASS
- Runtime typecheck/build/visual browser checks — BLOCKED because the supplied
  archive has no `node_modules`; `verify:runtime-prerequisites` confirmed the
  lockfile is aligned and the missing local runtimes are the blocker.
