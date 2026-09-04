import { Fragment } from "react";
import { Icon, type IconName } from "../../../icons";
import { Badge, Button } from "../../../components/ui/DesignSystem";
import {
  ROLE_CAPABILITIES,
  ROLE_CAPABILITY_CATEGORIES,
  ROLE_GUIDES,
  ROLE_LABELS,
  ROLE_MATRIX_COLUMNS,
  type RoleCapability,
} from "../../../../lib/organizations/role-matrix";
import {
  ORGANIZATION_MANAGEMENT_ROLES,
  type OrganizationRole,
} from "../../../../lib/organizations/permissions";
import styles from "./RolesPanel.module.css";

type RoleMember = { role: string; status: string };

type Props = {
  members: RoleMember[];
  canInvite: boolean;
  onInvite: () => void;
  onRoleSelect: (role: OrganizationRole) => void;
};

const ROLE_ICONS: Record<OrganizationRole, IconName> = {
  OWNER: "building",
  ADMIN: "shield",
  HR: "users",
  EMPLOYEE: "id",
};

const ROLE_ACCESS: Record<OrganizationRole, { label: string; tone: "warning" | "info" | "success" | "neutral" }> = {
  OWNER: { label: "Tam erişim", tone: "warning" },
  ADMIN: { label: "Yönetici", tone: "info" },
  HR: { label: "Ekip yönetimi", tone: "success" },
  EMPLOYEE: { label: "Kendi kartı", tone: "neutral" },
};

const CATEGORY_ICONS: Record<(typeof ROLE_CAPABILITY_CATEGORIES)[number]["id"], IconName> = {
  company: "building",
  team: "users",
  card: "id",
  insights: "analytics",
};

const capabilityGroups = ROLE_CAPABILITY_CATEGORIES.map((category) => ({
  ...category,
  capabilities: ROLE_CAPABILITIES.filter((capability) => capability.category === category.id),
}));

function scopeLabel(capability: RoleCapability, role: OrganizationRole) {
  if (!capability.allows(role)) return "Yetki yok";
  return capability.scope === "SELF" ? "Yalnız kendi" : "Tüm şirket";
}

