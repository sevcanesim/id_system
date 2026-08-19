import fs from "node:fs";
import path from "node:path";

const refPath = path.resolve(process.cwd(), "supabase/.temp/project-ref");
if (!fs.existsSync(refPath)) {
  console.log("Supabase CLI linki henüz oluşturulmamış.");
  console.log("Çalıştır: npx supabase link --project-ref YENI_PROJECT_REF");
  process.exit(0);
}
const ref = fs.readFileSync(refPath, "utf8").trim();
console.log(`Bağlı Supabase project ref: ${ref}`);
