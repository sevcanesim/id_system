import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  DEMO_CORPORATE_CAPACITY_SCENARIOS as corporateScenarios,
  DEMO_GUEST_ORDERS as guestOrders,
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
  console.log("Uygulamak için: DEMO_SEED_PASSWORD='...' npm run seed:demo -- --apply");
  process.exit(0);
}

async function assertSchema() {
  for (const table of ["admin_users", "products", "product_variants", "commerce_orders", "commerce_order_items", "entitlements", "card_profiles", "business_plans", "organizations", "organization_members", "organization_subscriptions", "commerce_order_consents", "user_accounts", "physical_cards", "organization_invites", "organization_card_templates", "card_view_events", "activation_tokens"]) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    if (error) throw new Error(`Migration eksik (${table}): ${error.message}`);
  }
}

await assertSchema();
const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listError) throw listError;
const foreignUsers = listed.users.filter((user) => !user.email?.endsWith("@yenomi.test"));
if (foreignUsers.length && !allowNonEmpty) {
  throw new Error(`DB boş değil: ${foreignUsers.length} demo dışı Auth kullanıcısı var. Bilerek devam için --allow-non-empty kullan.`);
}

const authByEmail = new Map(listed.users.map((user) => [user.email?.toLowerCase(), user]));
const users = {};
for (const spec of demoUsers) {
  let user = authByEmail.get(spec.email);
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

await supabase.from("admin_users").upsert({ user_id: users.superAdmin.id }, { onConflict: "user_id" }).throwOnError();

await supabase.from("products").upsert({ slug: "nfc-business-card", name: "Yenomi ID NFC + QR Kart", kind: "NFC_PHYSICAL_CARD", description: "Fiziksel NFC kart, kişisel QR ve dijital kartvizit erişimi", is_active: true }, { onConflict: "slug" }).throwOnError();
const { data: baseProduct, error: baseProductError } = await supabase.from("products").select("id").eq("slug", "nfc-business-card").single();
if (baseProductError) throw baseProductError;
await supabase.from("product_variants").upsert({ product_id: baseProduct.id, sku: "YENOMI-NFC-CARD-ANNUAL", name: "Yenomi ID — NFC Kart", price_kurus: 149000, billing_period: "YEARLY", metadata: { fulfillment_kind: "INITIAL_BUNDLE", digital_service_included: true, physical_card_count: 1, service_days: 365, shipping_included: true, country: "TR", preparation_business_days: 2, package_code: "INDIVIDUAL" }, is_active: true }, { onConflict: "sku" }).throwOnError();
const { data: initialVariant, error: initialVariantError } = await supabase.from("product_variants").select("id,product_id,sku,price_kurus,billing_period").eq("sku", "YENOMI-NFC-CARD-ANNUAL").single();
if (initialVariantError) throw initialVariantError;
await supabase.from("product_variants").upsert({ product_id: initialVariant.product_id, sku: "YENOMI-DIGITAL-ANNUAL", name: "Yenomi ID Dijital Kartvizit", price_kurus: 79900, billing_period: "YEARLY", metadata: { fulfillment_kind: "DIGITAL_INITIAL", digital_service_included: true, physical_card_count: 0, service_days: 365, shipping_included: false, package_code: "INDIVIDUAL_DIGITAL" }, is_active: true }, { onConflict: "sku" }).throwOnError();
await supabase.from("product_variants").upsert({ product_id: initialVariant.product_id, sku: "YENOMI-NFC-PREMIUM-ANNUAL", name: "Yenomi ID Premium — NFC + 500 Network Mail", price_kurus: 249000, billing_period: "YEARLY", metadata: { fulfillment_kind: "INITIAL_BUNDLE", digital_service_included: true, physical_card_count: 1, service_days: 365, shipping_included: true, country: "TR", preparation_business_days: 2, package_code: "INDIVIDUAL_PREMIUM", network_mail_credits: 500 }, is_active: true }, { onConflict: "sku" }).throwOnError();
await supabase.from("product_variants").upsert({ product_id: initialVariant.product_id, sku: "YENOMI-PREMIUM-RENEWAL-ANNUAL", name: "Yenomi ID Premium — 1 Yıl Yenileme", price_kurus: 59900, billing_period: "YEARLY", metadata: { fulfillment_kind: "DIGITAL_RENEWAL", digital_service_included: true, physical_card_count: 0, service_days: 365, requires_active_or_expired_entitlement: true, shipping_included: false, package_code: "INDIVIDUAL_PREMIUM", network_mail_credits: 500 }, is_active: true }, { onConflict: "sku" }).throwOnError();
await supabase.from("product_variants").upsert({ product_id: initialVariant.product_id, sku: "YENOMI-PREMIUM-UPGRADE", name: "Yenomi ID Premium yükseltme", price_kurus: 100000, billing_period: "ONE_TIME", metadata: { fulfillment_kind: "PREMIUM_UPGRADE", digital_service_included: false, physical_card_count: 0, requires_active_entitlement: true, shipping_included: false, package_code: "INDIVIDUAL_PREMIUM", network_mail_credits: 500 }, is_active: true }, { onConflict: "sku" }).throwOnError();
await supabase.from("product_variants").upsert({ product_id: initialVariant.product_id, sku: "YENOMI-NFC-EXTRA", name: "Yenomi ID Yedek Kart", price_kurus: 39900, billing_period: "ONE_TIME", metadata: { fulfillment_kind: "EXTRA_CARD", digital_service_included: false, physical_card_count: 1, requires_active_entitlement: true, shipping_included: true, country: "TR" }, is_active: true }, { onConflict: "sku" }).throwOnError();
await supabase.from("product_variants").upsert({ product_id: initialVariant.product_id, sku: "YENOMI-NFC-REPLACEMENT", name: "Yenomi ID Değişim Kartı", price_kurus: 34900, billing_period: "ONE_TIME", metadata: { fulfillment_kind: "REPLACEMENT_CARD", digital_service_included: false, physical_card_count: 1, requires_lost_card: true, requires_active_entitlement: true, term_basis: "ACTIVE_ENTITLEMENT", shipping_included: true, country: "TR" }, is_active: true }, { onConflict: "sku" }).throwOnError();

await supabase.from("products").upsert({ slug: "yenomi-business", name: "Yenomi ID Kurumsal Paket", kind: "BUSINESS_CARD", description: "Yıllık kurumsal sistem: NFC kart, çalışan profilleri, şirket paneli ve Network Mail.", is_active: true }, { onConflict: "slug" }).throwOnError();
const { data: corporateProduct, error: corporateProductError } = await supabase.from("products").select("id").eq("slug", "yenomi-business").single();
if (corporateProductError) throw corporateProductError;
const corporateLadder = [
  { sku: "YENOMI-CORP-2", name: "Kurumsal 2", price: 349000, seats: 2, code: "CORP-2" },
  { sku: "YENOMI-CORP-3", name: "Kurumsal 3", price: 499000, seats: 3, code: "CORP-3" },
  { sku: "YENOMI-CORP-5", name: "Kurumsal 5", price: 749000, seats: 5, code: "CORP-5" },
  { sku: "YENOMI-CORP-10", name: "Kurumsal 10", price: 1290000, seats: 10, code: "CORP-10" },
  { sku: "YENOMI-CORP-25", name: "Kurumsal 25", price: 2990000, seats: 25, code: "CORP-25" },
  { sku: "YENOMI-CORP-50", name: "Kurumsal 50", price: 5490000, seats: 50, code: "CORP-50" },
  { sku: "YENOMI-CORP-100", name: "Kurumsal 100", price: 9990000, seats: 100, code: "CORP-100" },
];
for (const pack of corporateLadder) {
  await supabase.from("product_variants").upsert({
    product_id: corporateProduct.id,
    sku: pack.sku,
    name: pack.name,
    price_kurus: pack.price,
    billing_period: "YEARLY",
    metadata: {
      fulfillment_kind: "CORPORATE_PACKAGE",
      digital_service_included: true,
      physical_card_count: pack.seats,
      seat_count: pack.seats,
      service_days: 365,
      shipping_included: true,
      country: "TR",
      preparation_business_days: 2,
      package_code: pack.code,
      network_mail_credits: pack.seats * 100,
    },
    is_active: true,
  }, { onConflict: "sku" }).throwOnError();
}
await supabase.from("product_variants").update({ is_active: false }).in("sku", ["YENOMI-CORP-4", "YENOMI-CORP-20", "YENOMI-CORP-75"]).throwOnError();
for (const pack of corporateLadder) {
  await supabase.from("business_plans").update({ annual_price_kurus: pack.price, monthly_price_kurus: null, is_active: true }).eq("code", pack.code).throwOnError();
}
await supabase.from("business_plans").update({ is_active: false }).in("code", ["CORP-4", "CORP-20", "CORP-75"]).throwOnError();
await supabase.from("business_plans").update({ annual_price_kurus: 1290000 }).eq("code", "STARTER").throwOnError();
await supabase.from("business_plans").update({ annual_price_kurus: 2990000 }).eq("code", "GROWTH").throwOnError();
await supabase.from("business_plans").update({ annual_price_kurus: 5490000 }).eq("code", "BUSINESS").throwOnError();
const seatPacks = [
  { sku: "YENOMI-BUSINESS-SEATS-1", price: 159000 },
  { sku: "YENOMI-BUSINESS-SEATS-2", price: 279000 },
  { sku: "YENOMI-BUSINESS-SEATS-3", price: 409000 },
  { sku: "YENOMI-BUSINESS-SEATS-5", price: 549000 },
  { sku: "YENOMI-BUSINESS-SEATS-10", price: 1049000 },
];
for (const pack of seatPacks) {
  await supabase.from("product_variants").update({ price_kurus: pack.price }).eq("sku", pack.sku).throwOnError();
}

const { data: product, error: productError } = await supabase.from("products").select("id,slug,name,kind").eq("slug", "nfc-business-card").single();
if (productError) throw productError;
const { data: variant, error: variantError } = await supabase.from("product_variants").select("id,sku,price_kurus,billing_period").eq("sku", "YENOMI-NFC-CARD-ANNUAL").single();
if (variantError) throw variantError;

async function seedIndividual({
  user,
  orderNumber,
  withProfile,
  profileSlug,
  profileName,
  variantSku = "YENOMI-NFC-CARD-ANNUAL",
  entitlementStatus = "ACTIVE",
  startsAt,
  expiresAt,
  graceEndsAt,
  physicalCards = [],
  claimActivation = true,
}) {
  const now = new Date();
  const starts = startsAt ?? now;
  const expires = expiresAt ?? new Date(now.getTime() + 365 * 86400000);
  const grace = graceEndsAt ?? new Date(now.getTime() + 372 * 86400000);
  const { data: chosenVariant, error: chosenVariantError } = await supabase.from("product_variants").select("id,sku,price_kurus,billing_period").eq("sku", variantSku).single();
  if (chosenVariantError) throw chosenVariantError;
  const orderPayload = {
    order_number: orderNumber,
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
    activation_claimed_at: claimActivation ? now.toISOString() : null,
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
  if (withProfile) {
    const lost = physicalCards.some((card) => card.status === "LOST");
    const safeSlug = profileSlug || `demo-${user.email.split("@")[0].replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const profilePayload = {
      user_id: user.id,
      entitlement_id: entitlement.id,
      slug: safeSlug,
      name: profileName || user.user_metadata.full_name || "Demo Kullanıcı",
      role: "Demo Kullanıcı",
      company: "Yenomi Demo",
      phone: "+90 555 000 00 01",
      email: user.email,
      website: "https://yenomilabs.com",
      location: "İstanbul, Türkiye",
      is_published: true,
      card_status: lost ? "LOST" : "ACTIVE",
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
  if (profile) {
    for (const card of physicalCards) {
      const existingCard = await supabase.from("physical_cards").select("id").eq("card_code", card.code).maybeSingle();
      if (existingCard.error) throw existingCard.error;
      const cardPayload = {
        owner_profile_id: profile.id,
        owner_user_id: user.id,
        organization_id: null,
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

await seedIndividual({ user: users.cardPending, orderNumber: "YI-DEMO-PENDING", withProfile: false });
await seedIndividual({ user: users.cardComplete, orderNumber: "YI-DEMO-COMPLETE", withProfile: true, profileSlug: "demo-karti-hazir", profileName: "Kartı Hazır Kullanıcı" });
await seedIndividual({ user: users.trIndividualEmpty, orderNumber: "YI-TR-BIREYSEL-BOS", withProfile: false });
await seedIndividual({ user: users.trIndividualActive, orderNumber: "YI-TR-BIREYSEL-AKTIF", withProfile: true, profileSlug: "demo-bireysel-aktif", profileName: "Bireysel Aktif Kullanıcı" });
{
  const now = new Date();
  await seedIndividual({
    user: users.trIndividualPremium,
    orderNumber: "YI-TR-BIREYSEL-PREMIUM",
    withProfile: true,
    profileSlug: "demo-bireysel-premium",
    profileName: "Bireysel Premium Kullanıcı",
    variantSku: "YENOMI-NFC-PREMIUM-ANNUAL",
  });
  await seedIndividual({
    user: users.trIndividualExpired,
    orderNumber: "YI-TR-BIREYSEL-EXPIRED",
    withProfile: true,
    profileSlug: "demo-bireysel-suresi-dolmus",
    profileName: "Süresi Dolmuş Bireysel",
    entitlementStatus: "EXPIRED",
    startsAt: new Date(now.getTime() - 400 * 86400000),
    expiresAt: new Date(now.getTime() - 35 * 86400000),
    graceEndsAt: new Date(now.getTime() - 28 * 86400000),
  });
  await seedIndividual({
    user: users.trIndividualLost,
    orderNumber: "YI-TR-BIREYSEL-KAYIP",
    withProfile: true,
    profileSlug: "demo-bireysel-kayip",
    profileName: "Kayıp Kart Bireysel",
    physicalCards: [{ code: "YN-INDLOST00001", status: "LOST" }],
  });
  await seedIndividual({
    user: users.trIndividualBackup,
    orderNumber: "YI-TR-BIREYSEL-YEDEK",
    withProfile: true,
    profileSlug: "demo-bireysel-yedek",
    profileName: "Yedek Kart Bireysel",
    physicalCards: [
      { code: "YN-INDYEDKMAIN1", status: "ACTIVE" },
      { code: "YN-INDYEDKALT01", status: "ACTIVE" },
    ],
  });
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

async function ensureCorporateDemoProfile(user, organization, slug, title = "Demo Çalışan") {
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
    is_published: true,
    card_status: "ACTIVE",
  };
  const existing = await supabase.from("card_profiles").select("id").eq("user_id", user.id).eq("company", organization.name).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) await supabase.from("card_profiles").update(payload).eq("id", existing.data.id).throwOnError();
  else await supabase.from("card_profiles").insert(payload).throwOnError();
}

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
    let worker = authByEmail.get(workerEmail);
    if (!worker) {
      const created = await supabase.auth.admin.createUser({
        email: workerEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Demo Çalışan ${index}`, demo_scenario: "CORPORATE_ACTIVE_SEAT" },
      });
      if (created.error || !created.data.user) throw new Error(`Kurumsal demo çalışanı oluşturulamadı (${workerEmail}): ${created.error?.message}`);
      worker = created.data.user;
      authByEmail.set(workerEmail, worker);
    } else {
      const updated = await supabase.auth.admin.updateUserById(worker.id, { password, email_confirm: true, user_metadata: { ...worker.user_metadata, full_name: `Demo Çalışan ${index}`, demo_scenario: "CORPORATE_ACTIVE_SEAT" } });
      if (updated.error || !updated.data.user) throw new Error(`Kurumsal demo çalışanı güncellenemedi (${workerEmail}): ${updated.error?.message}`);
      worker = updated.data.user;
      authByEmail.set(workerEmail, worker);
    }
    await supabase.from("user_accounts").update({ account_type: "TEST", test_login_scope: "CORPORATE" }).eq("id", worker.id).throwOnError();
    await supabase.from("organization_members").upsert({ organization_id: organization.id, user_id: worker.id, email: workerEmail, full_name: `Demo Çalışan ${index}`, title: "Demo Çalışan", department: index % 2 ? "Satış" : "Operasyon", role: "EMPLOYEE", status: "ACTIVE" }, { onConflict: "organization_id,email" }).throwOnError();
    await ensureCorporateDemoProfile(worker, organization, `${scenario.slug}-calisan-${index}`);
  }

  // P2 #22: demo activity is intentionally deterministic and distinct.
  // The overview feed represents recent membership activity, not creation time.
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


