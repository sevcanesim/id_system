import { readFileSync } from "node:fs";

const journeys = [
  {
    id: "PUBLIC",
    label: "Public routes, hydrated forms and mobile navigation",
    file: "tests/e2e/public-critical.spec.ts",
    required: ["hydrates without page errors", "mobile public navigation opens and closes", "login form accepts input after hydration"],
  },
  {
    id: "CONVERSION",
    label: "Homepage and catalogue conversion contracts",
    file: "tests/e2e/home-conversion.spec.ts",
    required: ["hero primary CTA", "mobile sticky CTA", "package comparison table"],
  },
  {
    id: "SALES_COPY",
    label: "Public value proposition and payment-boundary copy",
    file: "tests/e2e/public-sales-copy.spec.ts",
    required: ["individual Premium value proposition", "clear product and payment boundary", "corporate page sells a managed team identity system"],
  },
  {
    id: "RESPONSIVE",
    label: "Public, commerce and unauthenticated protected-route responsiveness",
    file: "tests/e2e/responsive-master.spec.ts",
    required: ["complete responsive matrix", "stable unauthenticated responsive boundary", "touch-target invariant"],
  },
  {
    id: "AUTHENTICATED_UI",
    label: "Individual and corporate authenticated layouts",
    file: "tests/e2e/authenticated-visual-layout.spec.ts",
    required: ["individual authenticated layout", "corporate authenticated layout", "auditCorporateOwnCard"],
  },
];

const missing = [];

for (const journey of journeys) {
  const source = readFileSync(journey.file, "utf8");
  const absent = journey.required.filter((marker) => !source.includes(marker));
  if (absent.length) {
    missing.push(`${journey.id}: ${absent.join(", ")}`);
    continue;
  }

  console.log(`PASS  ${journey.id} — ${journey.label}`);
}

if (missing.length) {
  for (const entry of missing) {
    console.error(`FAIL  ${entry}`);
  }
  process.exit(1);
}

console.log("\nEXTERNAL  PayTR sandbox payment → entitlement → activation and production-like authenticated fixtures require isolated credentials and are not claimed as executed by this static contract.");
console.log("Critical journey coverage contract: PASS");
