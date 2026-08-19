import { Icon } from "../../../icons";
import {
  ROLE_CAPABILITIES,
  ROLE_LABELS,
  ROLE_MATRIX_COLUMNS,
} from "../../../../lib/organizations/role-matrix";

type RoleMember = { role: string; status: string };

export default function RolesPanel({ members }: { members: RoleMember[] }) {
  const roles = [
    ["OWNER", "Şirket Sahibi", "Şirket sahibi rolü", "violet"],
    ["ADMIN", "Yönetici", "Yönetici rolü", "green"],
    ["HR", "İnsan Kaynakları", "İK rolü", "amber"],
    ["DEPARTMENT_MANAGER", "Departman Yöneticisi", "Departman rolü", "blue"],
    ["EMPLOYEE", "Çalışan", "Kullanıcı rolü", "purple"],
  ] as const;

  return (
    <section className="business-role-panel">
      <header>
        <div>
          <span>ERİŞİM YÖNETİMİ</span>
          <h2>Rol ve yetki matrisi</h2>
          <p>Roller açıklama kartı değil, gerçek işlem yetkilerini gösterir.</p>
        </div>
        <b>{ROLE_MATRIX_COLUMNS.length} sistem rolü</b>
      </header>
      <div className="business-role-summary">
        {roles.map(([role, label, description, tone]) => (
          <article key={role} className={`tone-${tone}`}>
            <i><Icon name={role === "HR" ? "mail" : "users"} /></i>
            <div>
              <small>{label}</small>
              <strong>{members.filter((member) => member.role === role && member.status !== "LEFT").length}</strong>
              <span>{description}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="business-role-matrix">
        <table>
          <thead>
            <tr>
              <th>Yetki</th>
              {ROLE_MATRIX_COLUMNS.map((role) => <th key={role}>{ROLE_LABELS[role]}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROLE_CAPABILITIES.map((capability) => (
              <tr key={capability.label}>
                <td>{capability.label}</td>
                {ROLE_MATRIX_COLUMNS.map((role) => {
                  const allowed = capability.allows(role);
                  return <td key={role} className={allowed ? "allowed" : "denied"}>{allowed ? "✓" : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside>
        <Icon name="lock" />
        <p><strong>Güvenlik kuralı:</strong> Kullanıcı kendi rolünü yükseltemez. Şirket Sahibi rolü panelden silinemez veya pasife alınamaz; rol değişiklikleri sunucu tarafında yetki kontrolünden geçer.</p>
      </aside>
    </section>
  );
}
