import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL — ${message}`);
}

const clientRouter = read("lib/auth/account-router.ts");
const serverRouter = read("lib/auth/server-account-router.ts");
const accountPage = read("app/hesabim/page.tsx");
const checkoutRoute = read("app/api/commerce/checkout/route.ts");
const checkoutPage = read("app/checkout/page.tsx");
const resumeSecret = read("lib/commerce/checkout-resume.ts");
const resumeApi = read("app/api/commerce/checkout/resume/route.ts");
const inviteApi = read("app/api/organizations/members/bulk-invite/route.ts");
const inviteMigration = read("supabase/migrations/20260831235600_organization_invite_job_audit.sql");
const resumeMigration = read("supabase/migrations/20260901000500_checkout_resume_sessions.sql");
const provenanceMigration = read("supabase/migrations/20260901002500_physical_card_order_provenance.sql");
const cardRecovery = read("app/api/commerce/card-recovery/route.ts");
const cardRoute = read("app/c/[cardCode]/page.tsx");
const adminLink = read("app/api/admin/commerce/card-units/link/route.ts");

assert(!clientRouter.includes("/api/organizations/mine?management=true"), "client account router still performs management organization fetch");
assert(clientRouter.includes('ACCOUNT_ROUTE_SERVER = "/hesabim"'), "corporate-like client routing does not delegate to server router");
assert(serverRouter.includes('.from("organization_members")'), "server account router does not resolve active organization membership from DB");
assert(serverRouter.includes('"OWNER", "ADMIN", "HR"'), "management role set missing from server account router");
assert(!/catch\s*(?:\([^)]*\))?\s*\{[^}]*ACCOUNT_ROUTE_EMPLOYEE/s.test(serverRouter), "server router silently falls back to employee on exception");
assert(accountPage.includes("resolveServerAccountDestination"), "/hesabim is not backed by server account resolution");

const draftStart = checkoutRoute.indexOf("draft_payload:");
const draftEnd = checkoutRoute.indexOf("    }, { onConflict", draftStart);
assert(draftStart >= 0 && draftEnd > draftStart, "checkout resume snapshot block missing");
const persistedDraft = checkoutRoute.slice(draftStart, draftEnd);
assert(!persistedDraft.includes("identityNumber"), "identity number is persisted in abandoned checkout snapshot");
assert(!persistedDraft.includes("distanceSalesAccepted"), "distance-sales acceptance is persisted in abandoned checkout snapshot");
assert(!persistedDraft.includes("personalizationAccepted"), "personalization acceptance is persisted in abandoned checkout snapshot");
assert(checkoutPage.includes('identityNumber: ""'), "checkout restore does not clear identity number");
assert(checkoutPage.includes("distanceSalesAccepted: false") && checkoutPage.includes("personalizationAccepted: false"), "checkout restore does not require fresh legal acceptance");
assert(resumeSecret.includes("CHECKOUT_RESUME_SECRET"), "checkout resume does not use a dedicated signing secret");
assert(!resumeSecret.includes("SUPABASE_SERVICE_ROLE_KEY"), "checkout resume signing is coupled to the Supabase service-role key");
assert(resumeApi.includes('status !== "AWAITING_PAYMENT"'), "resume API allows non-awaiting orders to restore");
assert(resumeMigration.includes("commerce_checkout_sessions"), "checkout resume storage migration missing");

assert(inviteMigration.includes("organization_invite_jobs") && inviteMigration.includes("organization_invite_logs"), "durable bulk invite ledger migration missing");
assert(inviteApi.includes("persistRowLog") && inviteApi.includes("failedRowsCsvUrl"), "bulk invite API does not persist row outcomes and expose failure report");

assert(provenanceMigration.includes("physical_card_id"), "production unit to physical card provenance migration missing");
assert(adminLink.includes("PHYSICAL_CARD_PROVENANCE_LINKED"), "admin provenance link is not audited");
assert(cardRecovery.includes('card.status !== "UNASSIGNED"'), "card recovery is not restricted to unassigned physical cards");
assert(cardRecovery.includes("commerce_physical_card_units") && cardRecovery.includes("order_item_id"), "card recovery bypasses production/order provenance");
assert(!cardRecovery.includes("owner_user_id:") && !cardRecovery.includes("owner_profile_id:"), "public recovery route directly assigns physical-card ownership");
assert(cardRoute.includes("card.status === \"UNASSIGNED\"") && cardRoute.includes("CardRecoveryAction"), "physical card route does not limit recovery affordance to unassigned cards");

const paths = [
  "lib/auth/account-router.ts",
  "lib/auth/server-account-router.ts",
  "app/hesabim/page.tsx",
  "app/api/commerce/checkout/route.ts",
  "app/checkout/page.tsx",
  "app/api/commerce/card-recovery/route.ts",
  "app/api/organizations/members/bulk-invite/route.ts",
];
for (const path of paths) {
  const source = read(path);
  assert(!source.includes("<<<<<<<") && !source.includes(">>>>>>>"), `merge conflict marker remains in ${path}`);
}

assert(!fs.existsSync(".github/workflows/resilience-codemod.yml"), "temporary write-permission codemod workflow still exists");
console.log("PASS — account and commerce resilience contracts verified");
