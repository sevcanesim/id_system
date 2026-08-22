import fs from 'node:fs';

const callback = fs.readFileSync('app/api/payments/iyzico/callback/route.ts','utf8');
const settle = fs.readFileSync('lib/payments/settle-commerce-payment.ts','utf8');
const recover = fs.readFileSync('app/api/payments/iyzico/recover/route.ts','utf8');
const paymentFlow = `${callback}\n${settle}`;
const lifecycle = fs.readFileSync('supabase/migrations/20260814120000_phase18_payment_lifecycle_lock.sql','utf8');
const reconciliation = fs.readFileSync('supabase/migrations/20260815150000_payment_entitlement_reconciliation.sql','utf8');
const acceptance = fs.readFileSync('docs/phase0/RUNTIME_ACCEPTANCE.md','utf8');

const requiredCallback = [
  'commerceAttempt.status === "PAID"',
  'process_commerce_payment_callback',
  'ALREADY_PAID',
  'PAID_REVIEW_REQUIRED',
  'finalize_authenticated_commerce_order',
  'AUTHENTICATED_CLAIM_FAILED',
  'paidSuccessRedirect',
];
for (const marker of requiredCallback) if (!paymentFlow.includes(marker)) throw new Error(`Callback hardening marker missing: ${marker}`);
if (!settle.includes('retrieveCheckout') || !recover.includes('settlePendingCommercePaymentByOrderId')) {
  throw new Error('Missed iyzico callbacks must be recoverable via retrieveCheckout settlement');
}
if (!callback.includes('verifyIyzicoCheckoutResult')) {
  throw new Error('Legacy nfc_orders callback must reuse verifyIyzicoCheckoutResult');
}
if (callback.includes('resultAmount === attempt.amount_kurus')) {
  throw new Error('Do not keep a second inline iyzico amount check in the callback route');
}

const requiredSql = [
  "where id=p_attempt_id for update",
  "where id=v_attempt.order_id for update",
  "if v_attempt.status='PAID' or v_order.status='PAID' then",
  "on conflict(order_item_id,instance_no) do nothing",
  "activation_claimed_at=coalesce(activation_claimed_at,v_now)",
  "invalidated_at=coalesce(invalidated_at,v_now)",
  "return jsonb_build_object('ok',true",
];
for (const marker of requiredSql) if (!lifecycle.includes(marker)) throw new Error(`Payment lifecycle hardening marker missing: ${marker}`);


for (const marker of [
  'repair_paid_commerce_order',
  'reconcile_paid_commerce_orders',
  'PAID_ENTITLEMENT_MISSING',
  'AUTHENTICATED_CLAIM_FAILED',
  'on conflict(order_item_id,instance_no) do nothing',
]) if (!reconciliation.includes(marker)) throw new Error(`Reconciliation hardening marker missing: ${marker}`);

if (paymentFlow.includes('if (!claim.ok) return failure("auto-claim")')) {
  throw new Error('Paid callback must not be presented as payment failure when auto-claim fails');
}

for (const marker of ['10 başarılı','5 başarısız','5 tekrar callback','5 claim-recovery']) {
  if (!acceptance.includes(marker)) throw new Error(`Runtime acceptance count missing: ${marker}`);
}

console.log('Roadmap Faz 0 payment/callback/claim hardening contract PASS.');
