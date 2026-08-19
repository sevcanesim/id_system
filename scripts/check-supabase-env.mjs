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

function decodeJwtPayload(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const fileValues = readEnvFile(path.resolve(process.cwd(), ".env.local"));
const env = { ...fileValues, ...process.env };
const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const publicKey = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

let failed = false;
function result(ok, text) {
  console.log(`${ok ? "✓" : "✗"} ${text}`);
  if (!ok) failed = true;
}

result(Boolean(url), "NEXT_PUBLIC_SUPABASE_URL tanımlı");
result(Boolean(publicKey), "Public/anon Supabase anahtarı tanımlı");
result(Boolean(serviceKey), "SUPABASE_SERVICE_ROLE_KEY tanımlı");

let projectRef = "";
try {
  const hostname = new URL(url).hostname;
  projectRef = hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : "";
  result(Boolean(projectRef), "Supabase URL geçerli proje adresi");
} catch {
  result(false, "Supabase URL geçerli değil");
}

for (const [label, key] of [["public/anon", publicKey], ["service-role", serviceKey]]) {
  if (!key) continue;
  const payload = decodeJwtPayload(key);
  if (payload?.ref && projectRef) {
    result(payload.ref === projectRef, `${label} anahtarı URL ile aynı Supabase projesine ait`);
  } else if (key.startsWith("sb_")) {
    console.log(`• ${label} anahtarı yeni Supabase anahtar formatında; proje eşleşmesi çalışma anında doğrulanır.`);
  } else {
    console.log(`• ${label} anahtarının proje referansı yerel olarak okunamadı.`);
  }
}

if (failed) {
  console.error("\nSupabase ortam değişkenlerini düzeltmeden admin, ödeme ve aktivasyon işlemlerini çalıştırma.");
  process.exit(1);
}
console.log("\nSupabase ortam değişkenlerinin temel kontrolü geçti.");
