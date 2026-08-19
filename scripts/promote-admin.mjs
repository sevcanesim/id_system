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

const email = process.argv[2] || env.ADMIN_EMAIL
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!email) {
  console.error('Kullanım: npm run admin:promote -- kullanici@example.com')
  process.exit(1)
}
if (!url || !serviceKey) {
  console.error('Eksik env: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

let page = 1
let user = null
while (!user) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
  if (error) {
    console.error(`Auth kullanıcıları okunamadı: ${error.message}`)
    process.exit(1)
  }
  user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase()) || null
  if (user || data.users.length < 100) break
  page += 1
}

if (!user) {
  console.error(`Kullanıcı bulunamadı: ${email}`)
  console.error('Önce uygulamadan bu e-posta ile hesap oluştur.')
  process.exit(1)
}

const { error } = await supabase
  .from('admin_users')
  .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })

if (error) {
  console.error(`Admin yetkisi verilemedi: ${error.message}`)
  process.exit(1)
}

console.log(`✓ Admin yetkisi verildi: ${email}`)
console.log(`  user_id: ${user.id}`)
