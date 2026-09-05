# Mysoft invoice integration

## Scope

Yenomi creates one invoice job only after a PayTR payment has been
atomically confirmed and its `commerce_orders.status` becomes `PAID`.
The job holds an immutable, minimal invoice snapshot: order totals, buyer and
shipping information, purchased items and the PayTR payment context. Checkout
does not collect a T.C. kimlik number for payment.

The first document type is **e-Arşiv internet satış faturası**. The final
dispatch implementation must use Mysoft's current API contract to check the
buyer’s e-Fatura eligibility before choosing `E_INVOICE` or `E_ARCHIVE`.

## Required operational setup

1. Create a **separate Yenomi issuer** in Mysoft. Do not use the Opsola or any
   other company’s issuer account, VKN/TCKN, document serial or credentials.
2. Enable the Yenomi issuer’s e-Arşiv internet sales design and number range
   (`EARSIV` / Internet Sales) with Mysoft and the company’s financial advisor.
3. Confirm that the PayTR merchant and Mysoft issuer are the same Yenomi legal
   seller.
4. Obtain a Mysoft sandbox tenant first, then a production tenant and bearer
   token. Store secrets only in the deployment environment—never in this repo,
   a migration, an issue or a chat message.
5. Confirm the production API base URL, tenant identifier, connector GUID (if
   Mysoft requires it) and cancellation/refund workflow with Mysoft support.

## Required product mapping before dispatch

The current catalog stores authoritative prices but does not yet carry an
approved per-line KDV rate. The delivery worker must not infer or hard-code a
tax rate from a product name or price. Before dispatch is implemented, finance
must approve a per-SKU KDV mapping and it must be stored with the sellable
catalog data so the paid-order snapshot can preserve it.

## Configuration

These environment variables are server-only:

```dotenv
# Defaults to false. It must stay false until the sandbox acceptance test passes.
MYSOFT_INVOICING_ENABLED=false
MYSOFT_API_BASE_URL=
MYSOFT_API_BEARER_TOKEN=
MYSOFT_TENANT_IDENTIFIER_NUMBER=
```

Setting only some values cannot activate invoice dispatch. The application
requires the explicit feature flag plus every required value.

## Job lifecycle

```text
PayTR verified payment
  -> commerce_orders.PAID
  -> PENDING Mysoft invoice job (one per order)
  -> PROCESSING
  -> ISSUED
```

The Mysoft delivery worker will be added only after a sandbox API contract is
verified with Yenomi’s own account. An ambiguous provider timeout must become
`NEEDS_RECONCILIATION`, not an automatic retry, because retrying a potentially
accepted invoice can create a duplicate legal document.

Historic paid orders are intentionally not backfilled by the migration. They
must be reconciled with the financial advisor before any document is created.

## Sandbox acceptance

Before enabling production dispatch, verify all of the following with a test
payment and a dedicated Mysoft sandbox tenant:

1. The signed PayTR callback creates exactly one job for the same order.
2. The generated e-Arşiv document contains the correct issuer, buyer, line
   items, KDV, total, `PayTR` payment intermediary, payment date, website URL
   and shipping fields when the product is physical.
3. Replaying the PayTR callback does not create a second job or document.
4. A provider timeout is held for reconciliation, not retried blindly.
5. Cancellation/refund creates the legally appropriate correction flow; the
   issued invoice record is retained.
