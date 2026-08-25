import { describe, expect, it } from "vitest";
import { deriveDepartmentStructure } from "./organization-structure";
import type { MemberActionTarget } from "./types";

function mockMember(overrides: Partial<MemberActionTarget>): MemberActionTarget {
  return {
    id: `m-${Math.random().toString(36).substring(2, 9)}`,
    email: "user@acme.com",
    full_name: "Test User",
    title: "Uzman",
    department: "Mühendislik",
    role: "EMPLOYEE",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("deriveDepartmentStructure", () => {
  it("A: excludes LEFT DEPARTMENT_MANAGER from active managers", () => {
    const members: MemberActionTarget[] = [
      mockMember({ id: "m1", full_name: "Ayşe Yılmaz", role: "DEPARTMENT_MANAGER", department: "Mühendislik", status: "LEFT" }),
      mockMember({ id: "m2", full_name: "Ali Demir", role: "EMPLOYEE", department: "Mühendislik", status: "ACTIVE" }),
    ];

    const result = deriveDepartmentStructure(members);
    const mDept = result.rows.find((r) => r.name === "Mühendislik");

    expect(mDept).toBeDefined();
    expect(mDept?.hasManager).toBe(false);
    expect(mDept?.managers).toHaveLength(0);
    expect(mDept?.memberCount).toBe(1); // LEFT member excluded entirely
  });

  it("B: excludes SUSPENDED DEPARTMENT_MANAGER from counting as active manager", () => {
    const members: MemberActionTarget[] = [
      mockMember({ id: "m1", full_name: "Ayşe Yılmaz", role: "DEPARTMENT_MANAGER", department: "Mühendislik", status: "SUSPENDED" }),
      mockMember({ id: "m2", full_name: "Ali Demir", role: "EMPLOYEE", department: "Mühendislik", status: "ACTIVE" }),
    ];

    const result = deriveDepartmentStructure(members);
    const mDept = result.rows.find((r) => r.name === "Mühendislik");

    expect(mDept).toBeDefined();
    expect(mDept?.hasManager).toBe(false);
    expect(mDept?.managers).toHaveLength(0);
    expect(mDept?.memberCount).toBe(2); // SUSPENDED member counted in memberCount
  });

  it("C: includes ACTIVE DEPARTMENT_MANAGER as active manager", () => {
    const members: MemberActionTarget[] = [
      mockMember({ id: "m1", full_name: "Ayşe Yılmaz", role: "DEPARTMENT_MANAGER", department: "Mühendislik", status: "ACTIVE" }),
      mockMember({ id: "m2", full_name: "Ali Demir", role: "EMPLOYEE", department: "Mühendislik", status: "ACTIVE" }),
    ];

    const result = deriveDepartmentStructure(members);
    const mDept = result.rows.find((r) => r.name === "Mühendislik");

    expect(mDept).toBeDefined();
    expect(mDept?.hasManager).toBe(true);
    expect(mDept?.managers).toHaveLength(1);
    expect(mDept?.managers[0].name).toBe("Ayşe Yılmaz");
  });

  it("D: excludes synthetic Departman atanmamış group from totalDepartments", () => {
    const members: MemberActionTarget[] = [
      mockMember({ id: "m1", department: "Mühendislik" }),
      mockMember({ id: "s1", department: "Satış" }),
      mockMember({ id: "u1", department: null }),
      mockMember({ id: "u2", department: "" }),
    ];

    const result = deriveDepartmentStructure(members);

    expect(result.totalDepartments).toBe(2); // Only Mühendislik and Satış
    expect(result.unassignedDepartmentCount).toBe(2);
  });

  it("normalizes department names with trailing whitespace", () => {
    const members: MemberActionTarget[] = [
      mockMember({ id: "p1", department: "Pazarlama" }),
      mockMember({ id: "p2", department: "Pazarlama " }),
      mockMember({ id: "p3", department: " Pazarlama" }),
    ];

    const result = deriveDepartmentStructure(members);
    const pazDept = result.rows.filter((r) => r.name === "Pazarlama");

    expect(pazDept).toHaveLength(1);
    expect(pazDept[0].memberCount).toBe(3);
  });

  it("surfaces operational attention for ACTIVE DEPARTMENT_MANAGER with null department", () => {
    const members: MemberActionTarget[] = [
      mockMember({ id: "mgr1", role: "DEPARTMENT_MANAGER", department: null, status: "ACTIVE" }),
    ];

    const result = deriveDepartmentStructure(members);

    expect(result.managerWithoutDepartmentCount).toBe(1);
    const urgentAttention = result.attentionItems.find((item) => item.id === "manager-no-dept");
    expect(urgentAttention).toBeDefined();
    expect(urgentAttention?.level).toBe("urgent");
  });
});
