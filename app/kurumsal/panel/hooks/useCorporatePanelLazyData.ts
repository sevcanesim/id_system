"use client";

import { useRef } from "react";
import { corporatePanelDataResources, type CorporatePanelDataResource } from "../domain/tab-data";
import type { CorporatePanelTab } from "../domain/navigation";

type ResourceLoader = (organizationId: string, accessToken: string) => Promise<void>;
type ResourceLoaders = Record<CorporatePanelDataResource, ResourceLoader>;

export function useCorporatePanelLazyData(loaders: ResourceLoaders) {
  const loadedDataRef = useRef(new Set<string>());
  const inFlightDataRef = useRef(new Map<string, Promise<void>>());
  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;

  async function loadDataResource(
    resource: CorporatePanelDataResource,
    organizationId: string,
    accessToken: string,
    force = false,
  ) {
    const key = `${organizationId}:${resource}`;
    if (!force && loadedDataRef.current.has(key)) return;
    if (!force) {
      const existing = inFlightDataRef.current.get(key);
      if (existing) return existing;
    }

    const request = loadersRef.current[resource](organizationId, accessToken)
      .then(() => {
        loadedDataRef.current.add(key);
      });

    inFlightDataRef.current.set(key, request);
    try {
      await request;
    } finally {
      inFlightDataRef.current.delete(key);
    }
  }

  async function loadDataForTab(
    tab: CorporatePanelTab,
    organizationId: string,
    accessToken: string,
    force = false,
  ) {
    await Promise.all(
      corporatePanelDataResources(tab).map((resource) =>
        loadDataResource(resource, organizationId, accessToken, force),
      ),
    );
  }

  function clearOrganizationCache(organizationId: string) {
    for (const key of loadedDataRef.current) {
      if (key.startsWith(`${organizationId}:`)) loadedDataRef.current.delete(key);
    }
  }

  return { loadDataForTab, clearOrganizationCache };
}
