-- Keep provider-confirmed payment commit failures observable for reconciliation.

alter table public.commerce_fulfillment_issues
  drop constraint if exists commerce_fulfillment_issues_issue_code_check;

alter table public.commerce_fulfillment_issues
  add constraint commerce_fulfillment_issues_issue_code_check
  check (issue_code in (
    'RENEWAL_ENTITLEMENT_MISSING',
    'BUSINESS_SUBSCRIPTION_MISSING',
    'INVALID_FULFILLMENT_METADATA',
    'AUTHENTICATED_CLAIM_FAILED',
    'PAID_ENTITLEMENT_MISSING',
    'PAYMENT_CALLBACK_COMMIT_FAILED'
  ));