// v24.4 — Complete corporate member/card lifecycle matrix.
// This purpose-built organization is intentionally separate from occupancy fixtures so
// SUSPENDED/LEFT states do not distort the requested 5/5, 5/3, 10/10 seat scenarios.
{
  const owner = users.lifecycleOwner;
  const { data: organization, error: orgError } = await supabase.from("organizations")
    .select("id,name").eq("slug", "demo-yasam-dongusu").single();
  if (orgError) throw orgError;

  const memberSpecs = [
    { key: "lifecycleNoCard", title: "Aktif Hesap / Kart Yok", department: "Operasyon", status: "ACTIVE", profile: false, card: null },
    { key: "lifecycleDigital", title: "Dijital Kart Hazır", department: "Satış", status: "ACTIVE", profile: true, published: true, card: null },
    { key: "lifecycleAssigned", title: "Fiziksel Kart Atanmış", department: "Satış", status: "ACTIVE", profile: true, published: true, card: "ACTIVE", code: "YN-LIFEASSIGN01" },
    { key: "lifecycleLost", title: "Kayıp Kart", department: "Operasyon", status: "ACTIVE", profile: true, published: true, card: "LOST", code: "YN-LIFELOST0001" },
    { key: "lifecycleDisabled", title: "Kart Devre Dışı", department: "İnsan Kaynakları", status: "ACTIVE", profile: true, published: true, card: "DISABLED", code: "YN-LIFEDISABL01" },
    { key: "lifecycleSuspended", title: "Pasif Çalışan", department: "Operasyon", status: "SUSPENDED", profile: true, published: false, card: "DISABLED", code: "YN-LIFESUSPEND1" },
    { key: "lifecycleLeft", title: "Ayrılmış Çalışan", department: "Satış", status: "LEFT", profile: true, published: false, card: "DISABLED", code: "YN-LIFELEFT0001" },
  ];

  // One real INVITED row without auth user exercises the pre-acceptance state.
  await supabase.from("organization_members").upsert({
    organization_id: organization.id,
    email: "demo.lifecycle.invited@yenomi.test",
    full_name: "Davet Bekleyen Kullanıcı",
    title: "Davet Kabul Edilmedi",
    department: "Satış",
    role: "EMPLOYEE",
    status: "INVITED",
  }, { onConflict: "organization_id,email" }).throwOnError();

  for (const spec of memberSpecs) {
    const user = users[spec.key];
    const { data: member, error: memberError } = await supabase.from("organization_members").upsert({
      organization_id: organization.id,
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata.full_name,
      title: spec.title,
      department: spec.department,
      role: "EMPLOYEE",
      status: spec.status,
    }, { onConflict: "organization_id,email" }).select("id").single();
    if (memberError) throw memberError;

    let profile = null;
    if (spec.profile) {
      const slug = `demo-lifecycle-${spec.key.replace("lifecycle", "").toLowerCase()}`;
      const payload = {
        user_id: user.id,
        slug,
        name: user.user_metadata.full_name,
        role: spec.title,
        company: organization.name,
        email: user.email,
        phone: "+90 555 100 20 30",
        website: "https://yenomilabs.com",
        is_published: Boolean(spec.published),
        card_status: spec.status === "LEFT" || spec.status === "SUSPENDED" || spec.card === "DISABLED" ? "SUSPENDED" : spec.card === "LOST" ? "LOST" : "ACTIVE",
      };
      const existing = await supabase.from("card_profiles").select("id").eq("user_id", user.id).eq("company", organization.name).maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        const updated = await supabase.from("card_profiles").update(payload).eq("id", existing.data.id).select("id").single();
        if (updated.error) throw updated.error;
        profile = updated.data;
      } else {
        const inserted = await supabase.from("card_profiles").insert(payload).select("id").single();
        if (inserted.error) throw inserted.error;
        profile = inserted.data;
      }
    }

    if (spec.card && profile) {
      const existingCard = await supabase.from("physical_cards").select("id,status").eq("card_code", spec.code).maybeSingle();
      if (existingCard.error) throw existingCard.error;
      if (!existingCard.data) {
        await supabase.from("physical_cards").insert({
          card_code: spec.code,
          owner_profile_id: profile.id,
          owner_user_id: user.id,
          organization_id: organization.id,
          activated_at: new Date().toISOString(),
          status: spec.card,
        }).throwOnError();
      } else {
        // Seed must repair stale ownership as well as status. Otherwise a card
        // from a previous demo run can stay linked to another user/org and the
        // employee UI will incorrectly derive UNASSIGNED.
        await supabase.from("physical_cards").update({
          owner_profile_id: profile.id,
          owner_user_id: user.id,
          organization_id: organization.id,
          activated_at: new Date().toISOString(),
          status: spec.card,
        }).eq("id", existingCard.data.id).throwOnError();
      }
    }
  }

  // Physical inventory card: belongs to the company but is not yet assigned to anyone.
  const inventoryCode = "YN-LIFEUNASSGN1";
  const inventory = await supabase.from("physical_cards").select("id").eq("card_code", inventoryCode).maybeSingle();
  if (inventory.error) throw inventory.error;
  if (!inventory.data) {
    await supabase.from("physical_cards").insert({
      card_code: inventoryCode,
      organization_id: organization.id,
      status: "UNASSIGNED",
    }).throwOnError();
  }
}



