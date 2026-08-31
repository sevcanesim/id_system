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
      <header className="business-role-header">
        <div>
          <span>ERİŞİM YÖNETİMİ</span>
          <h2>Roller ve yetkiler</h2>
          <p>Şirket içindeki her rolün hangi işlemleri yapabildiğini ve ekipte kaç kişinin bu role sahip olduğunu görün.</p>
        </div>
        <span className="business-role-count">{ROLE_MATRIX_COLUMNS.length} rol</span>
      </header>

      <aside className="business-role-platform">
        <i><Icon name="lock" /></i>
        <div>
          <strong>Super Admin şirket rolü değildir</strong>
          <p>Platform yönetimi ayrı bir alandır ve şirket içi yetki matrisine dahil edilmez.</p>
        </div>
      </aside>

      <div className="business-role-summary">
        {ROLE_MATRIX_COLUMNS.map((role) => {
          const count = members.filter((member) => member.role === role && member.status !== "LEFT").length;
          const guide = ROLE_GUIDES[role];
          const visibleGuide = guide.slice(0, 3);
          const remaining = Math.max(0, guide.length - visibleGuide.length);
          return (
            <article key={role} className={count === 0 ? "is-empty" : undefined}>
              <div className="business-role-summary__head">
                <i><Icon name={ROLE_ICONS[role]} /></i>
                <div>
                  <strong>{ROLE_LABELS[role]}</strong>
                  <span>{count} {count === 1 ? "kişi" : "kişi"}</span>
                </div>
              </div>
              <ul>
                {visibleGuide.map((line) => <li key={line}>{line}</li>)}
              </ul>
              {remaining > 0 && <small className="business-role-summary__more">+{remaining} ek yetki</small>}
            </article>
          );
        })}
      </div>

      <section className="business-role-matrix-section" aria-labelledby="business-role-matrix-title">
        <div className="business-role-matrix-heading">
          <div>
            <h3 id="business-role-matrix-title">Yetki karşılaştırması</h3>
            <p>Detaylı izinleri rol bazında karşılaştırın.</p>
          </div>
          <span>Yatay kaydırılabilir</span>
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
      </section>

      <aside className="business-role-security">
        <Icon name="lock" />
        <p><strong>Güvenlik:</strong> Kullanıcı kendi rolünü yükseltemez. Şirket Sahibi rolü silinemez veya pasife alınamaz; rol değişiklikleri sunucu tarafında doğrulanır.</p>
      </aside>
    </section>
  );
}
