# Super Admin Operations QA

## Scope

This QA contract covers the operational layer for Yenomi ID Super Admin management without changing the existing authentication, payment callback, entitlement ownership, RLS, or commerce fulfillment authority.

## Required invariants

- A physical card can enter the print queue only when a paid `commerce_physical_card_units` row already exists.
- Profile completion never creates a paid fulfillment unit.
- Physical card operational lifecycle is monotonic: `PROFILE_REQUIRED -> PRINT_PENDING -> PRINTING -> SHIPPING_PENDING -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED` (SHIPPING_PENDING is also reachable directly from PRINT_PENDING — PRINTING is an optional intermediate step, not a required gate) except explicit administrative cancellation paths.
- Every administrative card transition writes both an operational event and an admin audit record.
- Shipping requires a non-empty carrier and tracking number.
- Individual Standard catalog price is sourced from `product_variants`; UI must not become a second pricing authority.
- Individual Premium Network Mail allowance is 100. Debit/refund must use the existing atomic database functions.
- Corporate capacity purchases stay independent renewal terms. `organization_capacity_terms` is the batch ledger and purchase lots must not be collapsed into one renewal date.
- Historical price and renewal snapshots are immutable once attached to a paid purchase term.

## Super Admin views

The operations console must expose the following information without requiring operators to query the database manually:

1. Print queue: user/order/card unit, requested timestamp, current operational state and approve-print action.
2. Shipping queue: approved units awaiting carrier/tracking information, then in-transit and delivery progression.
3. Users: account status, package, purchase/renewal dates, orders, physical-card state and Network Mail balance.
4. Network Mail: current balance, usage ledger, grant/reset actions and actor/time audit trail.
5. Corporate renewals: organization, batch/term id, source order, quantity, purchase/start timestamp, expiry/renewal timestamp, renewal price snapshot and status.
6. Pricing: Standard, Premium upgrade/renewal, corporate packages/capacity and Network Mail packs from the canonical product catalog.
7. Audit Log: actor, operation, target, before/after values and timestamp.

## Validation

Before merge, run at minimum:

- `npm run typecheck`
- repository test suite
- product-engineering verifier
- targeted API tests for invalid card state transitions, missing shipping metadata, repeat/idempotent requests and insufficient Network Mail balance
- manual authenticated QA for `/admin`, `/kartlarim`, `/siparislerim`, `/yenile` and one corporate license/capacity account

No production data backfill or destructive entitlement correction is allowed as part of UI QA.
