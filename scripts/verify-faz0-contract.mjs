import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const required = ["verify:faz0:static", "verify:faz0:local", "verify:faz0:runtime"];
for (const key of required) {
  if (!pkg.scripts?.[key]) {
    console.error(`FAZ 0 contract FAILED: missing npm script ${key}`);
    process.exit(1);
  }
}

const doc = fs.readFileSync(new URL("../docs/FAZ_6_FINAL_RELEASE_QUALIFICATION_V25.8.61_RC3.md", import.meta.url), "utf8");
if (!doc.includes("verify:faz6:local") || !doc.includes("FAZ 0–5")) {
  console.error("FAZ 0 contract FAILED: live FAZ 6 qualification record does not keep the FAZ 0–5 static chain.");
  process.exit(1);
}

console.log("FAZ 0 contract PASS: canonical commands and live qualification record are present.");