export default function RolesPanel({ members, canInvite, onInvite, onRoleSelect }: Props) {
  const activeMemberCount = members.filter((member) => member.status === "ACTIVE").length;
  const managedMemberCount = members.filter(
    (member) => member.status === "ACTIVE" && (ORGANIZATION_MANAGEMENT_ROLES as readonly string[]).includes(member.role),
  ).length;

  return (
    <section className={`business-role-panel ${styles.roleHub}`}>
      <header className={`${styles.header} business-role-header`}>
        <div className={styles.headerCopy}>
          <div className={styles.kickerRow}>
            <span>ERİŞİM YÖNETİMİ</span>
            <Badge tone="success" className={styles.securityBadge}><Icon name="secure" /> Sunucu doğrulamalı</Badge>
          </div>
          <h2>Erişim yönetim merkezi</h2>
          <p>Rolleri, operasyonel kapsamı ve sunucuda zorlanan yetki sınırlarını tek ekranda yönetin.</p>
        </div>
        <Button variant="primary" onClick={onInvite} disabled={!canInvite} className={styles.inviteButton}>
          <Icon name="plus" /> Yeni çalışan davet et
        </Button>
      </header>

      <section className={styles.metrics} aria-label="Erişim yönetimi özeti">
        <article>
          <Icon name="lock" />
          <div><small>Desteklenen rol</small><strong>{ROLE_MATRIX_COLUMNS.length}</strong><span>Yetki kaynağıyla senkron</span></div>
        </article>
        <article>
          <Icon name="users" />
          <div><small>Aktif ekip üyesi</small><strong>{activeMemberCount}</strong><span>Şu anda erişimi açık</span></div>
        </article>
        <article>
          <Icon name="shield" />
          <div><small>Yönetim rolü</small><strong>{managedMemberCount}</strong><span>Aktif operasyon yetkisi</span></div>
        </article>
      </section>

      <section className="business-role-overview" aria-labelledby="business-role-overview-title">
        <div className="business-role-section-heading">
          <div>
            <h3 id="business-role-overview-title">Roller ve ekip dağılımı</h3>
            <p>Bir rolü seçerek o roldeki çalışanları filtrelenmiş ekip görünümünde açın.</p>
          </div>
        </div>

        <div className={`business-role-summary ${styles.roleGrid}`}>
          {ROLE_MATRIX_COLUMNS.map((role) => {
            const count = members.filter((member) => member.role === role && member.status !== "LEFT").length;
            const access = ROLE_ACCESS[role];
            return (
              <article key={role} className={`${styles.roleCard}${count === 0 ? " is-empty" : ""}`}>
                <button type="button" onClick={() => onRoleSelect(role)} aria-label={`${ROLE_LABELS[role]} rolündeki ${count} çalışanı görüntüle`}>
                  <div className="business-role-summary__head">
                    <i><Icon name={ROLE_ICONS[role]} /></i>
                    <div>
                      <strong>{ROLE_LABELS[role]}</strong>
                      <span>{count} kişi</span>
                    </div>
                    <Badge tone={access.tone} className={styles.accessBadge}>{access.label}</Badge>
                  </div>
                  <ul>
                    {ROLE_GUIDES[role].slice(0, 3).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                  <span className={styles.roleLink}>Ekipte göster <Icon name="chevronRight" /></span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="business-role-matrix-section" aria-labelledby="business-role-matrix-title">
        <div className="business-role-matrix-heading">
          <div>
            <h3 id="business-role-matrix-title">Yetki karşılaştırması</h3>
            <p>Her satır, istemci görünümünden bağımsız olarak sunucu tarafında doğrulanan gerçek yetki kuralını gösterir.</p>
          </div>
          <span className={styles.scrollHint}>Tabloyu kaydırın →</span>
        </div>

        <div className={styles.desktopMatrix}>
          <div className="business-role-matrix" role="region" aria-label="Rol ve yetki matrisi" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Yetki</th>
                  {ROLE_MATRIX_COLUMNS.map((role) => {
                    const access = ROLE_ACCESS[role];
                    return (
                      <th key={role} className={styles.matrixRoleHeader}>
                        <span className={styles.matrixRoleName}>{ROLE_LABELS[role]}</span>
                        <small className={styles.matrixAccessBadge} data-tone={access.tone}>{access.label}</small>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {capabilityGroups.map((group) => (
                  <Fragment key={group.id}>
                    <tr className={styles.categoryRow}>
                      <th colSpan={ROLE_MATRIX_COLUMNS.length + 1}><Icon name={CATEGORY_ICONS[group.id]} /><span>{group.label}</span><small>{group.description}</small></th>
                    </tr>
                    {group.capabilities.map((capability) => (
                      <tr key={capability.label}>
                        <td>{capability.label}</td>
                        {ROLE_MATRIX_COLUMNS.map((matrixRole) => {
                          const allowed = capability.allows(matrixRole);
                          const scope = scopeLabel(capability, matrixRole);
                          return (
                            <td key={matrixRole} className={allowed ? "allowed" : "denied"}>
                              {allowed ? <span className={styles.scope} data-scope={capability.scope}><Icon name="check" />{scope}</span> : <span className={styles.noScope}>—<span className="sr-only">Yetki yok</span></span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.mobileMatrix} aria-label="Mobil rol ve yetki karşılaştırması">
          {ROLE_MATRIX_COLUMNS.map((role) => {
            const count = members.filter((member) => member.role === role && member.status !== "LEFT").length;
            return (
              <article key={role} className={styles.mobileRoleCard}>
                <header className={styles.roleHeader}>
                  <span aria-hidden="true"><Icon name={ROLE_ICONS[role]} /></span>
                  <div>
                    <strong>{ROLE_LABELS[role]}</strong>
                    <small>{count} kayıtlı ekip üyesi · {ROLE_ACCESS[role].label}</small>
                  </div>
                </header>
                {capabilityGroups.map((group) => <section key={group.id} className={styles.mobileCategory}>
                  <h4><Icon name={CATEGORY_ICONS[group.id]} />{group.label}</h4>
                  <ul className={styles.capabilities}>
                    {group.capabilities.map((capability) => <li key={capability.label}>
                      <span>{capability.label}</span>
                      <b data-allowed={capability.allows(role)}>{scopeLabel(capability, role)}</b>
                    </li>)}
                  </ul>
                </section>)}
                <button type="button" className={styles.mobileRoleLink} onClick={() => onRoleSelect(role)}>Ekipte göster <Icon name="chevronRight" /></button>
              </article>
            );
          })}
        </div>
      </section>

      <aside className={`business-role-security ${styles.securityAlert}`}>
        <span className={styles.securityIcon}><Icon name="secure" /></span>
        <div>
          <strong>Sunucu yetkilendirmesi ve denetim</strong>
          <ul>
            <li>Kullanıcı kendi rolünü yükseltemez.</li>
            <li>Şirket Sahibi rolü devredilebilir; silinemez veya pasife alınamaz.</li>
            <li>Rol değişiklikleri, istemci yerine Supabase RLS ve sunucu yetkilendirme katmanında doğrulanır.</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}
