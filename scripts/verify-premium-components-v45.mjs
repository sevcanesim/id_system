import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const files = {
  ds: path.join(root,"app/components/ui/DesignSystem.tsx"),
  states: path.join(root,"app/components/ui/States.tsx"),
  interactive: path.join(root,"app/components/ui/Interactive.tsx"),
  css: path.join(root,"app/canonical.css"),
};
for (const [name,file] of Object.entries(files)) if (!fs.existsSync(file)) throw new Error(`${name} missing: ${file}`);
const ds=fs.readFileSync(files.ds,"utf8");
const states=fs.readFileSync(files.states,"utf8");
const interactive=fs.readFileSync(files.interactive,"utf8");
const css=fs.readFileSync(files.css,"utf8");
const required=["Avatar","Breadcrumbs","Tooltip","ProductCard","PricingCard"];
for(const item of required) if(!ds.includes(`function ${item}`)) throw new Error(`Missing component ${item}`);
for(const item of ["ErrorState"]) if(!states.includes(`function ${item}`)) throw new Error(`Missing state ${item}`);
for(const item of ["ArrowRight","ArrowLeft","Home","End"]) if(!interactive.includes(item)) throw new Error(`Tabs keyboard support missing ${item}`);
for(const item of ["ds-skeleton-shimmer","ds-modal-in","ds-drawer-in","ds-toast-in","prefers-reduced-motion","ds-product-card","ds-pricing-card","ds-avatar","ds-tooltip"]) if(!css.includes(item)) throw new Error(`Missing CSS contract ${item}`);
console.log("V45 premium component contract: PASS");
