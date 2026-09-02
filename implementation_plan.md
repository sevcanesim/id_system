# Yenomi ID — Super Admin Operations Implementation Plan

## Goal
Build one operational control plane for individual and corporate accounts, physical-card production and shipment, Network Mail quota administration, independent corporate capacity renewal batches, dynamic commercial pricing, and immutable admin audit evidence.

## Existing repository contracts to preserve

The repository already contains production-facing foundations and this implementation extends them rather than creating parallel models:

- `commerce_physical_card_units` is the authoritative paid physical-card fulfillment ledger. A profile save alone must never create a printable physical unit without a paid/authorized unit.
- `entitlements.network_mail_limit` / `network_mail_remaining` and the service-role consume/refund functions are the authoritative Individual Premium Network Mail ledger.
- `organization_entitlements.mail_credits_remaining` is the corporate Network Mail ledger.
- `organization_capacity_terms` already represents independently renewable corporate capacity purchases. Each paid capacity purchase remains a separate term/batch.
- `product_variants` is the authoritative price/catalog source. Admin pricing changes update catalog records rather than hard-coding UI prices.
- `admin_audit_log` is the authoritative administrative audit trail.

## Business rules

### 1. Physical card production and shipping

Operational state machine (matches `operations_status` on `commerce_physical_card_units` and the
`transition_physical_card_unit` guard clauses exactly — this is the implemented contract, not an
earlier draft of it):

`PROFILE_REQUIRED -> PRINT_PENDING -> PRINTING -> SHIPPING_PENDING -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED`

Terminal exception state: `CANCELLED` (reachable from any non-terminal state).

`SHIPPING_PENDING` is also reachable directly from `PRINT_PENDING`, skipping `PRINTING` — the
"start print" step is optional bookkeeping, not a required gate before approval.

Rules:

1. A print request may only be opened for an existing `commerce_physical_card_units` row linked to a paid/authorized order item.
2. The user's `Profili Tamamla` action marks the eligible paid unit as `PRINT_PENDING`; it does not create an unpaid physical entitlement.
3. Super Admin `Baskıyı Onayla` (the `APPROVE_PRINT` action, from `PRINT_PENDING` or `PRINTING`) atomically stamps approval actor/time and advances to `SHIPPING_PENDING`.
4. Carrier and tracking number are required before `IN_TRANSIT`.
5. Shipping transitions are timestamped and exposed to individual/corporate user-facing steppers.
6. Every admin transition writes `admin_audit_log`.

### 2. Individual Standard / Premium lifecycle

- Standard list price requested by product contract: 1,490 TRY. The catalog remains dynamic and the admin panel is the mutation surface.
- Paid purchase timestamp is the source timestamp; service renewal date is exactly `purchase/activation basis + 365 days` where the product metadata contract says `service_days=365`.
- Premium Network Mail base grant is exactly 100 credits.
- Credits are debited only by the idempotent send operation, not by opening a composer or attempting a request that never reaches the send boundary.
- Super Admin may grant credits, reset the active Premium entitlement to its configured base limit, and inspect usage/adjustment history. Every adjustment is audited.

### 3. Corporate multi-batch renewals

`organization_capacity_terms` is treated as the batch ledger. UI terminology may display `Batch ID`, while the database key remains the term UUID.

Each row exposes:

- batch/term ID
- source order
- purchased/started timestamp
- expiry/renewal timestamp
- card/seat count
- renewal-price snapshot
- currency
- status

Renewal generation must be idempotent. Re-running the due-renewal worker may not create duplicate invoice/renewal intents. Automatic renewal means creating a renewal billing record/notification; payment capture is not implied unless a valid recurring-payment mandate exists.

### 4. Dynamic pricing

Admin-editable catalog targets are backed by `product_variants` / existing package tables, including:

- Standard individual card
- Premium first-year / upgrade / renewal where active in catalog
- corporate seat/package SKUs
- individual Network Mail add-ons
- corporate Network Mail add-ons

Every price mutation records old/new values in `admin_audit_log`.

### 5. Super Admin control plane

Primary tabs:

- Overview
- Users
- Print Queue
- Shipping
- Network Mail
- Organizations
- License Batches
- Pricing
- Orders / Reconciliation
- Audit Log

Cross-cutting filters: account type, account state, fulfillment state, renewal window, organization, order number/email, and date range.

## Delivery phases

### Phase A — Domain and database contracts

- Add operational physical-card workflow timestamps/status without destroying provenance.
- Add Network Mail adjustment/usage history if absent.
- Add idempotent renewal-intent records for due corporate capacity terms.
- Add database indexes and constraints required by admin filtering.

### Phase B — Server APIs

Admin-only endpoints for:

- print queue list + print approval
- shipment creation/status transitions
- individual Network Mail quota inspection/adjustment
- corporate capacity-term list and renewal intent generation
- price catalog read/update
- unified audit-log read

All mutation routes must authenticate against `admin_users` and write `admin_audit_log`.

### Phase C — Super Admin UI

Refactor `/admin` from the current large client page into domain sections/components without creating a second admin shell. Reuse the design system and existing order/reconciliation/corporate functionality.

### Phase D — User-facing state

- Individual `Siparişlerim & Kart Durumu`: production/shipping stepper.
- Corporate employee/admin surfaces: same authoritative fulfillment status.
- Individual Premium: `remaining / limit` quota and usage history.
- Renewal countdowns use server-backed timestamps, never client-created purchase dates.

### Phase E — Verification

Required gates:

- database migration review / idempotency
- admin authorization tests
- state-transition tests including illegal transitions
- quota double-spend / refund tests
- renewal duplicate-generation tests
- typecheck
- existing repository tests and product-engineering verifiers
- responsive/live browser QA for `/admin` and affected signed-in panels

## Non-negotiable invariants

- No physical print job without paid/authorized physical-card provenance.
- No direct client mutation of quota, prices, print states, shipment states, or renewal batches.
- No automatic card charge merely because a renewal became due.
- No duplicate quota debit for one send idempotency key.
- No batch collapsing: separately purchased corporate capacity keeps independent renewal terms.
- No un-audited Super Admin mutation.
- No merge to `main` until explicitly approved.
