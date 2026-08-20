# Yenomi ID — Phase 5 Product + Commerce

Version: 25.8.45

## Scope

Phase 5 migrates the commercial journey onto the canonical design system without changing payment, cart, entitlement, activation, Supabase, iyzico, order, or routing business logic.

Covered surfaces:

- `/urunler/nfc-kart`
- `/sepet`
- `/checkout`
- `/odeme/basarili`
- `/odeme/basarisiz`
- `/aktivasyon` (legacy-order bridge only)

## Product-page intent

The NFC product is presented as one product composed of three layers:

1. physical NFC + QR card,
2. persistent digital identity,
3. profile management and digital service period.

The price remains explicit and the package content, delivery, renewal, lost-card behavior and extra-card behavior remain visible before purchase.

## Cart intent

The cart is a decision checkpoint rather than a marketing page. It prioritizes:

- product and quantity,
- included delivery,
- total including VAT,
- one primary checkout action,
- concise payment/delivery trust evidence.

## Checkout intent

Checkout keeps the existing authenticated and idempotent payment architecture intact. UX is reorganized visually around:

- Buyer information,
- Delivery / billing address,
- Legal approval,
- Persistent order summary,
- iyzico transition.

The full marketing footer is replaced by the compact legal footer inside the commerce flow.

## Result-state intent

Payment success is no longer only a success sentence. It explains the next three steps: payment recorded, profile completion, physical-card preparation. Payment failure remains a recovery state and reuses the existing retry implementation.

## Design-system rule

`app/canonical.css` owns live commerce chrome after the split `commerce-flow.css` surface was retired. Do not recreate `app/commerce-flow.css`. New commerce UI must use existing canonical tokens and components. Do not add a new global stylesheet or `!important`.
