import { describe, expect, it } from "vitest";
import { corporateSidebarTabs } from "../../app/kurumsal/panel/domain/navigation";
import { ROLE_CAPABILITIES, ROLE_GUIDES } from "./role-matrix";

function capability(label: string) {
  const matched = ROLE_CAPABILITIES.find((entry) => entry.label === label);
  if (!matched) throw new Error(`Missing role capability: ${label}`);
  return matched;
}

describe("corporate role matrix", () => {
  it("keeps commercial access exclusive to the organization owner", () => {
    const commerce = capability("Şirket, abonelik ve faturalandırma ayarları");

    expect(commerce.allows("OWNER")).toBe(true);
    expect(commerce.allows("ADMIN")).toBe(false);
    expect(commerce.allows("HR")).toBe(false);
    expect(commerce.allows("EMPLOYEE")).toBe(false);
    expect(ROLE_GUIDES.ADMIN).not.toContain("Lisans satın alır.");
  });

  it("exposes only the configured management tabs to each role", () => {
    expect(corporateSidebarTabs("EMPLOYEE")).toEqual([]);
    expect(corporateSidebarTabs("HR")).toEqual(["overview", "employees", "audit", "analytics"]);
    expect(corporateSidebarTabs("ADMIN")).toContain("integrations");
    expect(corporateSidebarTabs("ADMIN")).not.toContain("commerce");
    expect(corporateSidebarTabs("OWNER")).toContain("commerce");
  });
});
