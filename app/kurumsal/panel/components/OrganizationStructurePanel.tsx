import { useMemo } from "react";
import { Icon } from "../../../icons";
import { Button } from "../../../components/ui/DesignSystem";
import type { MemberActionTarget } from "../domain/types";
import { deriveDepartmentStructure } from "../domain/organization-structure";

type Props = {
  members: MemberActionTarget[];
  onFilterDepartment?: (department: string) => void;
};

export default function OrganizationStructurePanel({ members, onFilterDepartment }: Props) {
  const summary = useMemo(() => deriveDepartmentStructure(members), [members]);
  const hasManagementGap = summary.departmentsWithoutManagerCount > 0;

  const openDepartment = (name: string, isUnassigned: boolean) => {
    onFilterDepartment?.(isUnassigned ? "Belirtilmemiş" : name);
  };

  return (
    <section className="job-titles-panel org-structure org-structure--v2" aria-labelledby="org-structure-title">
      <header className="org-structure__header">
        <div>
          <span>ORGANİZASYON YAPISI</span>
          <h2 id="org-structure-title">Departmanlar</h2>
          <p>Ekip dağılımını, yönetici kapsamını ve atama gerektiren departmanları tek görünümde yönetin.</p>
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
          <span>çalışan</span>
        </article>
        <article data-attention={hasManagementGap || undefined}>
          <small>Yönetici bekleyen</small>
          <strong>{summary.departmentsWithoutManagerCount}</strong>
          <span>departman</span>
        </article>
      </div>

      {hasManagementGap ? (
        <div className="org-structure__priority" role="status">
          <span className="org-structure__priority-icon" aria-hidden="true"><Icon name="alert" /></span>
          <div>
            <strong>{summary.departmentsWithoutManagerCount} departmana yönetici atanmalı</strong>
            <p>Atama yapmak için ilgili departmanın ekip görünümünü açın.</p>
          </div>
        </div>
      ) : null}

      <div className="org-structure__table-wrap">
        <table className="org-structure__table">
          <thead>
            <tr>
              <th>Departman</th>
              <th>Çalışan</th>
              <th>Yönetici</th>
              <th>Durum</th>
              {onFilterDepartment && <th className="actions">İşlem</th>}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.name} data-unassigned={row.isUnassigned} data-needs-manager={!row.hasManager && !row.isUnassigned || undefined}>
                <td className="org-structure__dept-name"><strong>{row.name}</strong></td>
                <td className="org-structure__count">{row.memberCount} çalışan</td>
                <td className="org-structure__managers">
                  {row.hasManager ? row.managers.map((manager) => (
                    <span key={manager.id} className="org-structure__manager-tag"><Icon name="user" /> {manager.name}</span>
                  )) : <span className="org-structure__no-manager">{row.isUnassigned ? "—" : "Atanmadı"}</span>}
                </td>
                <td className="org-structure__status">
                  <span data-managed={row.hasManager} data-unassigned={row.isUnassigned}>
                    {row.isUnassigned ? "Departman gerekli" : row.hasManager ? "Yönetiliyor" : "Yönetici gerekli"}
                  </span>
                </td>
                {onFilterDepartment && (
                  <td className="actions">
                    <Button
                      type="button"
                      variant={!row.hasManager && !row.isUnassigned ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => openDepartment(row.name, row.isUnassigned)}
                    >
                      {!row.hasManager && !row.isUnassigned ? "Yönetici Ata" : "Ekibi Gör"}
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
          <article key={row.name} className="org-structure__mobile-card" data-unassigned={row.isUnassigned} data-needs-manager={!row.hasManager && !row.isUnassigned || undefined}>
            <header className="org-structure__mobile-head">
              <div><strong>{row.name}</strong><small>{row.memberCount} çalışan</small></div>
              <span className="org-structure__status"><span data-managed={row.hasManager} data-unassigned={row.isUnassigned}>{row.isUnassigned ? "Departman gerekli" : row.hasManager ? "Yönetiliyor" : "Yönetici gerekli"}</span></span>
            </header>
            <div className="org-structure__mobile-body">
              <span className="org-structure__mobile-label">Yönetici</span>
              {row.hasManager ? row.managers.map((manager) => (
                <span key={manager.id} className="org-structure__manager-tag"><Icon name="user" /> {manager.name}</span>
              )) : <span className="org-structure__no-manager">{row.isUnassigned ? "—" : "Atanmadı"}</span>}
            </div>
            {onFilterDepartment && (
              <footer className="org-structure__mobile-foot">
                <Button type="button" variant={!row.hasManager && !row.isUnassigned ? "primary" : "secondary"} size="sm" onClick={() => openDepartment(row.name, row.isUnassigned)}>
                  {!row.hasManager && !row.isUnassigned ? "Yönetici Ata" : "Ekibi Gör"}
                </Button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
