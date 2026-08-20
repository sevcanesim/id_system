import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
let failed=false; const check=(ok,label)=>{console.log(`${ok?"PASS":"FAIL"}  ${label}`); if(!ok) failed=true;};
const files=[
  "supabase/migrations/20260814120000_phase18_payment_lifecycle_lock.sql",
  "app/api/payments/iyzico/callback/route.ts",
  "app/odeme/basarili/FulfillmentReviewNotice.tsx",
  "lib/payments/reuse-open-attempt.test.ts",
  "docs/PAYMENT_LIFECYCLE_PHASE18_V25.8.59.md",
  "audit/PHASE18_PAYMENT_LIFECYCLE_AUDIT.json",
];
for(const f of files) check(fs.existsSync(f),`phase18 artifact exists: ${f}`);
const sql=read(files[0]); const cb=read(files[1]); const ui=read(files[2]); const settle=read("lib/payments/settle-commerce-payment.ts");
const paymentFlow = `${cb}\n${settle}`;
for(const [label,needle] of [
 ["fulfillment issue ledger","commerce_fulfillment_issues"],
 ["paid review outcome","PAID_REVIEW_REQUIRED"],
 ["renewal grace extension","grace_ends_at=v_new_expiry + interval '7 days'"],
 ["seat-pack reconciliation","BUSINESS_SUBSCRIPTION_MISSING"],
 ["email event contract","ORDER_READY"],
]) check(sql.includes(needle),label);
check(paymentFlow.includes('processed.outcome === "PAID_REVIEW_REQUIRED"'),"callback handles paid review without retry charge");
check(paymentFlow.includes('event_type: "ORDER_REVIEW_REQUIRED"'),"callback records review email event");
check(ui.includes("Ödeme tekrar alınmayacak"),"success UI distinguishes fulfillment review from payment failure");
const pkg=JSON.parse(read("package.json"));
const versionMatch=String(pkg.version||"").match(/^(\d+)\.(\d+)\.(\d+)/);
const versionTuple=versionMatch?versionMatch.slice(1).map(Number):[0,0,0];
check(versionTuple[0]>25||(versionTuple[0]===25&&(versionTuple[1]>8||(versionTuple[1]===8&&versionTuple[2]>=59))),"package version retains Phase 18 payment lifecycle or later");
check(pkg.scripts?.["verify:phase18:payment"]==="node scripts/verify-phase18-payment-lifecycle.mjs","phase18 verifier registered");
if(failed) process.exit(1); console.log("\nPhase 18 payment lifecycle verification passed.");
