import { useMemo } from "react";
import { Icon } from "../../../icons";
import { Button } from "../../../components/ui/DesignSystem";
import type { MemberActionTarget } from "../domain/types";
import { deriveDepartmentStructure } from "../domain/organization-structure";

type Props = {
  members: MemberActionTarget[];
  onFilterDepartment?: (department: string) => void;
};

export default function OrganizationStructurePanel({
  members,
  onFilterDepartment,
}: Props) {
  const summary = useMemo(() => deriveDepartmentStructure(members), [members]);

  return (
    <section className="job-titles-panel org-structure" aria-labelledby="org-structure-title">
      <header className="org-structure__header">
        <div>
          <span>ORGANİZASYON YAPISI</span>
          <h2 id="org-structure-title">Departman Yapısı</h2>
          <p>Şirket içindeki ekip dağılımını ve yönetim kapsamını görüntüleyin.</p>
        </div>
      </header>

      {/* KPI Metrics Summary */}
      <div className="org-structure__summary">
        <article>
          <small>Toplam Departman</small>
          <strong>{summary.totalDepartments}</strong>
          <span>Faal ekip grubu</span>
        </article>
        <article>
          <small>Departmansız Çalışan</small>
          <strong>{summary.unassignedDepartmentCount}</strong>
          <span>Atama bekliyor</span>
        </article>
        <article>
          <small>Yöneticisiz Departman</small>
          <strong>{summary.departmentsWithoutManagerCount}</strong>
          <span>Kapsam atanmadı</span>
        </article>
      </div>

      {/* Operational Attention Strip */}
      {summary.attentionItems.length > 0 && (
        <div className="org-structure__attention">
          {summary.attentionItems.map((item) => (
            <article key={item.id} className={`org-structure__attention-item org-structure__attention-item--${item.level}`}>
              <Icon name="alert" />
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Desktop Department Roster Table */}
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
              <tr key={row.name} data-unassigned={row.isUnassigned}>
                <td className="org-structure__dept-name">
                  <strong>{row.name}</strong>
                </td>
                <td className="org-structure__count">
                  {row.memberCount} çalışan
                </td>
                <td className="org-structure__managers">
                  {row.hasManager ? (
                    row.managers.map((m) => (
                      <span key={m.id} className="org-structure__manager-tag">
                        <Icon name="user" /> {m.name}
                      </span>
                    ))
                  ) : (
                    <span className="org-structure__no-manager">
                      {row.isUnassigned ? "—" : "Yönetici atanmadı"}
                    </span>
                  )}
                </td>
                <td className="org-structure__status">
                  <span data-managed={row.hasManager} data-unassigned={row.isUnassigned}>
                    {row.isUnassigned
                      ? "Departman atanmamış"
                      : row.hasManager
                        ? "Yönetiliyor"
                        : "Yönetici bekleniyor"}
                  </span>
                </td>
                {onFilterDepartment && (
                  <td className="actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onFilterDepartment(row.isUnassigned ? "Belirtilmemiş" : row.name)}
                    >
                      Çalışanları Gör
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Department List */}
      <div className="org-structure__mobile-list">
        {summary.rows.map((row) => (
          <article key={row.name} className="org-structure__mobile-card" data-unassigned={row.isUnassigned}>
            <header className="org-structure__mobile-head">
              <div>
                <strong>{row.name}</strong>
                <small>{row.memberCount} çalışan</small>
              </div>
              <span className="org-structure__status">
                <span data-managed={row.hasManager} data-unassigned={row.isUnassigned}>
                  {row.isUnassigned
                    ? "Departman atanmamış"
                    : row.hasManager
                      ? "Yönetiliyor"
                      : "Yönetici bekleniyor"}
                </span>
              </span>
            </header>
            <div className="org-structure__mobile-body">
              <span className="org-structure__mobile-label">Yönetici:</span>
              {row.hasManager ? (
                row.managers.map((m) => (
                  <span key={m.id} className="org-structure__manager-tag">
                    <Icon name="user" /> {m.name}
                  </span>
                ))
              ) : (
                <span className="org-structure__no-manager">
                  {row.isUnassigned ? "—" : "Yönetici atanmadı"}
                </span>
              )}
            </div>
            {onFilterDepartment && (
              <footer className="org-structure__mobile-foot">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onFilterDepartment(row.isUnassigned ? "Belirtilmemiş" : row.name)}
                >
                  Çalışanları Gör
                </Button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
