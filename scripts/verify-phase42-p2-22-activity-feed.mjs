import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};

const types = read("app/kurumsal/panel/domain/types.ts");
const api = read("app/api/organizations/members/route.ts");
const client = read("app/kurumsal/panel/CorporatePanelClient.tsx");
const seed = read("scripts/seed-demo-scenarios.mjs");
const migration = read("supabase/migrations/20260818190000_member_activity_timestamps.sql");

ok(types.includes("last_activity_at: string;"), "Member type last_activity_at eksik");
ok(api.includes("last_activity_at"), "Members API last_activity_at döndürmüyor");
ok(client.includes("b.last_activity_at || b.created_at"), "Recent activity sıralaması activity timestamp kullanmıyor");
ok(client.includes("member.last_activity_at || member.created_at"), "Activity renderer activity timestamp kullanmıyor");
ok(!client.match(/recentActivity[\s\S]{0,1000}relativeTime\(member\.created_at\)/), "Recent activity created_at'a geri dönüyor");
ok(seed.includes("hoursAgo: 2"), "Demo activity fixture deterministic başlangıç zamanı eksik");
ok(seed.includes("last_activity_at: new Date(Date.now() - activity.hoursAgo * 3600000).toISOString()"), "Demo activity timeline yazılmıyor");
ok(migration.includes("add column if not exists last_activity_at"), "Activity migration eksik");
ok(migration.includes("organization_members_org_activity_idx"), "Activity index eksik");

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join("\n"));
  process.exit(1);
}
console.log("PASS P2-22 activity feed contract: 8/8");
