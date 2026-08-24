import { describe, expect, it } from "vitest";
import {
  CORPORATE_PANEL_TAB_ORDER,
  corporateSidebarItems,
  corporateSidebarTabs,
} from "./navigation";

describe("corporate sidebar role filtering", () => {
  it("keeps the full panel order when no role is supplied", () => {
    expect(corporateSidebarTabs()).toEqual(CORPORATE_PANEL_TAB_ORDER);
  });

  it("limits department managers to the employee surface", () => {
    expect(corporateSidebarTabs("DEPARTMENT_MANAGER")).toEqual(["employees"]);
    expect(corporateSidebarItems("DEPARTMENT_MANAGER").map((item) => item.key)).toEqual(["employees"]);
  });

  it("hides management tabs from employees", () => {
    expect(corporateSidebarTabs("EMPLOYEE")).toEqual([]);
    expect(corporateSidebarItems("EMPLOYEE")).toEqual([]);
  });

  it("normalizes the legacy HR_MANAGER alias before applying tab permissions", () => {
    expect(corporateSidebarTabs("HR_MANAGER")).toEqual(corporateSidebarTabs("HR"));
    expect(corporateSidebarItems("HR_MANAGER")).toEqual(corporateSidebarItems("HR"));
  });

  it("keeps license and networking management restricted to owner/admin", () => {
    for (const role of ["HR", "HR_MANAGER"] as const) {
      const tabs = corporateSidebarTabs(role);
      expect(tabs).not.toContain("licenses");
      expect(tabs).not.toContain("leads");
      expect(tabs).not.toContain("events");
      expect(tabs).not.toContain("meetings");
    }

    for (const role of ["OWNER", "ADMIN"] as const) {
      const tabs = corporateSidebarTabs(role);
      expect(tabs).toContain("licenses");
      expect(tabs).toContain("leads");
      expect(tabs).toContain("events");
      expect(tabs).toContain("meetings");
    }
  });
});
