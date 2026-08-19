# Yenomi ID — Phase 11 Employee Management

## Theme decision
Yenomi ID application chrome is now **LIGHT by default**. Dark styling is opt-in only for physical card artwork, live digital-card previews and other deliberately contrasted product artwork. Public marketing, auth, commerce, individual dashboard, corporate dashboard, forms, drawers and data-management surfaces share the same light semantic token system.

## Account routing cleanup
The visible `/hesabim` “account check” surface is removed from the user journey. Individual login routes directly to `/kartlarim`; business login routes directly to `/kurumsal/panel`. `/hesabim` remains only as an invisible compatibility fallback for old bookmarks/links and renders no UI while resolving the destination.

## Employees
The employee domain now supports search, department/status filters, sorting, 25-row client pagination, page selection, bulk status operations, responsive mobile cards and a professional SaaS table. Current user and OWNER rows are excluded from destructive bulk selection. Bulk deactivate/offboard operations require confirmation and reuse the existing `/api/organizations/members` authorization rules.

## Detail / onboarding / offboarding / cards
Existing EmployeeDrawer functionality is retained as the employee detail workspace: corporate identity, card management, invite management and access/status. Offboarding now has explicit consequence copy before the existing backend status mutation runs. Existing replacement-card linking and physical/digital card controls are retained. Single invite and CSV bulk invite remain available from the employee page.

## Business logic protection
No new employee authorization model was introduced. Phase 11 reuses existing organization member APIs, role/department permission checks, invitation flow, member identity mutations and physical-card management endpoints.
