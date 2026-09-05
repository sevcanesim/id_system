import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  DEMO_CORPORATE_CAPACITY_SCENARIOS as corporateScenarios,
  DEMO_GUEST_ORDERS as guestOrders,
  DEMO_IDENTITY_COLLISION as identityCollision,
  DEMO_INVITE_FIXTURES as inviteFixtures,
  DEMO_LOGIN_USERS as demoUsers,
} from "../tests/fixtures/demo-user-matrix.mjs";

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(fs.readFileSync(filePath, "utf8").split(/\r?\n/).flatMap((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return [];
    const index = line.indexOf("=");
    let value = line.slice(index + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    return [[line.slice(0, index).trim(), value]];
  }));
}

const env = { ...readEnv(path.resolve(".env.local")), ...process.env };
const apply = process.argv.includes("--apply");
const allowNonEmpty = process.argv.includes("--allow-non-empty");
const resetDemo = process.argv.includes("--reset-demo");
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const password = env.DEMO_SEED_PASSWORD;

if (!url || !serviceKey) throw new Error("Supabase URL ve service role/secret key gerekli.");
if (apply && (!password || password.length < 12)) throw new Error("--apply için en az 12 karakterli DEMO_SEED_PASSWORD gerekli.");

function isLocalSupabaseUrl(targetUrl) {
  try {
    const host = new URL(targetUrl).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

if (apply) {
  const local = isLocalSupabaseUrl(url);
  if (local) {
    if (env.ALLOW_LOCAL_DEMO_SEED !== "true") {
      throw new Error("Local demo seed yalnız 127.0.0.1/localhost için çalışır: ALLOW_LOCAL_DEMO_SEED=true gerekli.");
    }
  } else {
    const stagingRef = String(env.STAGING_SUPABASE_PROJECT_REF || "").trim();
    const productionRef = String(env.PRODUCTION_SUPABASE_PROJECT_REF || "").trim();
    const urlRef = String(url).match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i)?.[1] || "";
    if (env.ALLOW_STAGING_MUTATIONS !== "true") {
      throw new Error("Demo seed yalnız izole staging için çalışır: ALLOW_STAGING_MUTATIONS=true gerekli.");
    }
    if (!stagingRef || urlRef !== stagingRef) {
      throw new Error("Demo seed engellendi: Supabase URL, STAGING_SUPABASE_PROJECT_REF ile eşleşmiyor.");
    }
    if (productionRef && stagingRef === productionRef) {
      throw new Error("Demo seed engellendi: staging ve production project ref aynı olamaz.");
    }
  }
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

if (!apply) {
  console.log("DRY RUN — hiçbir kayıt yazılmadı. Oluşturulacak ana kullanıcılar:");
  for (const user of demoUsers) console.log(`- ${user.email} (${user.kind})`);
  for (const guest of guestOrders) console.log(`- ${guest.email} (${guest.kind}, Auth user yok)`);
  for (const scenario of corporateScenarios) console.log(`- ${scenario.name}: ${scenario.used}/${scenario.limit} koltuk, ${scenario.limit - scenario.used} boş`);
  if (resetDemo) console.log("--reset-demo seçildi: apply sırasında tüm TEST / @yenomi.test demo kayıtları ve bağlı demo verisi silinip kanonik set yeniden kurulacak.");
  console.log("Uygulamak için: DEMO_SEED_PASSWORD='...' npm run seed:demo -- --apply --reset-demo");
  process.exit(0);
}

async function assertSchema() {
  for (const table of ["admin_users", "admin_access_grants", "admin_audit_log", "products", "product_variants", "commerce_orders", "commerce_order_items", "entitlements", "card_profiles", "business_plans", "organizations", "organization_members", "organization_subscriptions", "commerce_order_consents", "user_accounts", "physical_cards", "commerce_physical_card_units", "organization_invites", "organization_invite_job_audit", "organization_card_templates", "card_view_events", "activation_tokens", "commerce_invoice_jobs", "individual_network_mail_credit_grants", "organization_network_mail_credit_grants", "profile_custom_url_entitlements", "organization_audit_events", "network_mail_adjustment_ledger", "system_error_logs"]) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    if (error) throw new Error(`Migration eksik (${table}): ${error.message}`);
  }
}

function isDemoTestEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return normalized.endsWith("@yenomi.test");
}

async function listAllAuthUsers() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 200) return all;
  }
}

function isMissingOptionalTable(error) {
  return /Could not find the table .* in the schema cache/i.test(String(error?.message || error));
}

async function deleteByIds(table, column, ids, { optional = false } = {}) {
  if (!ids.length) return;
  const { error } = await supabase.from(table).delete().in(column, ids);
  if (error && optional && isMissingOptionalTable(error)) {
    console.log(`Opsiyonel demo geçmiş tablosu yok, atlandı: ${table}`);
    return;
  }
  if (error) throw new Error(`${table}.${column} demo temizliği başarısız: ${error.message}`);
}

