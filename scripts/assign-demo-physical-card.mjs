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
if (!url || !serviceKey) throw new Error("Supabase URL ve service role/secret key gerekli.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const OWNER_EMAIL = "demo.corp5.full@yenomi.test";
const ORG_SLUG = "demo-sirket-5-tam";
const CARD_CODE = "YN-DEMO5FULL001";

const { data: organization, error: orgError } = await supabase
  .from("organizations")
  .select("id,name")
  .eq("slug", ORG_SLUG)
  .single();
if (orgError || !organization) throw new Error(`Şirket bulunamadı: ${orgError?.message || ORG_SLUG}`);

const { data: member, error: memberError } = await supabase
  .from("organization_members")
  .select("id,user_id,email,full_name,title,department,status")
  .eq("organization_id", organization.id)
  .eq("email", OWNER_EMAIL)
  .single();
if (memberError || !member?.user_id) throw new Error(`Aktif şirket sahibi bulunamadı: ${memberError?.message || OWNER_EMAIL}`);

let { data: profile, error: profileError } = await supabase
  .from("card_profiles")
  .select("id,user_id")
  .eq("user_id", member.user_id)
  .maybeSingle();
if (profileError) throw profileError;

if (profile) {
  const { error: repairError } = await supabase
    .from("card_profiles")
    .update({
      organization_id: organization.id,
      slug: "demo-5-tam-dolu",
      name: member.full_name || "Demo 5 Tam Dolu",
      company: organization.name,
      email: member.email,
    })
    .eq("id", profile.id)
    .eq("user_id", member.user_id);
  if (repairError) throw new Error(`Demo profil kimliği düzeltilemedi: ${repairError.message}`);
}

if (!profile) {
  const inserted = await supabase
    .from("card_profiles")
    .insert({
      user_id: member.user_id,
      slug: "demo-5-tam-dolu",
      name: member.full_name || "Demo 5 Tam Dolu",
      role: member.title || "Şirket Sahibi",
      company: organization.name,
      email: member.email,
      is_published: true,
    })
    .select("id,user_id")
    .single();
  if (inserted.error || !inserted.data) throw new Error(`Kurumsal profil oluşturulamadı: ${inserted.error?.message}`);
  profile = inserted.data;
}

const { data: existingCard, error: existingError } = await supabase
  .from("physical_cards")
  .select("id,card_code,status,owner_user_id,organization_id")
  .eq("organization_id", organization.id)
  .eq("owner_user_id", member.user_id)
  .maybeSingle();
if (existingError) throw existingError;

let card = existingCard;
if (!card) {
  const inserted = await supabase
    .from("physical_cards")
    .insert({
      card_code: CARD_CODE,
      owner_profile_id: profile.id,
      owner_user_id: member.user_id,
      organization_id: organization.id,
      activated_at: new Date().toISOString(),
      status: "ACTIVE",
    })
    .select("id,card_code,status,owner_user_id,organization_id")
    .single();
  if (inserted.error || !inserted.data) throw new Error(`Fiziksel kart atanamadı: ${inserted.error?.message}`);
  card = inserted.data;
}

console.log("Atanmış demo fiziksel kart hazır:");
console.log(`- Çalışan: ${member.full_name} <${member.email}>`);
console.log(`- Şirket: ${organization.name}`);
console.log(`- Kart: ${card.card_code}`);
console.log(`- Durum: ${card.status}`);
