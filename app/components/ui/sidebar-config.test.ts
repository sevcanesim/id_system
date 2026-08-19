import { describe, expect, it } from "vitest";
import { CORPORATE_SIDEBAR_CONFIG, filterSidebarByRole } from "./sidebar-config";
import { corporateSidebarItems } from "../../kurumsal/panel/domain/navigation";

describe("filterSidebarByRole", () => {
  it("keeps HR employees, cards, and analytics using the persisted HR role", () => {
    expect(filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR").map((item) => item.key)).toEqual([
      "overview",
      "employees",
      "cards",
      "analytics",
    ]);
  });

  it("treats the HR_MANAGER UI alias the same as HR", () => {
    expect(filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR_MANAGER").map((item) => item.key)).toEqual(
      filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR").map((item) => item.key),
    );
  });

  it("hides licenses from HR", () => {
    expect(filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, "HR").map((item) => item.key)).not.toContain("licenses");
  });
});

describe("corporateSidebarItems", () => {
  it("limits department managers to employees", () => {
    expect(corporateSidebarItems("DEPARTMENT_MANAGER").map((item) => item.key)).toEqual(["employees"]);
  });

  it("keeps HR off license, template, and settings surfaces", () => {
    expect(corporateSidebarItems("HR").map((item) => item.key)).toEqual([
      "overview",
      "employees",
      "cards",
      "analytics",
    ]);
  });
});