async function resetDemoFixtures(allAuthUsers) {
  // Test kimliği iki bağımsız işaretle tanınır: test domain'i ve persisted
  // TEST account_type. Böylece eskiden farklı adlandırılmış fixture'lar da
  // kalmaz; gerçek domain ve gerçek kullanıcılar kapsama girmez.
  const testAccountsResult = await supabase.from("user_accounts").select("id,email").eq("account_type", "TEST");
  if (testAccountsResult.error) throw testAccountsResult.error;
  const demoUserIdSet = new Set([
    ...(testAccountsResult.data || []).map((account) => account.id),
    ...allAuthUsers.filter((user) => isDemoTestEmail(user.email)).map((user) => user.id),
  ]);
  const demoUserIds = [...demoUserIdSet];
  const demoAuthUsers = allAuthUsers.filter((user) => demoUserIdSet.has(user.id));

  const [orgResult, membersResult] = await Promise.all([
    supabase.from("organizations").select("id,slug,name"),
    supabase.from("organization_members").select("id,organization_id,user_id,email"),
  ]);
  if (orgResult.error) throw orgResult.error;
  if (membersResult.error) throw membersResult.error;
  const membersByOrganization = new Map();
  for (const member of membersResult.data || []) {
    const current = membersByOrganization.get(member.organization_id) || [];
    current.push(member);
    membersByOrganization.set(member.organization_id, current);
  }
  const demoOrganizations = (orgResult.data || []).filter((organization) => {
    const members = membersByOrganization.get(organization.id) || [];
    // Görünür şirket adı serbest metindir; gerçek bir "QA" ya da "Test"
    // kelimesi yüzünden silme kapsamına girmemelidir. Yalnız fixture slug'ı
    // veya tamamı test kimliklerinden oluşan tenant güvenilir işarettir.
    const markedFixtureSlug = /^(demo|test|qa)[-_]/i.test(organization.slug);
    const allMembersAreTest = members.length > 0 && members.every((member) =>
      demoUserIdSet.has(member.user_id) || isDemoTestEmail(member.email)
    );
    return markedFixtureSlug || allMembersAreTest;
  });
  const demoOrganizationIds = demoOrganizations.map((organization) => organization.id);
  const demoMemberIds = (membersResult.data || [])
    .filter((member) => demoOrganizationIds.includes(member.organization_id) || demoUserIdSet.has(member.user_id) || isDemoTestEmail(member.email))
    .map((member) => member.id);

  const [profilesResult, cardsResult, ordersResult, entitlementsResult] = await Promise.all([
    supabase.from("card_profiles").select("id,user_id,organization_id"),
    supabase.from("physical_cards").select("id,owner_user_id,owner_profile_id,organization_id,entitlement_id,replaced_by_card_id"),
    supabase.from("commerce_orders").select("id,user_id,guest_email"),
    supabase.from("entitlements").select("id,user_id,order_item_id"),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (entitlementsResult.error) throw entitlementsResult.error;

  const demoProfiles = (profilesResult.data || []).filter((profile) => demoUserIds.includes(profile.user_id) || demoOrganizationIds.includes(profile.organization_id));
  const demoProfileIds = demoProfiles.map((profile) => profile.id);
  const demoCards = (cardsResult.data || []).filter((card) =>
    demoUserIds.includes(card.owner_user_id) || demoProfileIds.includes(card.owner_profile_id) || demoOrganizationIds.includes(card.organization_id)
  );
  const demoCardIds = demoCards.map((card) => card.id);
  const demoOrders = (ordersResult.data || []).filter((order) => demoUserIds.includes(order.user_id) || isDemoTestEmail(order.guest_email));
  const demoOrderIds = demoOrders.map((order) => order.id);

  let demoOrderItemIds = [];
  if (demoOrderIds.length) {
    const itemsResult = await supabase.from("commerce_order_items").select("id").in("order_id", demoOrderIds);
    if (itemsResult.error) throw itemsResult.error;
    demoOrderItemIds = (itemsResult.data || []).map((item) => item.id);
  }
  const demoEntitlementIds = (entitlementsResult.data || [])
    .filter((entitlement) => demoUserIdSet.has(entitlement.user_id) || demoOrderItemIds.includes(entitlement.order_item_id))
    .map((entitlement) => entitlement.id);

  console.log(`Demo reset kapsamı: ${demoAuthUsers.length} Auth kullanıcısı, ${demoOrganizations.length} organizasyon, ${demoMemberIds.length} üyelik/davet, ${demoOrders.length} sipariş, ${demoCards.length} fiziksel kart.`);

  // Restrict ilişkileri önce kaldırılır. Bu fonksiyon yalnızca --reset-demo
  // ile ve staging/local korumaları geçtikten sonra çalışır.
  const optionalHistory = { optional: true };
  await deleteByIds("profile_custom_url_entitlements", "order_item_id", demoOrderItemIds, optionalHistory);
  await deleteByIds("profile_custom_url_entitlements", "profile_id", demoProfileIds, optionalHistory);
  await deleteByIds("individual_network_mail_credit_grants", "order_item_id", demoOrderItemIds, optionalHistory);
  await deleteByIds("individual_network_mail_credit_grants", "user_id", demoUserIds, optionalHistory);
  await deleteByIds("individual_network_mail_credit_grants", "entitlement_id", demoEntitlementIds, optionalHistory);
  await deleteByIds("organization_network_mail_credit_grants", "order_item_id", demoOrderItemIds, optionalHistory);
  await deleteByIds("commerce_invoice_jobs", "order_id", demoOrderIds, optionalHistory);
  await deleteByIds("organization_network_mail_credit_grants", "organization_id", demoOrganizationIds, optionalHistory);
  // organization_links silinirken sürüm trigger'ı yeni bir geçmiş satırı
  // üretir. Önce önceki geçmişi, sonra bağlantıyı, ardından trigger'ın
  // ürettiği son geçmişi kaldırmak organizasyon silme sırasını korur.
  await deleteByIds("organization_link_versions", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("organization_links", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("organization_link_versions", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("organization_audit_events", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("organization_invite_job_audit", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("organization_invite_job_audit", "actor_user_id", demoUserIds, optionalHistory);
  await deleteByIds("network_mail_adjustment_ledger", "user_id", demoUserIds, optionalHistory);
  await deleteByIds("network_mail_adjustment_ledger", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("network_mail_adjustment_ledger", "entitlement_id", demoEntitlementIds, optionalHistory);
  await deleteByIds("system_error_logs", "user_id", demoUserIds, optionalHistory);
  await deleteByIds("system_error_logs", "organization_id", demoOrganizationIds, optionalHistory);
  await deleteByIds("admin_audit_log", "actor_user_id", demoUserIds, optionalHistory);
  await deleteByIds("admin_access_grants", "user_id", demoUserIds);
  await deleteByIds("admin_access_grants", "organization_id", demoOrganizationIds);

  // Test super-admin'in gerçek bir hesaba erişim tanımladığı olağandışı bir
  // kayıt varsa sessizce silmeyiz: temizliği durdurup operatöre bildiririz.
  if (demoUserIds.length) {
    const externalGrantResult = await supabase.from("admin_access_grants").select("id").or(
      `created_by.in.(${demoUserIds.join(",")}),revoked_by.in.(${demoUserIds.join(",")})`
    );
    if (externalGrantResult.error) throw externalGrantResult.error;
    if ((externalGrantResult.data || []).length) {
      throw new Error("Demo super-admin tarafından gerçek hesaba verilmiş erişim kaydı bulundu. Bu kayıtlar manuel olarak gerçek bir operatöre devredilmeden demo temizliği tamamlanamaz.");
    }
  }

  if (demoCardIds.length) {
    const { error: unitsError } = await supabase.from("commerce_physical_card_units").update({ physical_card_id: null }).in("physical_card_id", demoCardIds);
    if (unitsError) throw unitsError;
    const unpin = await supabase.from("physical_cards").update({ replaced_by_card_id: null }).in("replaced_by_card_id", demoCardIds);
    if (unpin.error) throw unpin.error;
    await deleteByIds("physical_cards", "id", demoCardIds);
  }
  await deleteByIds("card_profiles", "id", demoProfileIds);
  await deleteByIds("commerce_orders", "id", demoOrderIds);
  await deleteByIds("organization_members", "id", demoMemberIds);
  await deleteByIds("organizations", "id", demoOrganizationIds);

  for (const user of demoAuthUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Demo Auth kullanıcısı silinemedi (${user.email}): ${error.message}`);
  }
}

await assertSchema();
let listed = await listAllAuthUsers();
if (resetDemo) {
  await resetDemoFixtures(listed);
  listed = await listAllAuthUsers();
}
const foreignUsers = listed.filter((user) => !user.email?.endsWith("@yenomi.test"));
if (foreignUsers.length && !allowNonEmpty) {
  throw new Error(`DB boş değil: ${foreignUsers.length} demo dışı Auth kullanıcısı var. Bilerek devam için --allow-non-empty kullan.`);
}

const authByEmail = new Map(listed.map((user) => [user.email?.toLowerCase(), user]));
const users = {};
for (const spec of demoUsers) {
  let user = authByEmail.get(spec.email.toLowerCase());
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: spec.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: spec.name, demo_scenario: spec.kind },
    });
    if (error || !data.user) throw new Error(`Auth user oluşturulamadı (${spec.email}): ${error?.message}`);
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, full_name: spec.name, demo_scenario: spec.kind },
    });
    if (error || !data.user) throw new Error(`Demo Auth user güncellenemedi (${spec.email}): ${error?.message}`);
    user = data.user;
  }
  users[spec.key] = user;
}

for (const spec of demoUsers) {
  await supabase.from("user_accounts").update({ account_type: "TEST", test_login_scope: spec.loginScope }).eq("id", users[spec.key].id).throwOnError();
}

for (const spec of demoUsers.filter((u) => u.isAdmin)) {
  await supabase.from("admin_users").upsert({ user_id: users[spec.key].id }, { onConflict: "user_id" }).throwOnError();
}

// Demo verisi ticari kataloğu asla değiştirmez. Varyantlar ve planlar önce
// ortamın gerçek katalog verisinden doğrulanır; fiyatlar yalnızca oradan okunur.
const requiredVariantSkus = new Set([
  "YENOMI-NFC-CARD-ANNUAL",
  "YENOMI-NFC-PREMIUM-ANNUAL",
  ...guestOrders.map((order) => order.variantSku),
]);
const variantsResult = await supabase.from("product_variants").select("id,sku,product_id,price_kurus").in("sku", [...requiredVariantSkus]);
if (variantsResult.error) throw variantsResult.error;
const catalogVariants = new Map((variantsResult.data || []).map((variant) => [variant.sku, variant]));
for (const sku of requiredVariantSkus) {
  if (!catalogVariants.has(sku)) throw new Error(`Demo seed için aktif katalog varyantı eksik: ${sku}`);
}
const baseVariant = catalogVariants.get("YENOMI-NFC-CARD-ANNUAL");
const { data: product, error: productError } = await supabase.from("products").select("id,slug,name,kind").eq("id", baseVariant.product_id).single();
if (productError) throw productError;

const requiredPlanCodes = new Set(["CORP-50", ...corporateScenarios.map((scenario) => scenario.plan), "CORP-5", "CORP-10"]);
const plansResult = await supabase.from("business_plans").select("id,code").in("code", [...requiredPlanCodes]);
if (plansResult.error) throw plansResult.error;
const catalogPlans = new Map((plansResult.data || []).map((plan) => [plan.code, plan]));
for (const code of requiredPlanCodes) {
  if (!catalogPlans.has(code)) throw new Error(`Demo seed için kurumsal plan eksik: ${code}`);
}

async function seedIndividualUser(spec) {
  if (!spec.orderNumber && !spec.entitlement && !spec.profile) return;
  const user = users[spec.key];
  const now = new Date();
  const entitlementStatus = spec.entitlement?.status || "ACTIVE";
  const isExpired = entitlementStatus === "EXPIRED";
  const starts = isExpired ? new Date(now.getTime() - 400 * 86400000) : now;
  const expires = isExpired ? new Date(now.getTime() - 35 * 86400000) : new Date(now.getTime() + 365 * 86400000);
  const grace = isExpired ? new Date(now.getTime() - 28 * 86400000) : new Date(now.getTime() + 372 * 86400000);
  const variantSku = spec.entitlement?.variantSku || "YENOMI-NFC-CARD-ANNUAL";

  const { data: chosenVariant, error: chosenVariantError } = await supabase.from("product_variants").select("id,sku,price_kurus,billing_period").eq("sku", variantSku).single();
  if (chosenVariantError) throw chosenVariantError;

  const orderPayload = {
    order_number: spec.orderNumber || `YI-DEMO-${spec.key.toUpperCase()}`,
    user_id: user.id,
    guest_email: user.email,
    status: "PAID",
    currency: "TRY",
    subtotal_kurus: chosenVariant.price_kurus,
    shipping_kurus: 0,
    total_kurus: chosenVariant.price_kurus,
    customer_name: user.user_metadata.full_name,
    customer_phone: "+905550000000",
    country_code: "TR",
    paid_at: now.toISOString(),
    activation_claimed_at: now.toISOString(),
  };
  const { data: order, error: orderError } = await supabase.from("commerce_orders").upsert(orderPayload, { onConflict: "order_number" }).select("id").single();
  if (orderError) throw orderError;

  let { data: item } = await supabase.from("commerce_order_items").select("id").eq("order_id", order.id).limit(1).maybeSingle();
  const itemPayload = {
    order_id: order.id,
    product_id: product.id,
    variant_id: chosenVariant.id,
    product_kind: product.kind,
    product_name: product.name,
    unit_price_kurus: chosenVariant.price_kurus,
    quantity: 1,
    configuration: {
      sku: chosenVariant.sku,
      demo: true,
      ...(chosenVariant.sku === "YENOMI-NFC-PREMIUM-ANNUAL" ? { package_code: "INDIVIDUAL_PREMIUM" } : {}),
    },
  };
  if (!item) {
    const inserted = await supabase.from("commerce_order_items").insert(itemPayload).select("id").single();
    if (inserted.error) throw inserted.error;
    item = inserted.data;
  } else {
    await supabase.from("commerce_order_items").update(itemPayload).eq("id", item.id).throwOnError();
  }

  const { data: entitlement, error: entitlementError } = await supabase.from("entitlements").upsert({
    user_id: user.id,
    order_item_id: item.id,
    instance_no: 1,
    kind: "NFC_PHYSICAL_CARD",
    status: entitlementStatus,
    starts_at: starts.toISOString(),
    expires_at: expires.toISOString(),
    grace_ends_at: grace.toISOString(),
  }, { onConflict: "order_item_id,instance_no" }).select("id").single();
  if (entitlementError) throw entitlementError;

  await supabase.from("commerce_order_consents").upsert({ order_id: order.id, distance_sales_accepted: true, personalization_accepted: true, distance_sales_version: "2026-08-07", personalization_version: "2026-08-07", privacy_version: "2026-08-07", request_id: "DEMO-SEED" }, { onConflict: "order_id" }).throwOnError();

  let profile = null;
  if (spec.profile) {
    const lost = spec.cards?.some((card) => card.status === "LOST");
    const safeSlug = spec.profile.slug || `demo-${user.email.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const profilePayload = {
      user_id: user.id,
      entitlement_id: entitlement.id,
      slug: safeSlug,
      name: spec.profile.name || user.user_metadata.full_name || "Demo Kullanıcı",
      role: "Demo Kullanıcı",
      company: "Yenomi Demo",
      phone: "+90 555 000 00 01",
      email: user.email,
      website: "https://yenomilabs.com",
      location: "İstanbul, Türkiye",
      is_published: spec.profile.isPublished !== false,
      card_status: lost ? "LOST" : spec.profile.cardStatus || "ACTIVE",
    };
    const existingProfile = await supabase.from("card_profiles").select("id").eq("entitlement_id", entitlement.id).maybeSingle();
    if (existingProfile.error) throw existingProfile.error;
    if (existingProfile.data) {
      const updated = await supabase.from("card_profiles").update(profilePayload).eq("id", existingProfile.data.id).select("id").single();
      if (updated.error) throw updated.error;
      profile = updated.data;
    } else {
      const inserted = await supabase.from("card_profiles").insert(profilePayload).select("id").single();
      if (inserted.error) throw inserted.error;
      profile = inserted.data;
    }
  }

  if (profile && spec.cards?.length) {
    for (const [index, card] of spec.cards.entries()) {
      const existingCard = await supabase.from("physical_cards").select("id").eq("card_code", card.code).maybeSingle();
      if (existingCard.error) throw existingCard.error;
      const cardPayload = {
        owner_profile_id: profile.id,
        owner_user_id: user.id,
        organization_id: null,
        entitlement_id: index === 0 ? entitlement.id : null,
        activated_at: now.toISOString(),
        status: card.status,
      };
      if (!existingCard.data) {
        await supabase.from("physical_cards").insert({ card_code: card.code, ...cardPayload }).throwOnError();
      } else {
        await supabase.from("physical_cards").update(cardPayload).eq("id", existingCard.data.id).throwOnError();
      }
    }
  }
}

async function enforceRegisteredOnlyDemoUser(spec) {
  const user = users[spec.key];
  if (!user) throw new Error(`Kayıtlı-only demo kullanıcı bulunamadı: ${spec.key}`);

  // This fixture intentionally represents a portal registration only. Clear only
  // records owned by this exact demo user so repeatable QA seeds cannot leave a
  // prior purchase, entitlement, profile, or physical card behind.
  await supabase.from("physical_cards").delete().eq("owner_user_id", user.id).throwOnError();
  await supabase.from("card_profiles").delete().eq("user_id", user.id).throwOnError();
  await supabase.from("entitlements").delete().eq("user_id", user.id).throwOnError();
  await supabase.from("commerce_orders").delete().eq("user_id", user.id).throwOnError();
}

// Seed individual users from canonical matrix
for (const spec of demoUsers.filter((user) => user.kind === "INDIVIDUAL_REGISTERED")) {
  await enforceRegisteredOnlyDemoUser(spec);
}

const individualUsers = demoUsers.filter((u) => u.loginScope === "INDIVIDUAL" && (u.orderNumber || u.entitlement || u.profile));
for (const spec of individualUsers) {
  await seedIndividualUser(spec);
}

async function ensureOrganization({ slug, name, status = "ACTIVE" }) {
  const existing = await supabase.from("organizations").select("id,name").eq("slug", slug).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const updated = await supabase.from("organizations").update({ name, status }).eq("id", existing.data.id).select("id,name").single();
    if (updated.error) throw updated.error;
    return updated.data;
  }
  const allocated = await supabase.rpc("allocate_corporate_id");
  if (allocated.error) throw allocated.error;
  const inserted = await supabase.from("organizations").insert({ slug, name, status, corporate_id: allocated.data }).select("id,name").single();
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

async function ensureCorporateDemoProfile(user, organization, slug, title = "Demo Çalışan", isPublished = true, cardStatus = "ACTIVE") {
  const payload = {
    user_id: user.id,
    slug,
    name: user.user_metadata?.full_name || user.email,
    role: title,
    company: organization.name,
    organization_id: organization.id,
    email: user.email,
    phone: "+90 555 000 00 01",
    linkedin: null,
    instagram: null,
    website: "https://yenomilabs.com",
    location: "İstanbul, Türkiye",
    is_published: isPublished,
    card_status: cardStatus,
  };
  const existing = await supabase.from("card_profiles").select("id").eq("user_id", user.id).eq("company", organization.name).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const updated = await supabase.from("card_profiles").update(payload).eq("id", existing.data.id).select("id").single();
    if (updated.error) throw updated.error;
    return updated.data;
  } else {
    const inserted = await supabase.from("card_profiles").insert(payload).select("id").single();
    if (inserted.error) throw inserted.error;
    return inserted.data;
  }
}

// Seed corporate capacity scenarios
for (const scenario of corporateScenarios) {
  const owner = users[scenario.owner];
  const { data: plan, error: planError } = await supabase.from("business_plans").select("id").eq("code", scenario.plan).single();
  if (planError) throw planError;
  const organization = await ensureOrganization({ slug: scenario.slug, name: scenario.name });
  await supabase.from("organization_members").upsert({ organization_id: organization.id, user_id: owner.id, email: owner.email, full_name: owner.user_metadata.full_name, title: "Şirket Sahibi", department: "Yönetim", role: "OWNER", status: "ACTIVE" }, { onConflict: "organization_id,email" }).throwOnError();
  await ensureCorporateDemoProfile(owner, organization, `${scenario.slug}-yonetici`, "Şirket Sahibi");
  const existingSubscription = await supabase.from("organization_subscriptions").select("id").eq("organization_id", organization.id).in("status", ["ACTIVE", "GRACE_PERIOD"]).limit(1).maybeSingle();
  const subscriptionPayload = { organization_id: organization.id, plan_id: plan.id, status: "ACTIVE", starts_at: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), seat_limit: scenario.limit };
  if (existingSubscription.data) await supabase.from("organization_subscriptions").update(subscriptionPayload).eq("id", existingSubscription.data.id).throwOnError();
  else await supabase.from("organization_subscriptions").insert(subscriptionPayload).throwOnError();
  for (let index = 2; index <= scenario.used; index += 1) {
    const workerEmail = `koltuk${index}.${scenario.slug}@yenomi.test`;
    // Kapasite testindeki koltuklar giriş hesabı değildir. Böylece matriste
    // görünmeyen kullanıcı hesapları üretmeden gerçek seat-reservation
    // davranışını (INVITED de lisans tüketir) sınarız.
    await supabase.from("organization_members").upsert({
      organization_id: organization.id,
      user_id: null,
      email: workerEmail,
      full_name: `Demo Koltuk ${index}`,
      title: "Davet bekliyor",
      department: index % 2 ? "Satış" : "Operasyon",
      role: "EMPLOYEE",
      status: "INVITED",
    }, { onConflict: "organization_id,email" }).throwOnError();
  }

  const activityMembers = [
    { email: owner.email, hoursAgo: 2 },
    ...Array.from({ length: Math.max(0, scenario.used - 1) }, (_, offset) => ({
      email: `koltuk${offset + 2}.${scenario.slug}@yenomi.test`,
      hoursAgo: 24 * (offset + 1),
    })),
  ];
  for (const activity of activityMembers) {
    await supabase
      .from("organization_members")
      .update({ last_activity_at: new Date(Date.now() - activity.hoursAgo * 3600000).toISOString() })
      .eq("organization_id", organization.id)
      .eq("email", activity.email)
      .throwOnError();
  }
}

// Deterministic end-to-end QA organization driven from canonical DEMO_LOGIN_USERS
{
  const plan = catalogPlans.get("CORP-50");
  const qaOrg = await ensureOrganization({ slug: "demo-qa-uctan-uca", name: "Demo Şirket / Uçtan Uca QA" });
  const existingSub = await supabase.from("organization_subscriptions").select("id").eq("organization_id", qaOrg.id).limit(1).maybeSingle();
  const subPayload = { organization_id: qaOrg.id, plan_id: plan.id, status: "ACTIVE", starts_at: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), seat_limit: 50 };
  if (existingSub.data) await supabase.from("organization_subscriptions").update(subPayload).eq("id", existingSub.data.id).throwOnError();
  else await supabase.from("organization_subscriptions").insert(subPayload).throwOnError();

  const qaOrgUsers = demoUsers.filter((u) => u.organizationSlug === "demo-qa-uctan-uca");
  for (const spec of qaOrgUsers) {
    const user = users[spec.key];
    await supabase.from("organization_members").upsert({
      organization_id: qaOrg.id,
      user_id: user.id,
      email: user.email,
      full_name: user.name,
      title: spec.title,
      department: spec.department,
      role: spec.role || "EMPLOYEE",
      status: spec.status || "ACTIVE",
    }, { onConflict: "organization_id,email" }).throwOnError();

    let profile = null;
    if (spec.profile) {
      profile = await ensureCorporateDemoProfile(user, qaOrg, spec.profile.slug, spec.title, spec.profile.isPublished !== false, spec.profile.cardStatus || "ACTIVE");
    }

    if (profile && spec.cards?.length) {
      for (const card of spec.cards) {
        const existingCard = await supabase.from("physical_cards").select("id").eq("card_code", card.code).maybeSingle();
        if (existingCard.error) throw existingCard.error;
        const cardPayload = {
          owner_profile_id: profile.id,
          owner_user_id: user.id,
          organization_id: qaOrg.id,
          activated_at: new Date().toISOString(),
          status: card.status,
        };
        if (!existingCard.data) {
          await supabase.from("physical_cards").insert({ card_code: card.code, ...cardPayload }).throwOnError();
        } else {
          await supabase.from("physical_cards").update(cardPayload).eq("id", existingCard.data.id).throwOnError();
        }
      }
    }
  }

  // Active invite fixture
  const activeInvite = inviteFixtures.find((i) => i.kind === "INVITE_PENDING");
  if (activeInvite) {
    const { data: invitedMember, error: invitedError } = await supabase.from("organization_members").upsert({
      organization_id: qaOrg.id, email: activeInvite.email, full_name: "Davet Bekleyen Çalışan",
      title: activeInvite.title, department: activeInvite.department, role: activeInvite.role, status: activeInvite.status,
    }, { onConflict: "organization_id,email" }).select("id").single();
    if (invitedError) throw invitedError;
    await supabase.from("organization_invites").delete().eq("member_id", invitedMember.id).is("used_at", null);
    await supabase.from("organization_invites").insert({
      organization_id: qaOrg.id, member_id: invitedMember.id,
      token_hash: "qa-invite-active-" + invitedMember.id.replaceAll("-", ""),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).throwOnError();
  }

  // Expired and revoked invitation edge cases from DEMO_INVITE_FIXTURES
  for (const inviteCase of inviteFixtures.filter((i) => i.isExpired || i.isRevoked)) {
    const row = await supabase.from("organization_members").upsert({
      organization_id: qaOrg.id, email: inviteCase.email, full_name: inviteCase.intent,
      title: inviteCase.title, department: inviteCase.department, role: inviteCase.role, status: inviteCase.status,
    }, { onConflict: "organization_id,email" }).select("id").single();
    if (row.error) throw row.error;
    await supabase.from("organization_invites").delete().eq("member_id", row.data.id);
    await supabase.from("organization_invites").insert({
      organization_id: qaOrg.id, member_id: row.data.id,
      token_hash: `qa-${inviteCase.isExpired ? "expired" : "revoked"}-` + row.data.id.replaceAll("-", ""),
      expires_at: new Date(Date.now() + (inviteCase.isExpired ? -1 : 7) * 86400000).toISOString(),
      revoked_at: inviteCase.isRevoked ? new Date().toISOString() : null,
    }).throwOnError();
  }

  // Replacement case: old LOST card permanently points to the new ACTIVE card.
  const assignedProfile = await supabase.from("card_profiles").select("id").eq("slug", "qa-trassigned").single();
  const assignedUser = users.trAssigned;
  if (assignedProfile.data && assignedUser) {
    const oldReplacement = await supabase.from("physical_cards").select("id").eq("card_code", "YN-TRREPOLD0001").maybeSingle();
    let oldId = oldReplacement.data?.id;
    if (!oldId) {
      const insertedOld = await supabase.from("physical_cards").insert({
        card_code: "YN-TRREPOLD0001", owner_profile_id: assignedProfile.data.id, owner_user_id: assignedUser.id,
        organization_id: qaOrg.id, activated_at: new Date().toISOString(), status: "LOST",
      }).select("id").single();
      if (insertedOld.error) throw insertedOld.error;
      oldId = insertedOld.data.id;
    }
    const newReplacement = await supabase.from("physical_cards").select("id").eq("card_code", "YN-TRREPNEW0001").maybeSingle();
    let newId = newReplacement.data?.id;
    if (!newId) {
      const insertedNew = await supabase.from("physical_cards").insert({
        card_code: "YN-TRREPNEW0001", owner_profile_id: assignedProfile.data.id, owner_user_id: assignedUser.id,
        organization_id: qaOrg.id, activated_at: new Date().toISOString(), status: "ACTIVE",
      }).select("id").single();
      if (insertedNew.error) throw insertedNew.error;
      newId = insertedNew.data.id;
    }
    const oldState = await supabase.from("physical_cards").select("replaced_by_card_id").eq("id", oldId).single();
    if (oldState.error) throw oldState.error;
    if (!oldState.data.replaced_by_card_id) {
      const rpc = await supabase.rpc("replace_physical_card", { p_old_card_id: oldId, p_new_card_id: newId });
      if (rpc.error) throw rpc.error;
    }
  }

  // Same-name identity pair from DEMO_IDENTITY_COLLISION
  for (const suffix of identityCollision.suffixes) {
    await supabase.from("organization_members").upsert({
      organization_id: qaOrg.id,
      email: `${identityCollision.emailPrefix}${suffix}@yenomi.test`,
      full_name: identityCollision.displayName,
      title: suffix === "a" ? "Satış Uzmanı" : "Operasyon Uzmanı",
      department: suffix === "a" ? "Satış" : "Operasyon",
      role: "EMPLOYEE",
      status: "INVITED",
    }, { onConflict: "organization_id,email" }).throwOnError();
  }

  // Duplicate-email is a procedure against the existing digital-card fixture.

  // Unassigned physical stock on the org the Turkish owner actually opens.
  for (const code of ["YN-QASTOCK0001A", "YN-QASTOCK0002A"]) {
    const stock = await supabase.from("physical_cards").select("id").eq("card_code", code).maybeSingle();
    if (stock.error) throw stock.error;
    if (!stock.data) {
      await supabase.from("physical_cards").insert({
        card_code: code,
        organization_id: qaOrg.id,
        status: "UNASSIGNED",
      }).throwOnError();
    } else {
      await supabase.from("physical_cards").update({
        organization_id: qaOrg.id,
        owner_profile_id: null,
        owner_user_id: null,
        status: "UNASSIGNED",
      }).eq("id", stock.data.id).throwOnError();
    }
  }

  // Second organization for cross-org context/isolation tests.
  const orgB = await ensureOrganization({ slug: "demo-qa-ikinci-sirket", name: "Demo QA / İkinci Şirket" });
  const subB = await supabase.from("organization_subscriptions").select("id").eq("organization_id", orgB.id).limit(1).maybeSingle();
  const payloadB = { organization_id: orgB.id, plan_id: plan.id, status: "ACTIVE", starts_at: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), seat_limit: 50 };
  if (subB.data) await supabase.from("organization_subscriptions").update(payloadB).eq("id", subB.data.id).throwOnError();
  else await supabase.from("organization_subscriptions").insert(payloadB).throwOnError();
  await supabase.from("organization_members").upsert({ organization_id: orgB.id, user_id: users.multiOrgUser.id, email: users.multiOrgUser.email, full_name: users.multiOrgUser.name, title: "İkinci Şirket Admin", department: "Yönetim", role: "ADMIN", status: "ACTIVE" }, { onConflict: "organization_id,email" }).throwOnError();

  // Template fixture. Lead fixture remains an explicit product gap: no lead domain table exists yet.
  {
    const current = await supabase.from("organization_card_templates").select("id").eq("organization_id", qaOrg.id).eq("is_default", true).maybeSingle();
    if (current.error) throw current.error;
    const payload = { organization_id: qaOrg.id, name: "QA Kurumsal Şablon", is_default: true, primary_color: "#6F42C1", fields: { qa: true } };
    if (current.data) await supabase.from("organization_card_templates").update(payload).eq("id", current.data.id).throwOnError();
    else await supabase.from("organization_card_templates").insert(payload).throwOnError();
  }
}

// Turkish corporate occupancy aliases: separate orgs for 0/full/partial cases.
for (const scenario of [
  { key: "trFullOwner", slug: "demo-tr-tam-kapasite", name: "Demo TR / Tam Kapasite", limit: 5, used: 5 },
  { key: "trEmptyOwner", slug: "demo-tr-yeni-kurumsal", name: "Demo TR / Yeni Kurumsal", limit: 5, used: 1 },
  { key: "trPartialOwner", slug: "demo-tr-kismen-dolu", name: "Demo TR / Kısmen Dolu", limit: 10, used: 6 },
  { key: "trTemplateOwner", slug: "demo-tr-template", name: "Demo TR / Şablon", limit: 5, used: 1 },
  { key: "trLeadOwner", slug: "demo-tr-lead", name: "Demo TR / Lead (Modül Bekliyor)", limit: 5, used: 1 },
]) {
  const planCode = scenario.limit === 10 ? "CORP-10" : "CORP-5";
  const plan = catalogPlans.get(planCode);
  const org = await ensureOrganization({ slug: scenario.slug, name: scenario.name });
  const owner = users[scenario.key];
  await supabase.from("organization_members").upsert({ organization_id: org.id, user_id: owner.id, email: owner.email, full_name: owner.name, title: "Şirket Sahibi", department: "Yönetim", role: "OWNER", status: "ACTIVE" }, { onConflict: "organization_id,email" }).throwOnError();
  const sub = await supabase.from("organization_subscriptions").select("id").eq("organization_id", org.id).limit(1).maybeSingle();
  const subPayload = { organization_id: org.id, plan_id: plan.id, status: "ACTIVE", starts_at: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), seat_limit: scenario.limit };
  if (sub.data) await supabase.from("organization_subscriptions").update(subPayload).eq("id", sub.data.id).throwOnError();
  else await supabase.from("organization_subscriptions").insert(subPayload).throwOnError();
  for (let i = 2; i <= scenario.used; i++) await supabase.from("organization_members").upsert({ organization_id: org.id, email: `koltuk${i}.${scenario.slug}@yenomi.test`, full_name: `Demo Çalışan ${i}`, title: "Çalışan", department: "Operasyon", role: "EMPLOYEE", status: "INVITED" }, { onConflict: "organization_id,email" }).throwOnError();
  if (scenario.key === "trTemplateOwner") {
    const current = await supabase.from("organization_card_templates").select("id").eq("organization_id", org.id).eq("is_default", true).maybeSingle();
    if (current.error) throw current.error;
    const payload = { organization_id: org.id, name: "Kurumsal Standart", is_default: true, primary_color: "#6F42C1", fields: { logo: true } };
    if (current.data) await supabase.from("organization_card_templates").update(payload).eq("id", current.data.id).throwOnError();
    else await supabase.from("organization_card_templates").insert(payload).throwOnError();
  }
}

// Ensure the 5/5 corporate demo also exercises the real "physical card assigned" state.
{
  const owner = users.corp5Full;
  const { data: organization, error: orgError } = await supabase.from("organizations").select("id,name").eq("slug", "demo-sirket-5-tam").single();
  if (orgError) throw orgError;

  let { data: profile, error: profileError } = await supabase.from("card_profiles").select("id").eq("user_id", owner.id).eq("organization_id", organization.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    const inserted = await supabase.from("card_profiles").insert({
      user_id: owner.id,
      slug: "demo-5-tam-dolu",
      organization_id: organization.id,
      name: owner.user_metadata.full_name || "Demo 5 Tam Dolu",
      role: "Şirket Sahibi",
      company: organization.name,
      email: owner.email,
      linkedin: null,
      instagram: null,
      is_published: true,
    }).select("id").single();
    if (inserted.error) throw inserted.error;
    profile = inserted.data;
  }

  const existingCard = await supabase.from("physical_cards").select("id").eq("organization_id", organization.id).eq("owner_user_id", owner.id).maybeSingle();
  if (existingCard.error) throw existingCard.error;
  if (!existingCard.data) {
    await supabase.from("physical_cards").insert({
      card_code: "YN-DEMO5FULL001",
      owner_profile_id: profile.id,
      owner_user_id: owner.id,
      organization_id: organization.id,
      activated_at: new Date().toISOString(),
      status: "ACTIVE",
    }).throwOnError();
  }
}

function demoActivationToken(label) {
  const raw = createHash("sha256").update(`demo:${password}:${label}`).digest("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  return { raw, tokenHash };
}

async function seedGuestPaidOrder({ email, orderNumber, tokenLabel, audience, variantSku }) {
  const now = new Date();
  const { data: chosenVariant, error: variantError } = await supabase.from("product_variants").select("id,sku,price_kurus,product_id").eq("sku", variantSku).single();
  if (variantError) throw variantError;
  const { data: chosenProduct, error: productError } = await supabase.from("products").select("id,name,kind").eq("id", chosenVariant.product_id).single();
  if (productError) throw productError;
  const orderPayload = {
    order_number: orderNumber,
    user_id: null,
    guest_email: email,
    status: "PAID",
    currency: "TRY",
    subtotal_kurus: chosenVariant.price_kurus,
    shipping_kurus: 0,
    total_kurus: chosenVariant.price_kurus,
    customer_name: audience === "corporate" ? "Demo Kurumsal Misafir" : "Demo Misafir",
    customer_phone: "+905550000000",
    country_code: "TR",
    paid_at: now.toISOString(),
    activation_claimed_at: null,
  };
  const { data: order, error: orderError } = await supabase.from("commerce_orders").upsert(orderPayload, { onConflict: "order_number" }).select("id,order_number").single();
  if (orderError) throw orderError;
  let { data: item } = await supabase.from("commerce_order_items").select("id").eq("order_id", order.id).limit(1).maybeSingle();
  const itemPayload = {
    order_id: order.id,
    product_id: chosenProduct.id,
    variant_id: chosenVariant.id,
    product_kind: chosenProduct.kind,
    product_name: chosenProduct.name,
    unit_price_kurus: chosenVariant.price_kurus,
    quantity: 1,
    configuration: { sku: chosenVariant.sku, demo: true },
  };
  if (!item) {
    const inserted = await supabase.from("commerce_order_items").insert(itemPayload).select("id").single();
    if (inserted.error) throw inserted.error;
    item = inserted.data;
  } else {
    await supabase.from("commerce_order_items").update(itemPayload).eq("id", item.id).throwOnError();
  }
  if (audience === "individual") {
    await supabase.from("entitlements").upsert({
      user_id: null,
      order_item_id: item.id,
      instance_no: 1,
      kind: "NFC_PHYSICAL_CARD",
      status: "PENDING_ACTIVATION",
    }, { onConflict: "order_item_id,instance_no" }).throwOnError();
  }
  await supabase.from("commerce_order_consents").upsert({
    order_id: order.id,
    distance_sales_accepted: true,
    personalization_accepted: true,
    distance_sales_version: "2026-08-07",
    personalization_version: "2026-08-07",
    privacy_version: "2026-08-07",
    request_id: "DEMO-SEED",
  }, { onConflict: "order_id" }).throwOnError();
  const token = demoActivationToken(tokenLabel);
  await supabase.from("activation_tokens").delete().eq("order_id", order.id);
  await supabase.from("activation_tokens").insert({
    order_id: order.id,
    token_hash: token.tokenHash,
    expires_at: new Date(now.getTime() + 7 * 86400000).toISOString(),
  }).throwOnError();
  return { order, token };
}

const guestActivationUrls = [];
{
  const individualGuest = guestOrders.filter((row) => row.audience === "individual");
  for (const guest of individualGuest) {
    const seeded = await seedGuestPaidOrder({
      email: guest.email,
      orderNumber: guest.orderNumber,
      tokenLabel: guest.tokenLabel,
      audience: "individual",
      variantSku: guest.variantSku || "YENOMI-NFC-CARD-ANNUAL",
    });
    guestActivationUrls.push({ email: guest.email, orderNumber: guest.orderNumber, url: `/aktivasyon?token=${encodeURIComponent(seeded.token.raw)}` });
  }
  const corporateGuest = guestOrders.find((row) => row.audience === "corporate");
  if (!corporateGuest) throw new Error("Kurumsal misafir fixture eksik.");
  const seededCorp = await seedGuestPaidOrder({
    email: corporateGuest.email,
    orderNumber: corporateGuest.orderNumber,
    tokenLabel: corporateGuest.tokenLabel,
    audience: "corporate",
    variantSku: corporateGuest.variantSku || "YENOMI-CORP-2",
  });
  guestActivationUrls.push({ email: corporateGuest.email, orderNumber: corporateGuest.orderNumber, url: `/aktivasyon?token=${encodeURIComponent(seededCorp.token.raw)}` });
}

if (resetDemo) {
  const finalAuthUsers = await listAllAuthUsers();
  const retiredLegacyUsers = finalAuthUsers.filter((user) => String(user.email || "").toLowerCase().startsWith("demo."));
  if (retiredLegacyUsers.length) {
    throw new Error(`Temiz reset başarısız: ${retiredLegacyUsers.length} eski demo.* girişi hâlâ mevcut.`);
  }
  console.log("Eski demo.* giriş doğrulaması: 0 hesap kaldı.");
}

console.log("Demo/QA seed tamamlandı.");
for (const spec of demoUsers) console.log(`- ${spec.email} — ${spec.kind}`);
for (const guest of guestOrders) console.log(`- ${guest.email} — ${guest.kind} (Auth user yok)`);
console.log("Misafir aktivasyon URL’leri yalnız bu çıktıdadır; kaynak koda yazılmaz:");
for (const row of guestActivationUrls) console.log(`- ${row.email} (${row.orderNumber}): ${row.url}`);
console.log("Şifre DEMO_SEED_PASSWORD değeridir; çıktı veya kaynak kod içine yazılmadı.");
