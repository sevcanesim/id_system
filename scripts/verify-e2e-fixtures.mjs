import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEMO_CORPORATE_CAPACITY_SCENARIOS as capacityScenarios,
  DEMO_GUEST_ORDERS as guestOrders,
  DEMO_IDENTITY_COLLISION as identityCollision,
  DEMO_INVITE_FIXTURES as inviteFixtures,
  DEMO_LOGIN_USERS as demoUsers,
} from "../tests/fixtures/demo-user-matrix.mjs";

// First, run the static matrix verifier
const matrix = spawnSync(process.execPath, [path.join(process.cwd(), "scripts/verify-demo-qa-matrix.mjs")], { stdio: "inherit" });
if (matrix.status) process.exit(matrix.status);

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
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  throw new Error("E2E fixture kontrolü için Supabase URL ve service role/secret key gerekli.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\nGerçek Supabase Staging DB Doğrulanıyor: ${url}`);
const problems = [];
const pass = (label) => console.log(`PASS DB  ${label}`);
const fail = (label) => {
  problems.push(label);
  console.error(`FAIL DB  ${label}`);
};

// 1. Verify Auth users & user_accounts
const { data: authUsersList, error: authUsersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
if (authUsersError) throw authUsersError;
const authUserMap = new Map(authUsersList.users.map((u) => [u.email?.toLowerCase(), u]));

const { data: userAccounts, error: userAccountsError } = await supabase.from("user_accounts").select("id,account_type,test_login_scope");
if (userAccountsError) throw userAccountsError;
const userAccountMap = new Map(userAccounts?.map((u) => [u.id, u]));

const { data: adminUsers, error: adminUsersError } = await supabase.from("admin_users").select("user_id");
if (adminUsersError) throw adminUsersError;
const adminUserIds = new Set(adminUsers?.map((a) => a.user_id));

for (const userSpec of demoUsers) {
  const authUser = authUserMap.get(userSpec.email.toLowerCase());
  if (!authUser) {
    fail(`Auth user eksik: ${userSpec.email}`);
    continue;
  }
  pass(`Auth user var: ${userSpec.email}`);

  const userAccount = userAccountMap.get(authUser.id);
  if (!userAccount) {
    fail(`user_accounts kaydı eksik: ${userSpec.email}`);
  } else if (userAccount.account_type !== "TEST" || userAccount.test_login_scope !== userSpec.loginScope) {
    fail(`user_accounts uyumsuz (${userSpec.email}): type=${userAccount.account_type}, scope=${userAccount.test_login_scope}`);
  } else {
    pass(`user_accounts doğrular: ${userSpec.email}`);
  }

  if (userSpec.isAdmin) {
    if (!adminUserIds.has(authUser.id)) {
      fail(`admin_users kaydı eksik: ${userSpec.email}`);
    } else {
      pass(`admin_users doğrular: ${userSpec.email}`);
    }
  }
}

// 2. Verify Organizations & Subscriptions
const { data: orgs, error: orgsError } = await supabase.from("organizations").select("id,slug,name");
if (orgsError) throw orgsError;
const orgMap = new Map(orgs?.map((o) => [o.slug, o]));

const { data: orgSubs, error: subsError } = await supabase.from("organization_subscriptions").select("organization_id,seat_limit,status");
if (subsError) throw subsError;
const subMap = new Map(orgSubs?.map((s) => [s.organization_id, s]));

for (const cap of capacityScenarios) {
  const org = orgMap.get(cap.slug);
  if (!org) {
    fail(`Organizasyon eksik: ${cap.slug}`);
    continue;
  }
  const sub = subMap.get(org.id);
  if (!sub) {
    fail(`Abonelik eksik: ${cap.slug}`);
  } else if (sub.status !== "ACTIVE" || sub.seat_limit !== cap.limit) {
    fail(`Abonelik uyumsuz (${cap.slug}): status=${sub.status}, limit=${sub.seat_limit} (beklenen ${cap.limit})`);
  } else {
    pass(`Organizasyon & Abonelik doğrular: ${cap.slug} (${sub.seat_limit} koltuk)`);
  }
}

// 3. Verify Memberships & Roles
const { data: members, error: membersError } = await supabase.from("organization_members").select("id,organization_id,user_id,email,role,status,department,title");
if (membersError) throw membersError;
const memberMap = new Map(members?.map((m) => [`${m.organization_id}:${m.email.toLowerCase()}`, m]));

for (const userSpec of demoUsers.filter((u) => u.organizationSlug)) {
  const org = orgMap.get(userSpec.organizationSlug);
  if (!org) continue;
  const member = memberMap.get(`${org.id}:${userSpec.email.toLowerCase()}`);
  if (!member) {
    fail(`Üyelik kaydı eksik: ${userSpec.email} @ ${userSpec.organizationSlug}`);
  } else {
    const diffs = [];
    if (member.role !== (userSpec.role || "EMPLOYEE")) diffs.push(`rol ${member.role} (beklenen ${userSpec.role})`);
    if (member.status !== (userSpec.status || "ACTIVE")) diffs.push(`durum ${member.status} (beklenen ${userSpec.status})`);
    if (userSpec.department && member.department !== userSpec.department) diffs.push(`departman ${member.department} (beklenen ${userSpec.department})`);
    if (diffs.length) {
      fail(`Üyelik uyumsuz (${userSpec.email}): ${diffs.join(", ")}`);
    } else {
      pass(`Üyelik doğrular: ${userSpec.email} (${member.role}, ${member.status})`);
    }
  }

  if (userSpec.additionalOrganizations) {
    for (const addOrgSpec of userSpec.additionalOrganizations) {
      const addOrg = orgMap.get(addOrgSpec.slug);
      if (!addOrg) {
        fail(`Ek organizasyon eksik: ${addOrgSpec.slug}`);
        continue;
      }
      const addMember = memberMap.get(`${addOrg.id}:${userSpec.email.toLowerCase()}`);
      if (!addMember) {
        fail(`Ek üyelik eksik: ${userSpec.email} @ ${addOrgSpec.slug}`);
      } else if (addMember.role !== addOrgSpec.role || addMember.status !== addOrgSpec.status) {
        fail(`Ek üyelik uyumsuz (${userSpec.email} @ ${addOrgSpec.slug}): role=${addMember.role}, status=${addMember.status}`);
      } else {
        pass(`Ek üyelik doğrular: ${userSpec.email} @ ${addOrgSpec.slug}`);
      }
    }
  }
}

// 4. Verify Invite Fixtures
const { data: invites, error: invitesError } = await supabase.from("organization_invites").select("id,organization_id,member_id,expires_at,revoked_at");
if (invitesError) throw invitesError;
const inviteMemberIds = new Set(invites?.map((i) => i.member_id));

for (const inviteSpec of inviteFixtures) {
  const org = orgMap.get(inviteSpec.organizationSlug);
  if (!org) continue;
  const member = memberMap.get(`${org.id}:${inviteSpec.email.toLowerCase()}`);
  if (!member) {
    fail(`Davet üyesi eksik: ${inviteSpec.email}`);
  } else if (!inviteMemberIds.has(member.id)) {
    fail(`organization_invites kaydı eksik: ${inviteSpec.email}`);
  } else {
    pass(`Davet fixture doğrular: ${inviteSpec.email} (${inviteSpec.kind})`);
  }
}

// 5. Verify Identity Collision
const qaOrg = orgMap.get(identityCollision.organizationSlug);
if (qaOrg) {
  for (const suffix of identityCollision.suffixes) {
    const email = `${identityCollision.emailPrefix}${suffix}@yenomi.test`;
    const member = memberMap.get(`${qaOrg.id}:${email.toLowerCase()}`);
    if (!member) {
      fail(`Kimlik çarpışması üyesi eksik: ${email}`);
    } else {
      pass(`Kimlik çarpışması üyesi doğrular: ${email} (${member.title})`);
    }
  }
}

// 6. Verify Card Profiles
const { data: profiles, error: profilesError } = await supabase.from("card_profiles").select("id,user_id,slug,name,is_published,card_status");
if (profilesError) throw profilesError;
const profileBySlugMap = new Map(profiles?.map((p) => [p.slug, p]));

for (const userSpec of demoUsers.filter((u) => u.profile)) {
  const authUser = authUserMap.get(userSpec.email.toLowerCase());
  const profileSpec = userSpec.profile;
  const profile = profileBySlugMap.get(profileSpec.slug);
  if (!profile) {
    fail(`Profil kaydı eksik: ${profileSpec.slug} (${userSpec.email})`);
  } else {
    const diffs = [];
    if (authUser && profile.user_id !== authUser.id) diffs.push(`user_id uyuşmazlığı`);
    if (profileSpec.isPublished !== undefined && profile.is_published !== profileSpec.isPublished) {
      diffs.push(`is_published ${profile.is_published} (beklenen ${profileSpec.isPublished})`);
    }
    if (profileSpec.cardStatus && profile.card_status !== profileSpec.cardStatus) {
      diffs.push(`card_status ${profile.card_status} (beklenen ${profileSpec.cardStatus})`);
    }
    if (diffs.length) {
      fail(`Profil uyumsuz (${profileSpec.slug}): ${diffs.join(", ")}`);
    } else {
      pass(`Profil doğrular: ${profileSpec.slug} (${userSpec.email})`);
    }
  }
}

// 7. Verify Physical Cards
const { data: physicalCards, error: physicalCardsError } = await supabase.from("physical_cards").select("id,card_code,status,owner_user_id,owner_profile_id,replaced_by_card_id");
if (physicalCardsError) throw physicalCardsError;
const cardCodeMap = new Map(physicalCards?.map((c) => [c.card_code, c]));

for (const userSpec of demoUsers.filter((u) => u.cards?.length)) {
  const authUser = authUserMap.get(userSpec.email.toLowerCase());
  for (const cardSpec of userSpec.cards) {
    const card = cardCodeMap.get(cardSpec.code);
    if (!card) {
      fail(`Fiziksel kart eksik: ${cardSpec.code} (${userSpec.email})`);
    } else if (card.status !== cardSpec.status) {
      fail(`Fiziksel kart durumu uyumsuz (${cardSpec.code}): ${card.status} (beklenen ${cardSpec.status})`);
    } else if (authUser && card.owner_user_id !== authUser.id) {
      fail(`Fiziksel kart sahibi uyumsuz (${cardSpec.code})`);
    } else {
      pass(`Fiziksel kart doğrular: ${cardSpec.code} (${card.status})`);
    }
  }
}

// Unassigned inventory stock checks
for (const unassignedCode of ["YN-LIFEUNASSGN1", "YN-QASTOCK0001A", "YN-QASTOCK0002A"]) {
  const card = cardCodeMap.get(unassignedCode);
  if (!card) {
    fail(`Stok kartı eksik: ${unassignedCode}`);
  } else if (card.status !== "UNASSIGNED" || card.owner_user_id !== null) {
    fail(`Stok kartı durumu uyumsuz (${unassignedCode}): status=${card.status}`);
  } else {
    pass(`Stok kartı doğrular: ${unassignedCode}`);
  }
}

// Replacement card link check
const replacementOld = cardCodeMap.get("YN-TRREPOLD0001");
const replacementNew = cardCodeMap.get("YN-TRREPNEW0001");
if (!replacementOld || !replacementNew) {
  fail("Değişim kartı ikilisi eksik");
} else if (replacementOld.replaced_by_card_id !== replacementNew.id) {
  fail(`Değişim kartı ilişkisi uyumsuz: ${replacementOld.replaced_by_card_id} (beklenen ${replacementNew.id})`);
} else {
  pass(`Değişim kartı ilişkisi doğrular: YN-TRREPOLD0001 -> YN-TRREPNEW0001`);
}

// 8. Verify Orders & Entitlements
const { data: orders, error: ordersError } = await supabase.from("commerce_orders").select("id,order_number,status,user_id,guest_email");
if (ordersError) throw ordersError;
const orderNumMap = new Map(orders?.map((o) => [o.order_number, o]));

const { data: entitlements, error: entitlementsError } = await supabase.from("entitlements").select("id,user_id,status,kind");
if (entitlementsError) throw entitlementsError;

for (const userSpec of demoUsers.filter((u) => u.orderNumber || u.entitlement)) {
  if (userSpec.orderNumber) {
    const order = orderNumMap.get(userSpec.orderNumber);
    if (!order) {
      fail(`Sipariş eksik: ${userSpec.orderNumber} (${userSpec.email})`);
    } else if (order.status !== "PAID") {
      fail(`Sipariş durumu uyumsuz (${userSpec.orderNumber}): ${order.status}`);
    } else {
      pass(`Sipariş doğrular: ${userSpec.orderNumber} (PAID)`);
    }
  }

  if (userSpec.entitlement) {
    const authUser = authUserMap.get(userSpec.email.toLowerCase());
    const userEntitlements = entitlements?.filter((e) => e.user_id === authUser?.id);
    if (!userEntitlements?.length) {
      fail(`Entitlement eksik: ${userSpec.email}`);
    } else {
      const match = userEntitlements.find((e) => e.status === userSpec.entitlement.status);
      if (!match) {
        fail(`Entitlement durumu uyumsuz (${userSpec.email}): beklenen ${userSpec.entitlement.status}`);
      } else {
        pass(`Entitlement doğrular: ${userSpec.email} (${match.status})`);
      }
    }
  }
}

// 9. Verify Guest Orders & Activation Tokens
const { data: tokens, error: tokensError } = await supabase.from("activation_tokens").select("id,order_id");
if (tokensError) throw tokensError;
const tokenOrderIdSet = new Set(tokens?.map((t) => t.order_id));

for (const guestSpec of guestOrders) {
  const order = orderNumMap.get(guestSpec.orderNumber);
  if (!order) {
    fail(`Misafir siparişi eksik: ${guestSpec.orderNumber}`);
  } else if (order.status !== "PAID" || order.user_id !== null) {
    fail(`Misafir siparişi uyumsuz (${guestSpec.orderNumber}): status=${order.status}, user_id=${order.user_id}`);
  } else if (!tokenOrderIdSet.has(order.id)) {
    fail(`Misafir aktivasyon token'ı eksik: ${guestSpec.orderNumber}`);
  } else {
    pass(`Misafir siparişi & token doğrular: ${guestSpec.orderNumber}`);
  }
}

if (problems.length) {
  console.error(`\nGerçek Supabase Staging DB Doğrulaması BAŞARISIZ (${problems.length} hata):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("\nTüm canonical matrix fixture'ları gerçek Supabase Staging DB üzerinde tam doğrulandı!");
