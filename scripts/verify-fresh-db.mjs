import { createClient } from '@supabase/supabase-js'
import fs from "node:fs";
import path from "node:path";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileValues = readEnvFile(path.resolve(process.cwd(), ".env.local"));
const env = { ...fileValues, ...process.env };

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Eksik env: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const checks = [
  ['card_profiles', 'id,public_id,slug,is_published'],
  ['admin_users', 'user_id,created_at'],
  ['nfc_orders', 'id,user_id,status,created_at'],
  ['admin_audit_log', 'id,action,target_table,created_at'],
  ['products', 'id'],
  ['product_variants', 'id,product_id'],
  ['commerce_orders', 'id'],
  ['commerce_order_items', 'id'],
  ['commerce_payment_attempts', 'id,order_id,provider,status,amount_kurus,payment_page_url,updated_at'],
  ['payment_callback_receipts', 'id,provider,provider_reference_hash,amount_kurus,status,received_at'],
  ['system_error_logs', 'id,request_id,source,error_code,user_id,organization_id,occurred_at'],
  ['auth_login_events', 'id,succeeded,reason,email_domain,is_test_identity,occurred_at'],
  ['privacy_requests', 'id,user_id,request_type,status,identity_verified_at,resolved_at,resolution_code,created_at'],
  ['privacy_request_events', 'id,request_id,actor_role,action,from_status,to_status,created_at'],
  ['payment_attempts', 'id'],
  ['entitlements', 'id,user_id,kind,status'],
  ['activation_tokens', 'id'],
  ['organizations', 'id'],
  ['organization_members', 'id,organization_id,user_id,email,role,status'],
  ['organization_invites', 'id,organization_id,member_id,expires_at,used_at,revoked_at,send_count,last_sent_at'],
  ['physical_cards', 'id,card_code,owner_profile_id,owner_user_id,organization_id,status,replaced_by_card_id'],
  ['business_plans', 'id,code,seat_limit'],
  ['organization_subscriptions', 'id,organization_id,plan_id,status,seat_limit,expires_at'],
  ['organization_card_templates', 'id,organization_id,name,is_default,primary_color'],
  ['card_view_events', 'id,profile_id,viewed_at,country,city,referrer'],
  ['commerce_order_consents', 'order_id,distance_sales_accepted,personalization_accepted'],
  ['user_accounts', 'id,account_type,test_login_scope,identity_product_family,package_code'],
  ['user_identity_types', 'id,user_id,product_family,occupancy,package_code'],
  ['identity_package_catalog', 'code,occupancy,product_family'],
]

let failed = false
console.log(`Supabase: ${url}`)
console.log('Fresh DB smoke test başlıyor...\n')

for (const [table, columns] of checks) {
  // Gerçek GET sorgusu kullan: yalnız HEAD kontrolü bazı PostgREST/schema-cache
  // problemlerini kaçırabilir. limit(1) runtime API davranışına daha yakındır.
  const { error } = await supabase.from(table).select(columns).limit(1)
  if (error) {
    failed = true
    console.error(`✗ ${table}: ${error.message}`)
  } else {
    console.log(`✓ ${table}`)
  }
}

// public_id default üretimini metadata üzerinden doğrudan doğrulamak yerine
// kontrollü bir şema sorgusu için PostgREST'in kolon seçimini kullanıyoruz.
const { error: profileIdError } = await supabase
  .from('card_profiles')
  .select('public_id', { head: true })
if (profileIdError) {
  failed = true
  console.error(`✗ card_profiles.public_id: ${profileIdError.message}`)
} else {
  console.log('✓ card_profiles.public_id')
}

const { data: admins, error: adminError } = await supabase
  .from('admin_users')
  .select('user_id')
  .limit(5)
if (adminError) {
  failed = true
  console.error(`✗ admin_users okunamadı: ${adminError.message}`)
} else if (!admins?.length) {
  console.warn('! admin_users boş: ilk yöneticiyi henüz eklemedin.')
} else {
  console.log(`✓ admin_users: ${admins.length} yönetici kaydı bulundu`)
}

console.log('')
if (failed) {
  console.error('Fresh DB smoke test BAŞARISIZ.')
  process.exit(1)
}
console.log('Fresh DB smoke test BAŞARILI.')
