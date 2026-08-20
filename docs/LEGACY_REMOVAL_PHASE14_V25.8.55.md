# Yenomi ID — Phase 14 Legacy Removal

Phase 14 removes compatibility code only after active source usage is migrated.

## Removed
- `app/panel-system.css` and its root import.
- The obsolete `--yp-*` compatibility token family.
- Dead `individual-*` editor CSS after source usage reached zero.
- Legacy `dashboard-*` and `yp-*` class usage from the individual Kartım route.
- Visible “HESAP KONTROLÜ” loading UI in CardWizard.
- `qr.css` imports from public identity routes.

## Migrated ownership
- Kartım visual ownership -> `app/canonical.css` (`p14-*`). Do not recreate `dashboard-flow.css`.
- Corporate CardWizard navigation/loading -> `app/canonical.css`. Do not recreate `profile-editor.css`.
- Public profile watermark remains on the public card surface. Do not recreate `public-card.css`.

## Live owned CSS
`app/design-tokens.css` and `app/design-system.css` remain live owned global layers, imported from `app/layout.tsx`. They must not be deleted. `verify:ui-system` is authoritative for the owned CSS set:

- `app/canonical.css`
- `app/design-tokens.css`
- `app/design-system.css`
- `app/employee-management.css`
- `app/theme-policy.css`

## Do not recreate
Retired split stylesheets stay deleted: `globals.css`, `legacy-surfaces.css`, `qr.css`, `dashboard-flow.css`, `panel-system.css`, `profile-editor.css`, `public-card.css`, `corporate-platform.css`.
