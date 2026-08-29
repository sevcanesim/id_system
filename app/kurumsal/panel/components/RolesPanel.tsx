import { Icon, type IconName } from "../../../icons";
import {
  ROLE_CAPABILITIES,
  ROLE_GUIDES,
  ROLE_LABELS,
  ROLE_MATRIX_COLUMNS,
} from "../../../../lib/organizations/role-matrix";
import type { OrganizationRole } from "../../../../lib/organizations/permissions";

type RoleMember = { role: string; status: string };

const ROLE_ICONS: Record<OrganizationRole, IconName> = {
  OWNER: "building",
  ADMIN: "shield",
  HR: "users",
  DEPARTMENT_MANAGER: "adjustments",
  EMPLOYEE: "id",
};

export default function RolesPanel({ members }: { members: RoleMember[] }) {
  return (
    <section className="business-role-panel">
      <header>
        <div>
          <span>ERİŞİM YÖNETİMİ</span>
          <h2>Rol ve yetki matrisi</h2>
          <p>Şirket içi roller, sunucunun uyguladığı işlem yetkilerini gösterir. Super Admin bu panelde bir şirket rolü değildir.</p>
        </div>
        <b>{ROLE_MATRIX_COLUMNS.length} şirket rolü</b>
      </header>
      <aside className="business-role-platform">
        <i><Icon name="lock" /></i>
        <div>
          <strong>Super Admin</strong>
          <p>Platform rolüdür: tüm şirketleri görür, sistemi yönetir, lisans tanımlar ve destek işlemleri yapar. Bu yetkiler /admin yüzeyindedir; şirket paneline üye olarak eklenmez.</p>
        </div>
      </aside>
      <div className="business-role-summary">
        {ROLE_MATRIX_COLUMNS.map((role) => {
          const count = members.filter((member) => member.role === role && member.status !== "LEFT").length;
          return (
            <article key={role} className={count === 0 ? "is-empty" : undefined}>
              <div className="business-role-summary__head">
                <i><Icon name={ROLE_ICONS[role]} /></i>
                <div>
                  <small>{ROLE_LABELS[role]}</small>
                  <strong>{count}</strong>
                </div>
              </div>
              <ul>
                {ROLE_GUIDES[role].map((line) => <li key={line}>{line}</li>)}
              </ul>
            </article>
          );
        })}
      </div>
      <div className="business-role-matrix" role="region" aria-label="Rol ve yetki matrisi" tabIndex={0}>
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
                {ROLE_MATRIX_COLUMNS.map((matrixRole) => {
                  const allowed = capability.allows(matrixRole);
                  return (
                    <td key={matrixRole} className={allowed ? "allowed" : "denied"}>
                      {allowed ? <><Icon name="check" /><span className="sr-only">İzin var</span></> : <><span aria-hidden="true">—</span><span className="sr-only">İzin yok</span></>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside className="business-role-security">
        <Icon name="lock" />
        <p><strong>Güvenlik kuralı:</strong> Kullanıcı kendi rolünü yükseltemez. Şirket Sahibi rolü panelden silinemez veya pasife alınamaz; rol değişiklikleri sunucu tarafında yetki kontrolünden geçer.</p>
      </aside>
    </section>
  );
}
