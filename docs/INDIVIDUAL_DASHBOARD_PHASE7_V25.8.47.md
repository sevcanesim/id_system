# Yenomi ID — Phase 7 Individual Dashboard

## Scope
Phase 7 migrates the individual dashboard shell and high-frequency account surfaces onto the canonical Phase 2 design system without rewriting authentication, Supabase repositories, commerce APIs, QR/NFC logic, analytics APIs or card mutations.

## Architecture
- `DashboardShell` is the live individual dashboard shell.
- `UserPanelShell` remains only as a compatibility adapter so existing routes can migrate without a risky all-at-once rewrite.
- Navigation is one sidebar with three groups: Kimlik, İçgörüler, Hesap.
- Page headings and actions use the live dashboard header in `DashboardShell`.
- Dashboard visual ownership lives in `app/canonical.css`. Do not recreate `dashboard-flow.css`.

## Product changes
- Dashboard home prioritizes card state, profile completion, entitlement availability and quick actions.
- Kartım exposes profile completion, physical-card state and publication state together.
- Lost Mode now requires an explicit confirmation before disabling physical-card access.
- Settings uses canonical Field/Input/Button primitives.
- Subscription uses canonical Card/Badge primitives.
- Analytics uses canonical Card/EmptyState primitives.
- Orders retain commerce business logic while inheriting the new shell and canonical dashboard surface.

## Intentionally deferred
- CardWizard / profile editor keeps its specialized editor shell until Phase 8.
- Corporate dashboard remains unchanged until Phase 10.
- Legacy `panel-system.css` remains as compatibility styling for old inner selectors until route-level migration reaches zero usage.
