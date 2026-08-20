import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
let failed = 0;
const check = (ok, message) => {
  if (ok) console.log(`PASS  ${message}`);
  else {
    failed += 1;
    console.log(`FAIL  ${message}`);
  }
};

const sql = read("supabase/migrations/20260820010000_network_mail_consume.sql");
const followUp = read("lib/networking/follow-up.ts");
const org = read("app/api/organizations/networking/route.ts");
const inbox = read("app/api/networking/inbox/route.ts");
const panel = read("app/kurumsal/panel/components/NetworkingPanel.tsx");
const page = read("app/leadler/page.tsx");
const nav = read("app/components/ui/sidebar-config.ts");

check(sql.includes("consume_organization_network_mail"), "org consume RPC exists");
check(sql.includes("refund_organization_network_mail"), "org refund RPC exists");
check(sql.includes("consume_individual_network_mail"), "individual consume RPC exists");
check(sql.includes("refund_individual_network_mail"), "individual refund RPC exists");
check(sql.includes("grant execute on function public.consume_organization_network_mail") && sql.includes("to service_role"), "consume is service_role only");

const sendFn = followUp.slice(followUp.indexOf("export async function sendDebitedNetworkFollowUp"));
check(sendFn.includes("consume_organization_network_mail"), "shared sender consumes org ledger");
check(sendFn.includes("consume_individual_network_mail"), "shared sender consumes individual ledger");
check(sendFn.indexOf('rpc("consume_organization_network_mail"') < sendFn.indexOf("sendNetworkingFollowUpEmail({"), "debit happens before provider send");
check(followUp.includes("refund_organization_network_mail") && followUp.includes("refund_individual_network_mail"), "failed send refunds the consumed credit");
check(!org.includes("Mail gönderildi; kredi düşümü doğrulanamadı"), "corporate route no longer sends then CAS");
check(org.includes("sendDebitedNetworkFollowUp"), "corporate follow-up uses shared debit-first sender");
check(inbox.includes("sendDebitedNetworkFollowUp") && inbox.includes('kind: "individual"'), "individual inbox spends the premium ledger");
check(inbox.includes('.is("organization_id", null)'), "individual inbox cannot spend corporate leads");
check(page.includes('variant="individual"') && page.includes("NetworkingPanel"), "individual page reuses NetworkingPanel");
check(panel.includes('variant === "individual"'), "NetworkingPanel supports the personal inbox");
check(nav.includes('href: "/leadler"') && nav.includes('label: "Network Mail"'), "personal workspace exposes Network Mail");

if (failed) {
  console.error(`\nNetwork Mail spend verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nNetwork Mail spend verification passed.");
