import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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

const requiredMembers = [
  { email: "demo.departman.yonetici@yenomi.test", role: "DEPARTMENT_MANAGER", department: "Satış" },
  { email: "demo.calisan.atanmis@yenomi.test", role: "EMPLOYEE", department: "Satış" },
];

const { data, error } = await supabase
  .from("organization_members")
  .select("email,role,status,department")
  .in("email", requiredMembers.map((member) => member.email));

if (error) {
  console.error(`E2E fixture kontrolü BAŞARISIZ: ${error.message}`);
  console.error("Önce v25.6 migration'ını izole staging veritabanına uygulayın.");
  process.exit(1);
}

const problems = requiredMembers.flatMap((expected) => {
  const actual = data?.find((member) => member.email === expected.email);
  if (!actual) return [`${expected.email}: kayıt bulunamadı`];
  const differences = [];
  if (actual.role !== expected.role) differences.push(`rol ${actual.role} (beklenen ${expected.role})`);
  if (actual.department !== expected.department) differences.push(`departman ${actual.department ?? "boş"} (beklenen ${expected.department})`);
  if (actual.status !== "ACTIVE") differences.push(`durum ${actual.status} (beklenen ACTIVE)`);
  return differences.length ? [`${expected.email}: ${differences.join(", ")}`] : [];
});

if (problems.length) {
  console.error("E2E fixture kontrolü BAŞARISIZ:");
  for (const problem of problems) console.error(`- ${problem}`);
  console.error("E2E başlatılmadı. Migration + seed işlemlerini yalnız izole staging DB üzerinde tamamlayın.");
  console.error("Paylaşımlı DB için --allow-non-empty kullanmayın.");
  process.exit(1);
}

console.log("E2E fixture/migration ön kontrolü BAŞARILI.");
