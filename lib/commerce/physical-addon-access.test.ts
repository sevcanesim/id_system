import { describe, expect, it } from "vitest";
import { COMMERCIAL_SKUS } from "../config/commercial";
import {
  isPhysicalAddonSku,
  physicalAddonCartCopy,
  physicalAddonCartGate,
} from "./physical-addon-access";

describe("isPhysicalAddonSku", () => {
  it("treats extra and replacement cards as account-bound add-ons", () => {
    expect(isPhysicalAddonSku(COMMERCIAL_SKUS.ADDITIONAL_CARD)).toBe(true);
    expect(isPhysicalAddonSku(COMMERCIAL_SKUS.REPLACEMENT_CARD)).toBe(true);
  });

  it("does not gate first-card or digital packages", () => {
    expect(isPhysicalAddonSku(COMMERCIAL_SKUS.INITIAL)).toBe(false);
    expect(isPhysicalAddonSku(COMMERCIAL_SKUS.PREMIUM)).toBe(false);
    expect(isPhysicalAddonSku(undefined)).toBe(false);
  });
});

describe("physicalAddonCartGate", () => {
  it("blocks guests before entitlement is considered", () => {
    expect(physicalAddonCartGate({ authenticated: false, activeEntitlement: true })).toBe("guest");
    expect(physicalAddonCartGate({ authenticated: false, activeEntitlement: false })).toBe("guest");
  });

  it("blocks signed-in buyers without an active service", () => {
    expect(physicalAddonCartGate({ authenticated: true, activeEntitlement: false })).toBe("no_entitlement");
  });

  it("allows signed-in buyers with an active service", () => {
    expect(physicalAddonCartGate({ authenticated: true, activeEntitlement: true })).toBe("ready");
  });
});

describe("physicalAddonCartCopy", () => {
  it("keeps the purchase label and states that login is required", () => {
    const copy = physicalAddonCartCopy("guest", "Sepete Ekle");
    expect(copy.label).toBe("Sepete Ekle");
    expect(copy.hint).toMatch(/Giriş gerekli/);
    expect(copy.loginAction).toBe("Hesabına gir");
    expect(copy.hint).not.toMatch(/İlk kartım yok/i);
  });

  it("does not send buyers without service to a first-card dead end", () => {
    const copy = physicalAddonCartCopy("no_entitlement", "Sepete Ekle");
    expect(copy.loginAction).toBeNull();
    expect(copy.hint).toMatch(/aktif bir Yenomi ID hizmetin gerekir/i);
    expect(copy.hint).not.toMatch(/İlk kartım yok/i);
  });
});
