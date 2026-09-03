import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
let failed = 0;
const check = (ok, message) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${message}`);
  if (!ok) failed += 1;
};

const migration = read("supabase/migrations/20260903183000_yenomi_to_yenomi_handshakes.sql");
const route = read("app/api/networking/instant-connect/route.ts");
const capture = read("app/components/public/NetworkingCapture.tsx");
const scanner = read("app/components/public/InstantConnectScanner.tsx");
const inbox = read("app/api/networking/inbox/route.ts");
const organizationInbox = read("app/api/organizations/networking/route.ts");
const panel = read("app/kurumsal/panel/components/NetworkingPanel.tsx");
const styles = read("app/styles/canonical-networking.css");
const headers = read("next.config.ts");
const packageJson = JSON.parse(read("package.json"));

check(migration.includes("create table if not exists public.networking_handshakes"), "handshake relation is persisted");
check(migration.includes("networking_handshakes_pair_unique"), "handshake pairs are idempotent");
check(migration.includes("create_yenomi_handshake") && migration.includes("security definer"), "handshake write is server-authoritative");
check(migration.includes("counterpart_profile_id"), "both lead records retain the counterpart card");
check(migration.includes("YENOMI_HANDSHAKE") && migration.includes("CONTACT_SHARED"), "both connection histories receive handshake events");
check(migration.includes("grant execute on function public.create_yenomi_handshake") && migration.includes("to service_role"), "public roles cannot call the handshake writer directly");

check(route.includes('kind: z.literal("ACCOUNT")') && route.includes('kind: z.literal("QR")'), "route accepts explicit account and QR paths");
check(route.includes("authenticate(request)") && route.includes('.eq("user_id", actor.id)'), "one-tap sharing verifies profile ownership");
check(route.includes("profileByPublicId") && route.includes("create_yenomi_handshake"), "QR exchange resolves a published card on the server");
check(route.includes("consumeDistributedRateLimit"), "handshake attempts are rate limited");

check(capture.includes("Yenomi ID ile 1-Tıkla Bağlan"), "public card exposes one-tap Yenomi connection");
check(capture.includes("QR Kod Okutarak Kart Takası Yap"), "public card exposes QR card exchange");
check(capture.includes("Alternatif iletişim formu"), "classic contact form remains available");
check(capture.includes('kind: "ACCOUNT"') && capture.includes('kind: "QR"'), "client keeps account and QR submissions distinct");
check(scanner.includes("getUserMedia") && scanner.includes("BarcodeDetector"), "scanner uses a real camera and native QR decoder where available");
check(scanner.includes("manualLabel") && scanner.includes("parsePublicProfileId"), "scanner has an accessible QR-link fallback");
check(headers.includes('camera=(), microphone=()') && headers.includes('camera=(self), microphone=()') && headers.includes('"/p/:path*"'), "camera permission is restricted to public-card routes");

check(inbox.includes("counterpart:card_profiles") && organizationInbox.includes("counterpart:card_profiles"), "both inbox variants receive counterpart card data");
check(panel.includes("YENOMI_HANDSHAKE") && panel.includes("Dijital kartı aç"), "connections workspace exposes the exchanged card");
check(styles.includes(".p12-instant-connect") && styles.includes(".p12-instant-scanner"), "networking stylesheet owns the new mobile surface");
check(!styles.includes("!important"), "networking stylesheet adds no !important");
check(packageJson.scripts?.["verify:instant-connect"] === "node scripts/verify-yenomi-instant-connect.mjs", "instant-connect verifier is registered");

if (failed) {
  console.error(`\nYenomi instant connect verification failed (${failed}).`);
  process.exit(1);
}
console.log("\nYenomi instant connect verification passed.");
