# Yenomi ID — Phase 9 / Orders, Analytics, Subscription, Settings

Phase 9 migrates the four supporting individual-account surfaces onto the canonical design system without inventing unsupported business data.

## Orders
- Removes the page-level `qr.css` dependency and legacy `my-order-*` rendering.
- Uses canonical `Card`, `Badge`, `ButtonLink`, and `EmptyState` primitives.
- Keeps the existing commerce orders API and status lifecycle.
- Shows order number, date, products, quantity, payment, delivery destination, total, progress and shipping tracking when available.

## Analytics
- Uses only data supported by `/api/analytics/me`: 30-day profile views, 90-day profile views, daily trend and per-card views.
- Does not fabricate QR scans, NFC interactions, contact saves or link-click KPIs; those require an event-model/API expansion in a later data phase.
- Adds a per-card performance ranking and accessible chart labels.

## Subscription
- Removes the hard-coded `Aktif` state.
- Reads the existing `/api/commerce/entitlements` endpoint to reflect whether a currently active individual digital service exists and, when present, its expiry date and remaining days.
- Keeps the technical entitlement model invisible in user-facing copy.
- Retains the existing renewal SKU/cart business logic.

## Settings
- Groups supported functionality into Account Information, Security, Current Session and Privacy/Legal.
- Does not invent notification preferences, session history or account deletion because no supported persistence/action was found in the current source.
- Replaces raw Supabase error text with user-facing recovery copy.

## CSS ownership
`app/account-management.css` is a scoped Phase 9 canonical layer. It uses semantic design tokens only and adds no legacy token family, gradients or glass blur.
