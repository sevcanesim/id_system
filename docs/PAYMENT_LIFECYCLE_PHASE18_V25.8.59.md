# Phase 18 — Payment Lifecycle Lock (v25.8.59)

Phase 18 locks the money path after checkout. A verified iyzico payment is never reclassified as a failed payment merely because a downstream fulfillment step needs review.

## Locked contracts

- Callback processing remains exactly-once per paid order.
- Replayed paid callbacks do not create a second entitlement, seat increment or charge path.
- Initial individual service creates one entitlement per paid quantity and account-first auto-claim activates it.
- Digital renewal extends the existing service by 365 days and moves the grace end to expiry + 7 days; it does not create a fresh entitlement.
- Extra/replacement cards create physical fulfillment units without extending digital service.
- Business capacity add-ons derive seat count from server-side SKU metadata, preserve the current subscription term, and add the matching physical-card production units.
- If a paid fulfillment cannot complete because its target subscription/entitlement disappeared between checkout and callback, the order stays PAID and receives a `commerce_fulfillment_issues` record for reconciliation.
- The success UI tells the customer that payment was received and will not be charged again when fulfillment review is required.
- `ORDER_READY` and `ORDER_REVIEW_REQUIRED` are valid commerce email event types.

## Deliberately not fabricated

This source package cannot prove a live iyzico Sandbox transaction without sandbox credentials and a reachable callback URL. `verify:phase18:payment` checks the lifecycle contract statically; Phase 19/20 release qualification must run the sandbox/staging payment scenario against the deployed callback.
