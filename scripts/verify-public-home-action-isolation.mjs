import fs from "node:fs";

const publicCss = fs.readFileSync("app/public-conversion.css", "utf8");
const globals = fs.readFileSync("app/globals.css", "utf8");
const page = fs.readFileSync("app/LandingClient.tsx", "utf8");

const failures = [];
if (!publicCss.includes("--p4-primary:var(--accent-champagne)")) failures.push("missing route-owned public primary token");
if (!publicCss.includes("background-image:none")) failures.push("public CTA gradient guard missing");
if (/(p4-button-primary)[^{]*\{[^}]*linear-gradient/i.test(publicCss)) failures.push("public CTA still declares a gradient");
if (/\.p4-display[^}]*span/.test(publicCss)) failures.push("hero display span color override still exists");
if (page.includes('className="p4-display"') && page.includes('<span>Tek bir bağlantıda.')) failures.push("hero title still uses a styled span");
if (/\.global-header-cta\{background:var\(--primary-hover\)!important/.test(globals)) failures.push("global header CTA still has the final important override");
if ((publicCss.match(/!important/g) || []).length !== 0) failures.push("public conversion CSS contains !important");

if (failures.length) {
  console.error("PUBLIC HOME ACTION ISOLATION FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("PUBLIC HOME ACTION ISOLATION PASSED");
console.log("- Route-owned champagne CTA token present");
console.log("- Public CTA gradient guard present");
console.log("- Hero title has no span color override");
console.log("- Global final header important override removed");
console.log("- public-conversion.css important count: 0");
