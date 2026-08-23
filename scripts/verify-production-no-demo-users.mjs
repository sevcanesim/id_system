import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((raw) => raw.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        let value = line.slice(i + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        return [line.slice(0, i).trim(), value];
      }),
  );
}

const env = {
  ...readEnvFile(path.resolve(process.cwd(), ".env.local")),
  ...process.env,
};

function fail(message) {
  console.error(`Production demo-account kontrolü BAŞARISIZ: ${message}`);
  process.exit(1);
}

const url = String(
  env.PRODUCTION_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  "",
).trim();

const key = String(
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SECRET_KEY ||
  "",
).trim();

const expectedRef = String(
  env.PRODUCTION_SUPABASE_PROJECT_REF || "",
).trim();

if (!url || !key || !expectedRef) {
  fail("production Supabase URL, service role key ve project ref gerekli.");
}

if (!url.includes(`https://${expectedRef}.supabase.co`)) {
  fail("Supabase URL production project ref ile eşleşmiyor.");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let page = 1;
const forbidden = [];

while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 200,
  });

  if (error) fail(error.message);

  for (const user of data.users) {
    if (user.email?.toLowerCase().endsWith("@yenomi.test")) {
      forbidden.push(user.email);
    }
  }

  if (data.users.length < 200) break;

  page += 1;

  if (page > 50) {
    fail("beklenmeyen kullanıcı sayısı; tarama güvenlik sınırını aştı.");
  }
}

if (forbidden.length) {
  fail(
    `${forbidden.length} demo/test Auth hesabı production projesinde bulundu: ` +
    `${forbidden.slice(0, 5).join(", ")}${forbidden.length > 5 ? " …" : ""}`,
  );
}

console.log("Production demo-account kontrolü BAŞARILI: @yenomi.test hesabı yok.");
