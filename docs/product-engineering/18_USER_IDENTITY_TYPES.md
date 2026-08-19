# User identity types

**Document:** `18_USER_IDENTITY_TYPES.md`  
**Status:** Active domain contract  
**Date:** 19 August 2026

Yenomi ID users are typed in the database with three independent fields. Pet ID is why a single occupancy flag is not enough: one auth user can hold Digital ID and Pet ID at the same time.

## The three types

| Type | DB | Meaning |
| --- | --- | --- |
| Occupancy | `user_accounts.account_type` | Bireysel / kurumsal login overlay. `TEST` is not a product. |
| Product family | `user_accounts.identity_product_family` | Digital ID, Business Mini Site, Restaurant, Emergency ID, Pet ID, Vehicle ID |
| Package | `user_accounts.package_code` | Purchased or provisioned package. Determines occupancy + family. `UNASSIGNED` until then. |

`user_identity_types` stores every active triple `(product_family, occupancy, package_code)` for that user.

Digital ID occupancy is not a separate product: bireysel packages (`INDIVIDUAL`, `INDIVIDUAL_PREMIUM`) vs kurumsal packages (`CORP-*`, `DEMO-*`) set occupancy from the package.

## Product tree

- Digital ID — dijital kartvizit bireysel / kurumsal
- Business Mini Site — işletme mini sitesi (catalogued, not live checkout)
- Restaurant — mini menü, QR menü, kampanyalar, rezervasyon (catalogued, not live checkout)
- Emergency ID — acil durum / kişiler / QR / NFC (catalogued, not live checkout)
- Pet ID — catalogued, not live checkout
- Analytics — görüntülenme, QR tarama, link tıklama, CTA. Measurement layer, not a user type.

## Authority

- Canonical TypeScript: `lib/identity/user-types.ts`
- Database write path: `public.refresh_user_identity(user_id)` from entitlements and organization membership/subscription
- Client code must not invent occupancy, family, or package
- Coming-soon families stay `live=false` until fulfillment exists

## What this does not change

- Login portals remain `INDIVIDUAL` / `CORPORATE` / `TEST`
- Commerce `product_kind` enum remains the fulfillment kind
- Seat-pack SKUs do not become a user package type
- No fake Pet ID / Restaurant checkout
