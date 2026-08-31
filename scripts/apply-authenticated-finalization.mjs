import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Pattern not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Pattern not unique: ${label}`);
  return source.slice(0, index) + after + source.slice(index + before.length);
}

// Package aliases requested by the delivery contract.
const packagePath = "package.json";
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts.test = "npm run test:critical";
pkg.scripts["verify:css-architecture"] = "node scripts/verify-css-budget.mjs";
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

// CardWizard reuses the same card action hook as /kartim.
const wizardPath = "app/olustur/CardWizard.tsx";
let wizard = fs.readFileSync(wizardPath, "utf8");
wizard = replaceOnce(
  wizard,
  'import { useUnsavedChanges } from "../components/UnsavedChangesContext";',
  'import { useUnsavedChanges } from "../components/UnsavedChangesContext";\nimport { useProfileCardActions } from "../hooks/useProfileCardActions";',
  "CardWizard action hook import",
);
wizard = replaceOnce(
  wizard,
  '  const isBusinessCard = searchParams.get("business") === "1" && Boolean(businessOrganizationId);\n',
  '  const isBusinessCard = searchParams.get("business") === "1" && Boolean(businessOrganizationId);\n  const profileCardActions = useProfileCardActions({\n    profileId,\n    slug: profileSlug,\n    publicUrl: cardShareUrl(profileSlug || ""),\n    shareTitle: data.name || "Yenomi ID",\n    isPublished,\n    onPublishedChange: setIsPublished,\n    onMessage: setMessage,\n  });\n',
  "CardWizard action hook call",
);
wizard = replaceOnce(
  wizard,
  'onClick={() => navigator.clipboard?.writeText(cardShareUrl(profileSlug || ""))}',
  'onClick={() => void profileCardActions.copyLink()}',
  "CardWizard copy action",
);
fs.writeFileSync(wizardPath, wizard);

// Move the corporate lazy-load cache/dispatch algorithm out of the client monolith.
const corporatePath = "app/kurumsal/panel/CorporatePanelClient.tsx";
let corporate = fs.readFileSync(corporatePath, "utf8");
corporate = replaceOnce(
  corporate,
  'import { FormEvent, useEffect, useMemo, useRef, useState } from "react";',
  'import { FormEvent, useEffect, useMemo, useState } from "react";',
  "CorporatePanelClient useRef import",
);
corporate = replaceOnce(
  corporate,
  'import { corporatePanelDataResources, type CorporatePanelDataResource } from "./domain/tab-data";',
  'import { useCorporatePanelLazyData } from "./hooks/useCorporatePanelLazyData";',
  "CorporatePanelClient lazy imports",
);
const oldLazyBlock = `  const loadedDataRef = useRef(new Set<string>());
  const inFlightDataRef = useRef(new Map<string, Promise<void>>());

  async function loadDataResource(
    resource: CorporatePanelDataResource,
    id: string,
    access: string,
    force = false,
  ) {
    const key = \`${"${id}:${resource}"}\`;
    if (!force && loadedDataRef.current.has(key)) return;
    if (!force) {
      const existing = inFlightDataRef.current.get(key);
      if (existing) return existing;
    }

    const request = (async () => {
      switch (resource) {
        case "members": await loadMembers(id, access); break;
        case "templates": await loadTemplates(id, access); break;
        case "physicalCards": await loadPhysicalCards(id, access); break;
        case "memberCardStatuses": await loadMemberCardStatuses(id, access); break;
        case "analytics": await loadCardAnalytics(id, access); break;
        case "jobTitles": await loadJobTitles(id, access); break;
        case "titleRequests": await loadTitleRequests(id, access); break;
        case "corporateLinks": await loadCorporateLinks(id, access); break;
      }
      loadedDataRef.current.add(key);
    })();

    inFlightDataRef.current.set(key, request);
    try {
      await request;
    } finally {
      inFlightDataRef.current.delete(key);
    }
  }

  async function loadDataForTab(
    tab: CorporatePanelTab,
    id: string,
    access: string,
    force = false,
  ) {
    await Promise.all(
      corporatePanelDataResources(tab).map((resource) => loadDataResource(resource, id, access, force)),
    );
  }
`;
const newLazyBlock = `  const { loadDataForTab } = useCorporatePanelLazyData({
    members: loadMembers,
    templates: loadTemplates,
    physicalCards: loadPhysicalCards,
    memberCardStatuses: loadMemberCardStatuses,
    analytics: (id, access) => loadCardAnalytics(id, access),
    jobTitles: loadJobTitles,
    titleRequests: loadTitleRequests,
    corporateLinks: loadCorporateLinks,
  });
`;
corporate = replaceOnce(corporate, oldLazyBlock, newLazyBlock, "CorporatePanelClient lazy block");
fs.writeFileSync(corporatePath, corporate);

fs.rmSync("scripts/apply-authenticated-finalization.mjs");
console.log("Authenticated surface finalization applied.");
