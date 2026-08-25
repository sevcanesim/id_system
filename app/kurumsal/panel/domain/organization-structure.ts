import type { MemberActionTarget } from "./types";

export type DepartmentManagerInfo = {
  id: string;
  name: string;
  status: string;
};

export type DepartmentStructureRow = {
  name: string;
  memberCount: number;
  activeCount: number;
  managers: DepartmentManagerInfo[];
  hasManager: boolean;
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
  departmentsWithoutManagerCount: number;
  managerWithoutDepartmentCount: number;
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
      managers: Map<string, DepartmentManagerInfo>;
      isUnassigned: boolean;
    }
  >();

  let managerWithoutDepartmentCount = 0;

  for (const member of activeMembers) {
    const rawDept = member.department;
    const isUnassigned = !rawDept || !rawDept.trim();
    const deptName = normalizeDepartmentName(rawDept);

    if (member.role === "DEPARTMENT_MANAGER" && isUnassigned && member.status === "ACTIVE") {
      managerWithoutDepartmentCount++;
    }

    let dept = deptMap.get(deptName);
    if (!dept) {
      dept = {
        name: deptName,
        memberCount: 0,
        activeCount: 0,
        managers: new Map(),
        isUnassigned,
      };
      deptMap.set(deptName, dept);
    }

    dept.memberCount++;
    if (member.status === "ACTIVE" || member.status === "INVITED") {
      dept.activeCount++;
    }

    if (member.role === "DEPARTMENT_MANAGER" && member.status === "ACTIVE") {
      const managerName = member.full_name || member.email || "İsimsiz Yönetici";
      dept.managers.set(member.id, { id: member.id, name: managerName, status: member.status });
    }
  }

  const rows: DepartmentStructureRow[] = Array.from(deptMap.values())
    .map((dept) => {
      const managers = Array.from(dept.managers.values());
      const activeManagers = managers.filter((m) => m.status === "ACTIVE");
      return {
        name: dept.name,
        memberCount: dept.memberCount,
        activeCount: dept.activeCount,
        managers: activeManagers,
        hasManager: activeManagers.length > 0,
        isUnassigned: dept.isUnassigned,
      };
    })
    .sort((a, b) => {
      if (a.isUnassigned) return 1;
      if (b.isUnassigned) return -1;
      return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
    });

  const namedRows = rows.filter((r) => !r.isUnassigned);
  const unassignedRow = rows.find((r) => r.isUnassigned);
  const totalDepartments = namedRows.length;
  const unassignedDepartmentCount = unassignedRow ? unassignedRow.memberCount : 0;
  const departmentsWithoutManagerCount = namedRows.filter((r) => !r.hasManager && r.activeCount > 0).length;

  const attentionItems: OperationalAttentionItem[] = [];

  if (managerWithoutDepartmentCount > 0) {
    attentionItems.push({
      id: "manager-no-dept",
      level: "urgent",
      title: "Departmanı olmayan yönetici",
      description: `${managerWithoutDepartmentCount} aktif kullanıcıya departman yöneticisi rolü atanmış ancak departman bilgisi eksik.`,
    });
  }

  if (departmentsWithoutManagerCount > 0) {
    attentionItems.push({
      id: "dept-no-manager",
      level: "warning",
      title: "Yöneticisi olmayan departman",
      description: `${departmentsWithoutManagerCount} faal departmanda aktif bir departman yöneticisi bulunmuyor.`,
    });
  }

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
    departmentsWithoutManagerCount,
    managerWithoutDepartmentCount,
    attentionItems: attentionItems.slice(0, 3),
  };
}
