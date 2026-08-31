import fs from "node:fs";

const file = "app/kurumsal/panel/CorporatePanelClient.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Pattern not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Pattern not unique: ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  'import { FormEvent, useEffect, useMemo, useState } from "react";',
  'import { FormEvent, useEffect, useMemo, useRef, useState } from "react";',
  "react useRef import",
);
replaceOnce(
  'import { fetchWithPanelTimeout, waitForInitialPanelLoads } from "./domain/runtime";',
  'import { fetchWithPanelTimeout } from "./domain/runtime";\nimport { corporatePanelDataResources, type CorporatePanelDataResource } from "./domain/tab-data";',
  "runtime import",
);

replaceOnce(
`  useEffect(() => {
    const routed = CORPORATE_PANEL_ROUTE_TO_TAB[pathname];
    const requested = searchParams.get("tab");
    const bulkInviteRequested = searchParams.get("bulkInvite") === "1";
    if (routed) setActiveTab(routed);
    else if (isCorporatePanelTab(requested)) {
      setActiveTab(requested);
    }
    setShowBulkInvite(routed === "employees" && bulkInviteRequested);
    window.sessionStorage.setItem("yenomi-active-portal", "business");
    fetch("/api/public-config?scope=corporate")
      .then(async (response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((data) => {
        setSeatPacks(data.seatPacks || []);
        setTemplateOptions(data.templateOptions || []);
      })
      .catch(() => setMessage("Kart paketleri DB’den yüklenemedi."));
  }, [pathname, searchParams]);`,
`  useEffect(() => {
    const routed = CORPORATE_PANEL_ROUTE_TO_TAB[pathname];
    const requested = searchParams.get("tab");
    const bulkInviteRequested = searchParams.get("bulkInvite") === "1";
    if (routed) setActiveTab(routed);
    else if (isCorporatePanelTab(requested)) setActiveTab(requested);
    setShowBulkInvite(routed === "employees" && bulkInviteRequested);
    window.sessionStorage.setItem("yenomi-active-portal", "business");
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public-config?scope=corporate")
      .then(async (response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSeatPacks(data.seatPacks || []);
        setTemplateOptions(data.templateOptions || []);
      })
      .catch(() => {
        if (!cancelled) setMessage("Kart paketleri DB’den yüklenemedi.");
      });
    return () => { cancelled = true; };
  }, []);`,
  "route/public-config effect",
);

replaceOnce(
`  function selectOrganization(id: string) {`,
`  const loadedDataRef = useRef(new Set<string>());
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

  function selectOrganization(id: string) {`,
  "lazy loader insertion",
);

replaceOnce(
`        const result = await waitForInitialPanelLoads([
          loadMembers(id, access),
          loadTemplates(id, access),
          loadPhysicalCards(id, access),
          loadCardAnalytics(id, access),
          loadMemberCardStatuses(id, access),
          loadJobTitles(id, access),
          loadTitleRequests(id, access),
          loadCorporateLinks(id, access),
        ]);
        if (result.timedOut) {
          setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
        }`,
`        await loadDataForTab(currentTab, id, access, true);`,
  "organization switch eager loads",
);

replaceOnce(
`      const result = await waitForInitialPanelLoads([
        loadMembers(id, access),
        loadTemplates(id, access),
        loadPhysicalCards(id, access),
        loadCardAnalytics(id, access),
        loadMemberCardStatuses(id, access),
        loadJobTitles(id, access),
        loadTitleRequests(id, access),
        loadCorporateLinks(id, access),
      ]);
      if (result.timedOut) {
        setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
      }`,
`      await loadDataForTab(currentTab, id, access, true);`,
  "reload eager loads",
);

replaceOnce(
`          const result = await waitForInitialPanelLoads([
            loadMembers(id, access),
            loadPhysicalCards(id, access),
            loadMemberCardStatuses(id, access),
            loadJobTitles(id, access),
            loadTitleRequests(id, access),
          ]);
          if (result.timedOut) setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");`,
`          await loadDataForTab("employees", id, access);`,
  "department manager eager loads",
);

replaceOnce(
`          const result = await waitForInitialPanelLoads([
            loadMembers(id, access),
            loadTemplates(id, access),
            loadPhysicalCards(id, access),
            loadCardAnalytics(id, access),
            loadMemberCardStatuses(id, access),
            loadJobTitles(id, access),
            loadTitleRequests(id, access),
            loadCorporateLinks(id, access),
          ]);
          if (result.timedOut) setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");`,
`          await loadDataForTab(currentTab, id, access);`,
  "initial eager loads",
);

replaceOnce(
`  useEffect(() => {
    if (!loading) { setLoadingSlow(false); return; }`,
`  useEffect(() => {
    if (!selected || loading) return;
    let cancelled = false;
    void token().then(async (access) => {
      if (!access || cancelled) return;
      await loadDataForTab(currentTab, selected, access);
    });
    return () => { cancelled = true; };
  }, [currentTab, selected, loading]);

  useEffect(() => {
    if (!loading) { setLoadingSlow(false); return; }`,
  "tab lazy-load effect",
);

if (source.includes("waitForInitialPanelLoads")) throw new Error("Legacy aggregate loader still present");
fs.writeFileSync(file, source);

fs.rmSync("scripts/apply-corporate-lazy-refactor.mjs");
fs.rmSync(".github/workflows/apply-corporate-lazy-refactor.yml");
console.log("Corporate panel lazy-loading refactor applied.");
