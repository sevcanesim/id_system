import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const requireText = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};
const requireOneOf = (source, tokens, message) => {
  if (!tokens.some((token) => source.includes(token))) throw new Error(message);
};
const forbidText = (source, token, message) => {
  if (source.includes(token)) throw new Error(message);
};

const migration = read("supabase/migrations/20260906120000_p0_corporate_card_profile_integrity.sql");
const linkRoute = read("app/api/organizations/card-profile-link/route.ts");
const organizationProfileRoute = read("app/api/organizations/profile/route.ts");
const memberProfileRoute = read("app/api/organizations/member-profile/route.ts");
const memberStatusesRoute = read("app/api/organizations/member-card-statuses/route.ts");
const analyticsRoute = read("app/api/organizations/card-analytics/route.ts");
const publicationRoute = read("app/api/profiles/publication/route.ts");
const profileActions = read("app/hooks/useProfileCardActions.ts");
const publicProfileRepository = read("lib/repositories/public-profiles.ts");
const publicProfileMigration = read("supabase/migrations/20260906140000_private_public_profile_data_gateway.sql");
const checkoutResumeMigration = read("supabase/migrations/20260906130000_secure_checkout_resume_codes.sql");
const checkoutResumeRoute = read("app/api/commerce/checkout/resume/route.ts");
const checkoutResume = read("lib/commerce/checkout-resume.ts");
const networkingCapture = read("app/components/public/NetworkingCapture.tsx");
const networkingLeadRoute = read("app/api/networking/leads/route.ts");
const instantConnectRoute = read("app/api/networking/instant-connect/route.ts");
const middleware = read("proxy.ts");
const productionEnv = read("scripts/verify-production-env.mjs");

for (const token of [
  "CORPORATE_CARD_PROFILE_INTEGRITY_REPAIR_REQUIRED",
  "enforce_physical_card_profile_scope",
  "CARD_PROFILE_ORGANIZATION_MISMATCH",
  "link_own_corporate_card_profile",
  "PROFILE_ORGANIZATION_MISMATCH",
  "revoke insert, update, delete on table public.card_profiles",
  "grant execute on function public.link_own_corporate_card_profile",
]) {
  requireText(migration, token, `Kurumsal kart profil migration sözleşmesi eksik: ${token}`);
}

requireText(linkRoute, 'rpc("link_own_corporate_card_profile"', "Kart-profil eşleştirmesi atomik RPC kullanmalı.");
forbidText(linkRoute, '.from("physical_cards")', "Kart-profil eşleştirme route'u fiziksel kartı doğrudan güncellememeli.");

requireText(organizationProfileRoute, "canManageOrganizationLegalProfile", "Şirketin vergi ve fatura kimliği yalnız Şirket Sahibi tarafından okunabilmeli.");
requireText(organizationProfileRoute, "Resmî şirket ve fatura bilgilerine erişim yalnız Şirket Sahibine aittir.", "Şirket mali kimliği için rol reddi eksik.");

for (const [name, source] of [
  ["member profile", memberProfileRoute],
  ["member card statuses", memberStatusesRoute],
  ["card analytics", analyticsRoute],
]) {
  requireText(source, '.eq("organization_id", organizationId)', `${name} sorgusu organization_id ile daraltılmalı.`);
}
forbidText(memberStatusesRoute, 'profile.company?.toLocaleLowerCase', "Kurumsal kart durumları şirket adı eşleşmesine güvenmemeli.");
forbidText(analyticsRoute, '.ilike("company", organization.name)', "Kurumsal analitik şirket adı eşleşmesine güvenmemeli.");

requireOneOf(publicationRoute, ['.eq("user_id", identity.user.id)', '.eq("user_id", authData.user.id)'], "Yayın durumu route'u profil sahibini doğrulamalı.");
requireText(profileActions, 'fetch("/api/profiles/publication"', "Tarayıcı yayın durumu değişikliği API üzerinden gitmeli.");

forbidText(middleware, 'scope: "paytr-callback"', "İmzalı PayTR callback'i IP hız limitine takılmamalı.");
requireText(middleware, "const requestId = crypto.randomUUID();", "İstek kimliği istemci başlığından devralınmamalı.");
requireText(productionEnv, "'CRON_SECRET'", "Production release gate CRON_SECRET istemeli.");

for (const token of [
  "commerce_checkout_resume_codes",
  "code_hash text not null unique",
  "redeemed_at",
  "revoke all on public.commerce_checkout_resume_codes from public, anon, authenticated",
]) {
  requireText(checkoutResumeMigration, token, `Tek kullanımlık checkout devam kodu migration sözleşmesi eksik: ${token}`);
}
requireText(checkoutResume, "RESUME_CODE_TTL_MS = 15 * 60 * 1000", "Checkout devam kodu 15 dakika ile sınırlı kalmalı.");
requireText(checkoutResume, "createCheckoutResumeCode", "Checkout devam kodu kriptografik olarak üretilmeli.");
requireText(checkoutResumeRoute, "redeemed_at", "Checkout devam kodu atomik olarak tüketilmeli.");
requireText(checkoutResumeRoute, "NextResponse.redirect(new URL(\"/checkout\", request.url), 303)", "Checkout devamı temiz URL'ye 303 ile geçmeli.");
requireText(checkoutResumeRoute, "CHECKOUT_CONTINUATION_COOKIE", "Ödeme taslağı yalnız HttpOnly devam çereziyle okunmalı.");
forbidText(checkoutResume, "createCheckoutResumeToken", "Eski uzun ömürlü checkout bearer token'ı kaldırılmalı.");
forbidText(checkoutResumeRoute, "verifyCheckoutResumeToken", "Checkout API eski bearer token doğrulamasını kullanmamalı.");

for (const token of [
  "revoke select on public.card_profiles from public, anon",
  "revoke select on public.card_profile_slug_redirects from public, anon",
  "revoke all on function public.get_public_card_profile(text,text) from public, anon, authenticated",
]) {
  requireText(publicProfileMigration, token, `Public profil gateway migration sözleşmesi eksik: ${token}`);
}
requireText(publicProfileRepository, "getSupabaseAdminClient", "Public profil çözümü yalnız sunucu tarafında yapılmalı.");
requireText(publicProfileRepository, "card_profile_slug_redirects", "Eski slug yönlendirmesi sunucu tarafında çözülmeli.");
requireText(networkingCapture, "profilePublicId", "Public kart istemcisi dahili profil UUID'si taşımamalı.");
forbidText(networkingCapture, "targetProfileId", "Public bağlantı isteği dahili hedef profil UUID'si göndermemeli.");
requireText(networkingLeadRoute, "profilePublicId", "Lead kaydı public profil ID üzerinden çözülmeli.");
requireText(instantConnectRoute, "targetPublicId", "Instant Connect hedefini public profil ID üzerinden çözmeli.");
forbidText(instantConnectRoute, "targetProfileId", "Instant Connect istemciden dahili profil UUID'si kabul etmemeli.");

console.log("P0 corporate profile integrity contract: PASS");