// v24.5 — Deterministic end-to-end QA organization and Turkish scenario matrix.
{
  // Dedicated plan avoids occupancy fixtures being distorted by the larger QA matrix.
  await supabase.from("business_plans").upsert({
    code: "DEMO-50", name: "Demo QA 50", seat_limit: 50, annual_price_kurus: 0,
    features: ["QA_ONLY"], is_active: true,
  }, { onConflict: "code" }).throwOnError();
  const { data: plan, error: planError } = await supabase.from("business_plans").select("id").eq("code", "DEMO-50").single();
  if (planError) throw planError;
  const qaOrg = await ensureOrganization({ slug: "demo-qa-uctan-uca", name: "Demo Şirket / Uçtan Uca QA" });
  const existingSub = await supabase.from("organization_subscriptions").select("id").eq("organization_id", qaOrg.id).limit(1).maybeSingle();
  const subPayload = { organization_id: qaOrg.id, plan_id: plan.id, status: "ACTIVE", starts_at: new Date().toISOString(), expires_at: new Date(Date.now()+365*86400000).toISOString(), seat_limit: 50 };
  if (existingSub.data) await supabase.from("organization_subscriptions").update(subPayload).eq("id", existingSub.data.id).throwOnError();
  else await supabase.from("organization_subscriptions").insert(subPayload).throwOnError();

  const members = [
    ["trOwner","OWNER","ACTIVE","Şirket Sahibi","Yönetim"],
    ["trAdmin","ADMIN","ACTIVE","Kurumsal Admin","Yönetim"],
    ["trHr","HR","ACTIVE","İnsan Kaynakları","İnsan Kaynakları"],
    ["trDepartmentManager","DEPARTMENT_MANAGER","ACTIVE","Departman Yöneticisi","Satış"],
    ["trRegistered","EMPLOYEE","ACTIVE","Hesap Aktif / Profil Yok","Operasyon"],
    ["trNoCard","EMPLOYEE","ACTIVE","Kart Oluşturulmadı","Operasyon"],
    ["trDigital","EMPLOYEE","ACTIVE","Dijital Kart Hazır","Satış"],
    ["trAssigned","EMPLOYEE","ACTIVE","Fiziksel Kart Atanmış","Satış"],
    ["trLost","EMPLOYEE","ACTIVE","Kayıp Kart","Operasyon"],
    ["trBackup","EMPLOYEE","ACTIVE","Ana + Yedek Kart","Satış"],
    ["trSuspended","EMPLOYEE","SUSPENDED","Pasif Çalışan","Operasyon"],
    ["trLeft","EMPLOYEE","LEFT","İşten Ayrıldı","Satış"],
    ["multiOrgUser","ADMIN","ACTIVE","Çoklu Şirket Admin","Yönetim"],
  ];

  const memberRows = new Map();
  for (const [key,role,status,title,department] of members) {
    const user = users[key];
    const { data: row, error } = await supabase.from("organization_members").upsert({
      organization_id: qaOrg.id, user_id: user.id, email: user.email, full_name: user.user_metadata.full_name,
      title, department, role, status,
    }, { onConflict: "organization_id,email" }).select("id").single();
    if (error) throw error;
    memberRows.set(key,row);
  }

  // Real invited/no-auth fixture requested by QA matrix.
  const { data: invitedMember, error: invitedError } = await supabase.from("organization_members").upsert({
    organization_id: qaOrg.id, email: "demo.calisan.davet@yenomi.test", full_name: "Davet Bekleyen Çalışan",
    title: "Davet Kabul Edilmedi", department: "Satış", role: "EMPLOYEE", status: "INVITED",
  }, { onConflict: "organization_id,email" }).select("id").single();
  if (invitedError) throw invitedError;
  await supabase.from("organization_invites").delete().eq("member_id", invitedMember.id).is("used_at", null);
  await supabase.from("organization_invites").insert({
    organization_id: qaOrg.id, member_id: invitedMember.id,
    token_hash: "qa-invite-active-" + invitedMember.id.replaceAll("-", ""),
    expires_at: new Date(Date.now()+7*86400000).toISOString(),
  }).throwOnError();

  // Expired and revoked invitation edge cases.
  for (const inviteCase of [
    { email:"demo.calisan.davet.expired@yenomi.test", name:"Süresi Dolmuş Davet", expired:true, revoked:false },
    { email:"demo.calisan.davet.revoked@yenomi.test", name:"İptal Edilmiş Davet", expired:false, revoked:true },
  ]) {
    const row=await supabase.from("organization_members").upsert({organization_id:qaOrg.id,email:inviteCase.email,full_name:inviteCase.name,title:"Davet Edge Case",department:"QA",role:"EMPLOYEE",status:inviteCase.revoked?"LEFT":"INVITED"},{onConflict:"organization_id,email"}).select("id").single();
    if(row.error) throw row.error;
    await supabase.from("organization_invites").delete().eq("member_id",row.data.id);
    await supabase.from("organization_invites").insert({organization_id:qaOrg.id,member_id:row.data.id,token_hash:`qa-${inviteCase.expired?"expired":"revoked"}-`+row.data.id.replaceAll("-",""),expires_at:new Date(Date.now()+(inviteCase.expired?-1:7)*86400000).toISOString(),revoked_at:inviteCase.revoked?new Date().toISOString():null}).throwOnError();
  }

  async function ensureCorporateProfile(key, published=true) {
    const user=users[key];
    const payload={ user_id:user.id, organization_id:qaOrg.id, slug:`qa-${key.toLowerCase()}`, name:user.user_metadata.full_name,
      role:(members.find(m=>m[0]===key)?.[3] || "Çalışan"), company:qaOrg.name, email:user.email,
      linkedin:null, instagram:null,
      phone:"+90 555 240 50 00", website:"https://yenomilabs.com", is_published:published, card_status:"ACTIVE" };
    const existing=await supabase.from("card_profiles").select("id").eq("user_id",user.id).eq("company",qaOrg.name).maybeSingle();
    if(existing.error) throw existing.error;
    if(existing.data){ const u=await supabase.from("card_profiles").update(payload).eq("id",existing.data.id).select("id").single(); if(u.error) throw u.error; return u.data; }
    const i=await supabase.from("card_profiles").insert(payload).select("id").single(); if(i.error) throw i.error; return i.data;
  }
  async function ensureCard(code,key,profile,status="ACTIVE") {
    const user=users[key];
    const existing=await supabase.from("physical_cards").select("id,status,owner_user_id,owner_profile_id,organization_id,replaced_by_card_id").eq("card_code",code).maybeSingle();
    if(existing.error) throw existing.error;
    const payload={ owner_profile_id:profile.id, owner_user_id:user.id, organization_id:qaOrg.id, activated_at:new Date().toISOString(), status };
    if(existing.data) {
      // QA seed is a repair operation, not only an insert operation. A previous
      // lifecycle mutation (ACTIVE -> LOST, owner change, org reassignment)
      // must never survive the next deterministic seed run. Replacement links
      // are intentionally preserved and repaired by the dedicated RPC below.
      const updated=await supabase.from("physical_cards").update(payload).eq("id",existing.data.id).select("id,status").single();
      if(updated.error) throw updated.error;
      return updated.data;
    }
    const i=await supabase.from("physical_cards").insert({ card_code:code, ...payload }).select("id,status").single();
    if(i.error) throw i.error; return i.data;
  }

  const digital = await ensureCorporateProfile("trDigital", true);
  const assigned = await ensureCorporateProfile("trAssigned", true);
  const lost = await ensureCorporateProfile("trLost", true);
  const backup = await ensureCorporateProfile("trBackup", true);
  const suspended = await ensureCorporateProfile("trSuspended", false);
  const left = await ensureCorporateProfile("trLeft", false);
  await ensureCard("YN-TRASSIGN0001","trAssigned",assigned,"ACTIVE");
  await ensureCard("YN-TRLOST000001","trLost",lost,"LOST");
  await ensureCard("YN-TRBACKMAIN01","trBackup",backup,"ACTIVE");
  await ensureCard("YN-TRBACKALT001","trBackup",backup,"ACTIVE");
  await ensureCard("YN-TRSUSPEND001","trSuspended",suspended,"DISABLED");
  await ensureCard("YN-TRLEFT000001","trLeft",left,"DISABLED");

  // Replacement case: old LOST card permanently points to the new ACTIVE card.
  const oldReplacement = await ensureCard("YN-TRREPOLD0001","trAssigned",assigned,"LOST");
  const newReplacement = await ensureCard("YN-TRREPNEW0001","trAssigned",assigned,"ACTIVE");
  const oldState = await supabase.from("physical_cards").select("replaced_by_card_id").eq("id",oldReplacement.id).single();
  if(oldState.error) throw oldState.error;
  if(!oldState.data.replaced_by_card_id){ const rpc=await supabase.rpc("replace_physical_card",{p_old_card_id:oldReplacement.id,p_new_card_id:newReplacement.id}); if(rpc.error) throw rpc.error; }

  // Same-name collision: identity must be member/user ID, not display name.
  for (const suffix of ["a","b"]) {
    await supabase.from("organization_members").upsert({
      organization_id:qaOrg.id,email:`demo.ayni.isim.${suffix}@yenomi.test`,full_name:"Ahmet Yılmaz",
      title:suffix==="a"?"Satış Uzmanı":"Operasyon Uzmanı",department:suffix==="a"?"Satış":"Operasyon",role:"EMPLOYEE",status:"INVITED",
    },{onConflict:"organization_id,email"}).throwOnError();
  }

  // Duplicate-email error is a procedure, not a second fixture: as owner, invite
  // demo.calisan.dijital@yenomi.test again. Server must return the existing-member error.

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
  const subB=await supabase.from("organization_subscriptions").select("id").eq("organization_id",orgB.id).limit(1).maybeSingle();
  const payloadB={organization_id:orgB.id,plan_id:plan.id,status:"ACTIVE",starts_at:new Date().toISOString(),expires_at:new Date(Date.now()+365*86400000).toISOString(),seat_limit:50};
  if(subB.data) await supabase.from("organization_subscriptions").update(payloadB).eq("id",subB.data.id).throwOnError(); else await supabase.from("organization_subscriptions").insert(payloadB).throwOnError();
  await supabase.from("organization_members").upsert({organization_id:orgB.id,user_id:users.multiOrgUser.id,email:users.multiOrgUser.email,full_name:users.multiOrgUser.user_metadata.full_name,title:"İkinci Şirket Admin",department:"Yönetim",role:"ADMIN",status:"ACTIVE"},{onConflict:"organization_id,email"}).throwOnError();

  // Template fixture. Lead fixture remains a deliberate product gap: no lead domain table exists yet.
  {
    const current = await supabase.from("organization_card_templates").select("id").eq("organization_id", qaOrg.id).eq("is_default", true).maybeSingle();
    if (current.error) throw current.error;
    const payload = { organization_id:qaOrg.id,name:"QA Kurumsal Şablon",is_default:true,primary_color:"#6F42C1",fields:{qa:true} };
    if (current.data) await supabase.from("organization_card_templates").update(payload).eq("id", current.data.id).throwOnError();
    else await supabase.from("organization_card_templates").insert(payload).throwOnError();
  }
}

