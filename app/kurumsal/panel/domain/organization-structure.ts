import type { MemberActionTarget } from "./types";

export type DepartmentStructureRow = {
  name: string;
  memberCount: number;
  activeCount: number;
  isUnassigned: boolean;
};

export type OperationalAttentionItem = {
  id: string;
  level: "urgent" | "warning" | "info";
  title: string;
  description: string;
};

export type DepartmentStructureSummary = {
  rows: DepartmentStructureRow[];
  totalDepartments: number;
  unassignedDepartmentCount: number;
  attentionItems: OperationalAttentionItem[];
};

export const UNASSIGNED_DEPARTMENT_LABEL = "Departman atanmamış";

export function normalizeDepartmentName(rawDepartment?: string | null): string {
  if (!rawDepartment) return UNASSIGNED_DEPARTMENT_LABEL;
  const trimmed = rawDepartment.trim();
  if (!trimmed) return UNASSIGNED_DEPARTMENT_LABEL;
  return trimmed;
}

export function deriveDepartmentStructure(
  members: MemberActionTarget[],
): DepartmentStructureSummary {
  const activeMembers = members.filter((member) => member.status !== "LEFT");
  const deptMap = new Map<
    string,
    {
      name: string;
      memberCount: number;
      activeCount: number;
      isUnassigned: boolean;
    }
  >();

  for (const member of activeMembers) {
    const rawDept = member.department;
    const isUnassigned = !rawDept || !rawDept.trim();
    const deptName = normalizeDepartmentName(rawDept);

    let dept = deptMap.get(deptName);
    if (!dept) {
      dept = {
        name: deptName,
        memberCount: 0,
        activeCount: 0,
        isUnassigned,
      };
      deptMap.set(deptName, dept);
    }

    dept.memberCount++;
    if (member.status === "ACTIVE" || member.status === "INVITED") {
      dept.activeCount++;
    }

  }

  const rows: DepartmentStructureRow[] = Array.from(deptMap.values())
    .map((dept) => ({
      name: dept.name,
      memberCount: dept.memberCount,
      activeCount: dept.activeCount,
      isUnassigned: dept.isUnassigned,
    }))
    .sort((a, b) => {
      if (a.isUnassigned) return 1;
      if (b.isUnassigned) return -1;
      return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
    });

  const namedRows = rows.filter((r) => !r.isUnassigned);
  const unassignedRow = rows.find((r) => r.isUnassigned);
  const totalDepartments = namedRows.length;
  const unassignedDepartmentCount = unassignedRow ? unassignedRow.memberCount : 0;
  const attentionItems: OperationalAttentionItem[] = [];

  if (unassignedDepartmentCount > 0) {
    attentionItems.push({
      id: "unassigned-members",
      level: "info",
      title: "Departmanı atanmamış çalışanlar",
      description: `${unassignedDepartmentCount} çalışanın henüz departman kaydı yapılmamış.`,
    });
  }

  return {
    rows,
    totalDepartments,
    unassignedDepartmentCount,
    attentionItems,
  };
}
