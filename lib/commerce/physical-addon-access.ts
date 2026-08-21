import { COMMERCIAL_SKUS } from "../config/commercial";

export type PhysicalAddonCartGate = "ready" | "guest" | "no_entitlement";

export function isPhysicalAddonSku(sku?: string): boolean {
  return sku === COMMERCIAL_SKUS.ADDITIONAL_CARD || sku === COMMERCIAL_SKUS.REPLACEMENT_CARD;
}

export function physicalAddonCartGate(input: {
  authenticated: boolean;
  activeEntitlement: boolean;
}): PhysicalAddonCartGate {
  if (!input.authenticated) return "guest";
  if (!input.activeEntitlement) return "no_entitlement";
  return "ready";
}

export function physicalAddonCartCopy(gate: PhysicalAddonCartGate, purchaseLabel: string) {
  if (gate === "guest") {
    return {
      label: purchaseLabel,
      hint: "Giriş gerekli. Yedek kart yalnız hesabına girdikten sonra alınır.",
      loginAction: "Hesabına gir" as const,
    };
  }
  if (gate === "no_entitlement") {
    return {
      label: purchaseLabel,
      hint: "Aktif bir Yenomi ID hizmetin gerekir. Yedek kart yeni bir kimlik açmaz.",
      loginAction: null,
    };
  }
  return { label: purchaseLabel, hint: null, loginAction: null };
}
