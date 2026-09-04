import { useMemo } from "react";
import { Button, StatusBadge } from "../../../components/ui/DesignSystem";
import { Icon } from "../../../icons";
import type { MemberActionTarget } from "../domain/types";
import { deriveDepartmentStructure } from "../domain/organization-structure";

type Props = {
  members: MemberActionTarget[];
  onFilterDepartment?: (department: string) => void;
};

export default function OrganizationStructurePanel({ members, onFilterDepartment }: Props) {
  const summary = useMemo(() => deriveDepartmentStructure(members), [members]);

  const openDepartment = (name: string, isUnassigned: boolean) => {
    onFilterDepartment?.(isUnassigned ? "Belirtilmemiş" : name);
  };

  return (
    <section className="job-titles-panel org-structure org-structure--v2" aria-labelledby="org-structure-title">
      <header className="org-structure__header">
        <div>
          <span>ORGANİZASYON YAPISI</span>
          <h2 id="org-structure-title">Departmanlar</h2>
          <p>Ekip dağılımını ve departman ataması gerektiren çalışanları tek görünümde yönetin.</p>
        </div>
      </header>

      <div className="org-structure__summary" aria-label="Departman özeti">
        <article>
          <small>Departman</small>
          <strong>{summary.totalDepartments}</strong>
          <span>aktif ekip</span>
        </article>
        <article data-attention={summary.unassignedDepartmentCount > 0 || undefined}>
          <small>Departmansız</small>
          <strong>{summary.unassignedDepartmentCount}</strong>
          <span>{summary.unassignedDepartmentCount > 0 ? "atama bekliyor" : "çalışan"}</span>
        </article>
      </div>

      <div className="org-structure__table-wrap">
        <table className="org-structure__table">
          <thead>
            <tr>
              <th>Departman</th>
              <th>Çalışan</th>
              <th>Durum</th>
              {onFilterDepartment && <th className="actions">İşlem</th>}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.name} data-unassigned={row.isUnassigned}>
                <td className="org-structure__dept-name"><strong>{row.name}</strong></td>
                <td className="org-structure__count">{row.memberCount} çalışan</td>
                <td className="org-structure__status">
                  <StatusBadge tone={row.isUnassigned ? "warning" : "success"}>
                    <Icon name={row.isUnassigned ? "alert-circle" : "check"} />
                    {row.isUnassigned ? "Departman gerekli" : "Atandı"}
                  </StatusBadge>
                </td>
                {onFilterDepartment && (
                  <td className="actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openDepartment(row.name, row.isUnassigned)}
                    >
                      <Icon name="users" />
                      Ekibi Gör
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="org-structure__mobile-list">
        {summary.rows.map((row) => (
          <article key={row.name} className="org-structure__mobile-card" data-unassigned={row.isUnassigned}>
            <header className="org-structure__mobile-head">
              <div><strong>{row.name}</strong><small>{row.memberCount} çalışan</small></div>
              <StatusBadge tone={row.isUnassigned ? "warning" : "success"}>
                <Icon name={row.isUnassigned ? "alert-circle" : "check"} />
                {row.isUnassigned ? "Departman gerekli" : "Atandı"}
              </StatusBadge>
            </header>
            {onFilterDepartment && (
              <footer className="org-structure__mobile-foot">
                <Button type="button" variant="secondary" size="sm" onClick={() => openDepartment(row.name, row.isUnassigned)}>
                  <Icon name="users" />
                  Ekibi Gör
                </Button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
