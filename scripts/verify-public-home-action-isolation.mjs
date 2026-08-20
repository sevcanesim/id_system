import fs from "node:fs";

if (fs.existsSync("app/public-conversion.css")) {
  throw new Error("Retired app/public-conversion.css must stay deleted; public chrome lives in canonical.css.");
}
if (fs.existsSync("app/globals.css")) {
  throw new Error("Retired app/globals.css must stay deleted; public chrome lives in canonical.css.");
}
if (fs.existsSync("app/LandingClient.tsx")) {
  throw new Error("Retired app/LandingClient.tsx must stay deleted; live homepage is app/page.tsx.");
}

const css = fs.readFileSync("app/canonical.css", "utf8");
const page = fs.readFileSync("app/page.tsx", "utf8");

const failures = [];
if (!css.includes(".home-mockup") || !css.includes(".home-premium")) failures.push("live homepage chrome missing from canonical.css");
if (page.includes('className="p4-display"') && page.includes("<span>Tek bir bağlantıda.")) failures.push("hero title still uses a styled span");
if (/home-mockup__button--primary[^{]*\{[^}]*linear-gradient/i.test(css)) failures.push("live homepage primary CTA still declares a gradient");
if (css.includes("!important")) failures.push("canonical CSS contains !important");

if (failures.length) {
  console.error("PUBLIC HOME ACTION ISOLATION FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("PUBLIC HOME ACTION ISOLATION PASSED");
console.log("- Live homepage is app/page.tsx");
console.log("- Homepage chrome lives in canonical.css");
console.log("- Retired public-conversion.css / LandingClient stay deleted");
console.log("- Canonical CSS remains !important-free");
