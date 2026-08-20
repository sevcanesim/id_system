import { describe, expect, it } from "vitest";
import { COMMERCIAL_SKUS } from "../config/commercial";
import { corporatePackageSku } from "./packages";
import { stampPhysicalProductionConfig } from "./production-config";

describe("stampPhysicalProductionConfig", () => {
  it("stamps buyer name and black color onto an initial NFC line", () => {
    expect(stampPhysicalProductionConfig(COMMERCIAL_SKUS.INITIAL, {}, "Ayşe Kaya")).toEqual({
      printName: "Ayşe Kaya",
      printTitle: "",
      cardColor: "BLACK",
    });
  });

  it("keeps an explicit print name from the NFC order bridge", () => {
    expect(stampPhysicalProductionConfig(COMMERCIAL_SKUS.ADDITIONAL_CARD, { printName: "Can Demir", printTitle: "Satış" }, "Checkout Name")).toMatchObject({
      printName: "Can Demir",
      printTitle: "Satış",
      cardColor: "BLACK",
    });
  });

  it("does not stamp digital-only SKUs", () => {
    expect(stampPhysicalProductionConfig(COMMERCIAL_SKUS.RENEWAL, { foo: 1 }, "Ayşe")).toEqual({ foo: 1 });
  });

  it("stamps corporate packs so NFC units are not anonymous", () => {
    expect(stampPhysicalProductionConfig(corporatePackageSku("CORP-10"), {}, "Şirket Sahibi").printName).toBe("Şirket Sahibi");
  });
});
