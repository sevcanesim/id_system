# Super Admin Operations Implementation Status

## Implemented on branch

- Individual physical-card operational lifecycle and event ledger.
- Profile-completion handoff to print queue using an existing paid fulfillment unit only.
- Super Admin card transition API for print approval, shipping, out-for-delivery and delivery.
- User-facing card-process API for operational status/timestamps.
- Individual dashboard, order history and renewal surfaces wired toward purchase/renewal/card-process visibility.
- Standard individual catalog price set to 1,490 TRY in the product catalog migration.
- Premium Network Mail allowance aligned to 100 in application configuration/catalog logic.
- Shared sidebar information architecture cleanup for individual/corporate surfaces.

## Existing platform capabilities reused

- `commerce_physical_card_units` remains the physical fulfillment authority.
- `admin_audit_log` remains the administrative audit authority.
- `consume_individual_network_mail` / refund functions remain the atomic quota authority.
- `organization_capacity_terms` remains the independent corporate purchase-lot / renewal-term ledger.
- Existing Super Admin commerce, reconciliation and organization APIs are extended rather than duplicated.

## Remaining implementation

- Super Admin UI decomposition into operations-focused sections: overview, users, print queue, shipping, Network Mail, corporate batches, pricing and audit log.
- Admin Network Mail quota grant/reset/history endpoints using atomic ledger semantics and audit logging.
- Corporate batch/term management UI and renewal intent/invoice-notification integration.
- Dynamic pricing administration against the canonical product catalog with validation and audit records.
- Full user/account filter surface with active/suspended/cancelled status, order lifecycle and renewal visibility.
- Targeted tests and CI verification.

## Merge rule

This branch must not be merged to `main` until the implementation is complete and explicit approval is given.
