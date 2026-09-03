"use client";

import { useEffect, useState } from "react";
import { isIndividualPremiumPackage } from "../../../lib/commerce/packages";
import { getBrowserSession } from "../../../lib/auth/get-browser-session";

type PremiumAccess = "checking" | "premium" | "locked";
type EntitlementPayload = { entitlements?: Array<{ package_code?: string | null }> };

export function useIndividualPremiumAccess(): PremiumAccess {
  const [access, setAccess] = useState<PremiumAccess>("checking");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { accessToken } = await getBrowserSession();
      if (!accessToken) {
        if (!cancelled) setAccess("locked");
        return;
      }
      try {
        const response = await fetch("/api/commerce/entitlements", {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const payload = response.ok ? await response.json() as EntitlementPayload : {};
        const premium = (payload.entitlements ?? []).some((entitlement) => isIndividualPremiumPackage(entitlement.package_code));
        if (!cancelled) setAccess(premium ? "premium" : "locked");
      } catch {
        if (!cancelled) setAccess("locked");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return access;
}