// Turkish corporate occupancy aliases: separate orgs for 0/full/partial cases.
for (const scenario of [
  { key:"trFullOwner", slug:"demo-tr-tam-kapasite", name:"Demo TR / Tam Kapasite", limit:5, used:5 },
  { key:"trEmptyOwner", slug:"demo-tr-yeni-kurumsal", name:"Demo TR / Yeni Kurumsal", limit:5, used:1 },
  { key:"trPartialOwner", slug:"demo-tr-kismen-dolu", name:"Demo TR / Kısmen Dolu", limit:10, used:6 },
  { key:"trTemplateOwner", slug:"demo-tr-template", name:"Demo TR / Şablon", limit:5, used:1 },
  { key:"trLeadOwner", slug:"demo-tr-lead", name:"Demo TR / Lead (Modül Bekliyor)", limit:5, used:1 },
]) {
  const planCode=scenario.limit===10?"DEMO-10":"DEMO-5";
  const plan=await supabase.from("business_plans").select("id").eq("code",planCode).single(); if(plan.error) throw plan.error;
  const org = await ensureOrganization({ slug: scenario.slug, name: scenario.name });
  const owner=users[scenario.key];
  await supabase.from("organization_members").upsert({organization_id:org.id,user_id:owner.id,email:owner.email,full_name:owner.user_metadata.full_name,title:"Şirket Sahibi",department:"Yönetim",role:"OWNER",status:"ACTIVE"},{onConflict:"organization_id,email"}).throwOnError();
  const sub=await supabase.from("organization_subscriptions").select("id").eq("organization_id",org.id).limit(1).maybeSingle();
  const subPayload={organization_id:org.id,plan_id:plan.data.id,status:"ACTIVE",starts_at:new Date().toISOString(),expires_at:new Date(Date.now()+365*86400000).toISOString(),seat_limit:scenario.limit};
  if(sub.data) await supabase.from("organization_subscriptions").update(subPayload).eq("id",sub.data.id).throwOnError(); else await supabase.from("organization_subscriptions").insert(subPayload).throwOnError();
  for(let i=2;i<=scenario.used;i++) await supabase.from("organization_members").upsert({organization_id:org.id,email:`koltuk${i}.${scenario.slug}@yenomi.test`,full_name:`Demo Çalışan ${i}`,title:"Çalışan",department:"Operasyon",role:"EMPLOYEE",status:"INVITED"},{onConflict:"organization_id,email"}).throwOnError();
  if(scenario.key==="trTemplateOwner") {
    const current=await supabase.from("organization_card_templates").select("id").eq("organization_id",org.id).eq("is_default",true).maybeSingle(); if(current.error) throw current.error;
    const payload={organization_id:org.id,name:"Kurumsal Standart",is_default:true,primary_color:"#6F42C1",fields:{logo:true}};
    if(current.data) await supabase.from("organization_card_templates").update(payload).eq("id",current.data.id).throwOnError(); else await supabase.from("organization_card_templates").insert(payload).throwOnError();
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
      variantSku: "YENOMI-NFC-CARD-ANNUAL",
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
    variantSku: "YENOMI-CORP-2",
  });
  guestActivationUrls.push({ email: corporateGuest.email, orderNumber: corporateGuest.orderNumber, url: `/aktivasyon?token=${encodeURIComponent(seededCorp.token.raw)}` });
}

console.log("Demo/QA seed tamamlandı.");
for (const spec of demoUsers) console.log(`- ${spec.email} — ${spec.kind}`);
for (const guest of guestOrders) console.log(`- ${guest.email} — ${guest.kind} (Auth user yok)`);
console.log("Misafir aktivasyon URL’leri yalnız bu çıktıdadır; kaynak koda yazılmaz:");
for (const row of guestActivationUrls) console.log(`- ${row.email} (${row.orderNumber}): ${row.url}`);
console.log("Şifre DEMO_SEED_PASSWORD değeridir; çıktı veya kaynak kod içine yazılmadı.");
