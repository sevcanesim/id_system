import { describe, expect, it } from "vitest";
import { ROLE_GUIDES, ROLE_LABELS, ROLE_MATRIX_COLUMNS } from "./role-matrix";

describe("corporate role copy", () => {
  it("uses the product role names without collapsing OWNER and ADMIN", () => {
    expect(ROLE_LABELS).toEqual({
      OWNER: "Şirket Sahibi",
      ADMIN: "Kurumsal Yönetici",
      HR: "İK Yöneticisi",
      DEPARTMENT_MANAGER: "Departman Yöneticisi",
      EMPLOYEE: "Çalışan",
    });
    expect(ROLE_MATRIX_COLUMNS).toEqual(["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER", "EMPLOYEE"]);
  });

  it("keeps capability guides for every company role", () => {
    for (const role of ROLE_MATRIX_COLUMNS) {
      expect(ROLE_GUIDES[role].length).toBeGreaterThan(0);
    }
    expect(ROLE_GUIDES.DEPARTMENT_MANAGER[0]).toContain("departman");
    expect(ROLE_GUIDES.EMPLOYEE.some((line) => line.includes("kendi dijital kartını"))).toBe(true);
  });
});
