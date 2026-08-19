"use client";

import { Icon } from "../../../icons";
import CorporateHeroPreview from "./CorporateHeroPreview";
import type { CardAnalytics, Member, MemberCardStatus, Org, PhysicalCard, Template } from "../domain/types";
import type { CorporatePanelTab } from "../domain/navigation";
import { CORPORATE_PANEL_TAB_META } from "../domain/navigation";
import { normalizeOrganizationRole } from "../../../../lib/organizations/permissions";
import { ROLE_LABELS } from "../../../../lib/organizations/role-matrix";
import { countMembersWithoutPhysicalAssignment } from "../../../../lib/organizations/lifecycle";

type Props = {
  org: Org | null | undefined;
  orgs: Org[];
  selected: string;
  onSelectOrganization: (id: string) => void;
  subscription?: {
    seat_limit: number;
    expires_at: string | null;
    business_plans: { name: string; code: string } | null;
  };
  loading: boolean;
  usedSeats: number;
  availableSeats: number | null;
  invitedMembers: number;
  digitalCardsReady: number;
  members: Member[];
  physicalCards: PhysicalCard[];
  memberCardStatuses: MemberCardStatus[];
  templates: Template[];
  analytics: CardAnalytics | null;
  analyticsDays: 7 | 30 | 90;
  onPeriodChange: (days: 7 | 30 | 90) => void;
  currentUserId: string | null;
  canManageLicenses: boolean;
  visibleTabs: ReadonlyArray<readonly [CorporatePanelTab, string]>;
  openTab: (tab: CorporatePanelTab) => void;
  openMemberDrawer: (member: Member) => void;
  relativeTime: (value: string) => string;
  onEditOwnCard: () => void;
  onExportCsv: () => void;
};

function chartPoints(series: Array<{ date: string; count: number }>) {
  const max = Math.max(1, ...series.map((item) => item.count));
  return series
    .map((item, index) => {
      const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 92 - (item.count / max) * 76;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function OverviewPanel({
  org,
  orgs,
  selected,
  onSelectOrganization,
  subscription,
  loading,
  usedSeats,
  availableSeats,
  invitedMembers,
  digitalCardsReady,
  members,
  physicalCards,
  memberCardStatuses,
  templates,
  analytics,
  analyticsDays,
  onPeriodChange,
  currentUserId,
  canManageLicenses,
  visibleTabs,
  openTab,
  openMemberDrawer,
  relativeTime,
  onEditOwnCard,
  onExportCsv,
}: Props) {
  const daysUntilExpiry = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : null;
  const seatLimit = subscription?.seat_limit ?? 0;
  const seatPercent = seatLimit ? Math.min(100, Math.round((usedSeats / seatLimit) * 100)) : 0;
  const cardActivationPercent = usedSeats ? Math.round((digitalCardsReady / usedSeats) * 100) : 0;
  const acceptedMembers = members.filter((member) => member.status !== "LEFT" && member.status !== "INVITED");
  const cardsWithoutDigital = Math.max(0, acceptedMembers.length - digitalCardsReady);
  const unassignedPhysical = countMembersWithoutPhysicalAssignment(members, physicalCards);
  const recentActivity = [...members]
    .sort((a, b) => new Date(b.last_activity_at || b.created_at).getTime() - new Date(a.last_activity_at || a.created_at).getTime())
    .slice(0, 5);
  const ownMember = members.find((member) => member.user_id === currentUserId);
  const representative = ownMember || members.find((member) => member.role === "OWNER" && member.status === "ACTIVE") || members.find((member) => member.status === "ACTIVE") || members[0];
  const organizationRole = normalizeOrganizationRole(org?.role);
  const organizationRoleLabel = organizationRole ? ROLE_LABELS[organizationRole] : "—";
  const representativeCard = memberCardStatuses.find((item) => item.memberId === representative?.id);
  const overviewSeries = analytics?.byDay?.length ? analytics.byDay : [{ date: new Date().toISOString().slice(0, 10), count: 0 }];
  const hasOverviewData = overviewSeries.some((item) => item.count > 0);
  const overviewChartPoints = chartPoints(overviewSeries);
  const activePhysicalOwners = new Set(
    physicalCards.filter((card) => card.status === "ACTIVE" && card.ownerUserId).map((card) => card.ownerUserId),
  ).size;
  const digitalOnlyCards = Math.max(0, digitalCardsReady - activePhysicalOwners);
  const distributedCardTotal = digitalOnlyCards + activePhysicalOwners;
  const digitalCardPercent = distributedCardTotal ? Math.round((digitalOnlyCards / distributedCardTotal) * 100) : 0;
  const interactionClicks = analytics?.content?.clicks ?? 0;
  const interactionDownloads = analytics?.content?.downloads ?? 0;
  const interactionTotal = interactionClicks + interactionDownloads;
  const clickPercent = interactionTotal ? Math.round((interactionClicks / interactionTotal) * 100) : 0;
  const ringHole = "radial-gradient(circle at center,#fff 55%,transparent 57%)";
  const ringTrack = "#E6E2D8";
  const cardRing = distributedCardTotal
    ? `${ringHole},conic-gradient(#8d3ff0 0 ${digitalCardPercent}%,#4f8ee8 ${digitalCardPercent}% 100%)`
    : `${ringHole},conic-gradient(${ringTrack} 0 100%)`;
  const interactionRing = interactionTotal
    ? `${ringHole},conic-gradient(#8d3ff0 0 ${clickPercent}%,#dca12d ${clickPercent}% 100%)`
    : `${ringHole},conic-gradient(${ringTrack} 0 100%)`;
  const licenseRing = `${ringHole},conic-gradient(#8d3ff0 0 ${seatPercent}%,${ringTrack} ${seatPercent}% 100%)`;
  const healthWarning = availableSeats === 0 || (daysUntilExpiry ?? 999) <= 30;

  const tasks = [
    ["employees", `${invitedMembers} davet bekliyor`, "Davetleri takip et", invitedMembers, invitedMembers > 0],
    ["cards", `${cardsWithoutDigital} dijital kart eksik`, "Kart kurulumunu tamamla", cardsWithoutDigital, cardsWithoutDigital > 0],
    ["cards", `${unassignedPhysical} fiziksel kart atanmamış`, "Kart eşleştirmesini bitir", unassignedPhysical, unassignedPhysical > 0],
    [canManageLicenses ? "licenses" : "employees", "Kalan lisans", availableSeats === 0 ? "Kapasite dolu · lisans ekle" : `${usedSeats} / ${subscription?.seat_limit ?? "—"} kullanım`, availableSeats ?? 0, availableSeats === 0],
  ] as const;

  return (
    <div className="v25-overview p11-overview">
      <div className="p11-overview-org">
        <div className="business-company-picker">
          <label>
            Şirket
            <select value={selected} onChange={(event) => onSelectOrganization(event.target.value)}>
              {orgs.map((item) => (
                <option key={item.organization_id} value={item.organization_id}>
                  {item.organizations?.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="business-account-strip">
          <div>
            <small>Aktif kurumsal hesap</small>
            <strong>{org?.organizations?.name || "—"}</strong>
            <span>{organizationRoleLabel}</span>
          </div>
          <div>
            <small>Paket / lisans</small>
            <strong>{subscription?.business_plans?.name ?? "—"}</strong>
            <span>{loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"} lisans kullanılıyor</span>
          </div>
        </div>
      </div>

      <section className="v26-overview-hero">
        <div className="v26-overview-copy">
          <span>YENOMI BUSINESS · {org?.organizations?.name || "ŞİRKET"}</span>
          <small>Merhaba, {representative?.full_name?.split(" ")[0] || "Yönetici"}.</small>
          <h2>Dijital kartvizit altyapınız <em>tam kontrol</em> altında.</h2>
          <p>Çalışan kartlarını, kurumsal bağlantıları, lisans kapasitesini ve gerçek etkileşim verilerini tek merkezden yönetin.</p>
          <div>
            <button type="button" className="primary" onClick={() => openTab("employees")}>
              <Icon name="users" /> Ekibi Yönet
            </button>
            <button type="button" onClick={onEditOwnCard}>
              <Icon name="pencil" /> Kartımı Düzenle
            </button>
          </div>
        </div>
        <aside className="v26-card-stage" aria-label="Kart paylaşımı">
          <CorporateHeroPreview
            company={org?.organizations?.name || "Şirket"}
            name={representative?.full_name || org?.organizations?.name || "Kurumsal Kart"}
            title={representative?.title || representative?.department || "Kurumsal Dijital Kartvizit"}
            email={representative?.email || "Kurumsal profil"}
            slug={representativeCard?.slug || ""}
          />
        </aside>
        <nav className="v26-hero-capabilities" aria-label="Birincil panel görevleri">
          {([
            ["employees", "Çalışanları yönet", "Davet ve ekip"],
            ["cards", "Kartları yönet", "Fiziksel ve dijital"],
            ["licenses", "Lisansları yönet", "Kapasite ve paket"],
            ["content", "İçerik dağıt", "Bağlantı ve dosya"],
            ["analytics", "Performansı gör", "Görüntülenme"],
          ] as const)
            .filter(([key]) => visibleTabs.some(([tab]) => tab === key))
            .map(([key, label, hint]) => (
              <button type="button" key={key} onClick={() => openTab(key)}>
                <Icon name={CORPORATE_PANEL_TAB_META[key].icon} />
                <span>
                  <b>{label}</b>
                  <small>{hint}</small>
                </span>
                <em aria-hidden="true">→</em>
              </button>
            ))}
        </nav>
      </section>

      <div className={`v25-health-strip${healthWarning ? " warning" : ""}`}>
        <span className="v25-health-dot">
          <Icon name={healthWarning ? "lock" : "check"} />
        </span>
        <strong>
          {availableSeats === 0
            ? "Lisans kapasitesi dolu"
            : daysUntilExpiry != null && daysUntilExpiry <= 30
              ? `Abonelik ${daysUntilExpiry} gün içinde bitiyor`
              : "Her şey yolunda"}
        </strong>
        <small>
          {availableSeats === 0
            ? "Yeni çalışan daveti kapatıldı; ek lisans alındığında otomatik açılır."
            : daysUntilExpiry != null && daysUntilExpiry <= 30
              ? "Kesinti yaşamamak için yenileme planını kontrol edin."
              : "Tüm temel sistemler aktif durumda."}
        </small>
        <button
          type="button"
          onClick={() => {
            if ((availableSeats ?? 0) > 0 && (daysUntilExpiry ?? 999) <= 30) {
              window.location.href = `mailto:hello@yenomilabs.com?subject=${encodeURIComponent(`${org?.organizations?.name || "Kurumsal hesap"} yenileme teklifi`)}`;
              return;
            }
            openTab(availableSeats === 0 && canManageLicenses ? "licenses" : "employees");
          }}
        >
          {availableSeats === 0
            ? canManageLicenses
              ? "Lisans Satın Al →"
              : "Çalışanları görüntüle →"
            : daysUntilExpiry != null && daysUntilExpiry <= 30
              ? "Yenileme için teklif iste →"
              : "Detayları görüntüle →"}
        </button>
      </div>

      <section className="p11-overview-today" aria-label="Bugün yapılacaklar">
        {tasks.map(([tab, title, hint, count, alert]) => (
          <button type="button" key={title} className={alert ? "is-alert" : undefined} onClick={() => openTab(tab)}>
            <small>Bugün</small>
            <strong>{count}</strong>
            <span>{title}</span>
            <em>{hint}</em>
          </button>
        ))}
      </section>

      <div className="v26-reference-dashboard">
        <section className="v26-reference-kpis">
          <article><i className="violet"><Icon name="users" /></i><span><small>Aktif Çalışan</small><b>{usedSeats}</b><em>Kullanılan lisans</em></span></article>
          <article><i className="green"><Icon name="contact" /></i><span><small>Aktif Kart</small><b>{digitalCardsReady} / {usedSeats || 0}</b><em>%{cardActivationPercent} aktivasyon oranı</em></span></article>
          <article><i className="violet"><Icon name="analytics" /></i><span><small>Toplam Görüntülenme</small><b>{analytics?.available === false ? "—" : (analytics?.totalViews ?? 0).toLocaleString("tr-TR")}</b><em>Seçili dönem</em></span></article>
          <article><i className="blue"><Icon name="link" /></i><span><small>İçerik Etkileşimi</small><b>{analytics?.content?.clicks ?? 0}</b><em>URL tıklaması</em></span></article>
        </section>

        <div className="v26-reference-main-row">
          <section className="v26-reference-chart">
            <header>
              <div>
                <h3>Kart Etkileşimleri</h3>
                <p>Gerçek kart görüntüleme verileri</p>
              </div>
              <div className="p11-overview-chart-tools">
                <select
                  aria-label="Etkileşim tarih aralığı"
                  value={analyticsDays}
                  onChange={(event) => onPeriodChange(Number(event.target.value) as 7 | 30 | 90)}
                >
                  <option value={7}>Son 7 gün</option>
                  <option value={30}>Son 30 gün</option>
                  <option value={90}>Son 90 gün</option>
                </select>
                <button type="button" onClick={onExportCsv}>CSV indir</button>
              </div>
            </header>
            <div className="v26-chart-tabs">
              <b>Görüntülenme</b>
              <span>QR / NFC ölçümleri yalnızca kayıt oluştuğunda gösterilir</span>
            </div>
            <div className="v26-chart-canvas">
              {hasOverviewData ? (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Kart görüntülenme eğrisi">
                  <defs>
                    <linearGradient id="overviewArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#9848f2" stopOpacity=".52" />
                      <stop offset="1" stopColor="#9848f2" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={`0,100 ${overviewChartPoints} 100,100`} fill="url(#overviewArea)" />
                  <polyline points={overviewChartPoints} fill="none" stroke="#a855f7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : (
                <p>Bu dönemde henüz kart görüntülenmesi yok.</p>
              )}
            </div>
            <footer>
              <span>{analytics?.periodStart || overviewSeries[0]?.date}</span>
              <strong>{(analytics?.totalViews ?? 0).toLocaleString("tr-TR")} toplam görüntülenme</strong>
              <span>{analytics?.periodEnd || overviewSeries[overviewSeries.length - 1]?.date}</span>
            </footer>
          </section>
          <section className="v26-reference-activity">
            <header>
              <h3>Son Aktiviteler</h3>
              <button type="button" onClick={() => openTab("employees")}>Tümünü Gör →</button>
            </header>
            {recentActivity.length ? recentActivity.map((member) => {
              const activity = member.status === "INVITED"
                ? { text: "Çalışan daveti oluşturuldu", tone: "invite", icon: "mail" as const }
                : member.status === "ACTIVE"
                  ? { text: "Çalışan hesabı aktif", tone: "active", icon: "check" as const }
                  : member.status === "LEFT"
                    ? { text: "Çalışan şirketten ayrıldı", tone: "left", icon: "logout" as const }
                    : member.status === "SUSPENDED"
                      ? { text: "Çalışan hesabı pasife alındı", tone: "suspended", icon: "lock" as const }
                      : { text: "Çalışan kaydı güncellendi", tone: "updated", icon: "users" as const };
              return (
                <button type="button" key={member.id} onClick={() => { openTab("employees"); openMemberDrawer(member); }}>
                  <i className={`tone-${activity.tone}`}><Icon name={activity.icon} /></i>
                  <span>
                    <b>{member.full_name || member.email}</b>
                    <small>{activity.text}</small>
                  </span>
                  <time>{relativeTime(member.last_activity_at || member.created_at)}</time>
                </button>
              );
            }) : <p className="v25-empty-line">Henüz aktivite oluşmadı.</p>}
          </section>
        </div>

        <section className="v26-reference-bottom">
          <article>
            <h3>Kart Dağılımı</h3>
            <div className="v26-summary-body">
              <div className="v26-ring" style={{ background: cardRing }}><b>{distributedCardTotal}</b><small>Toplam</small></div>
              <ul>
                <li><i className="purple" />Yalnız Dijital <b>{digitalOnlyCards}</b></li>
                <li><i className="blue" />Fiziksel + Dijital <b>{activePhysicalOwners}</b></li>
              </ul>
            </div>
            <button type="button" onClick={() => openTab("cards")}>Kartları Yönet →</button>
          </article>
          <article>
            <h3>Etkileşim Kanalları</h3>
            <div className="v26-summary-body">
              <div className="v26-ring alternate" style={{ background: interactionRing }}><b>{interactionTotal}</b><small>Toplam</small></div>
              <ul>
                <li><i className="purple" />URL Tıklaması <b>{interactionClicks}</b></li>
                <li><i className="gold" />PDF Açma <b>{interactionDownloads}</b></li>
              </ul>
            </div>
            <button type="button" onClick={() => openTab("analytics")}>Detayları Görüntüle →</button>
          </article>
          <article>
            <h3>Kart Şablonları</h3>
            <div className="v26-template-count">
              <i><Icon name="pencil" /></i>
              <b>{templates.length}</b>
              <span>Kayıtlı şablon</span>
            </div>
            <p>Kurumsal kart görünümünü merkezi yönetin.</p>
            <button type="button" onClick={() => openTab("templates")}>Şablonları Yönet →</button>
          </article>
          <article>
            <h3>Lisans Kullanımı</h3>
            <div className="v26-summary-body">
              <div className="v26-ring" style={{ background: licenseRing }}><b>{usedSeats}/{subscription?.seat_limit ?? "—"}</b><small>Kullanılan</small></div>
              <ul>
                <li><i className="purple" />Kullanılan <b>{usedSeats}</b></li>
                <li><i className="muted" />Boş <b>{availableSeats ?? "—"}</b></li>
              </ul>
            </div>
            {canManageLicenses && <button type="button" onClick={() => openTab("licenses")}>Lisansları Yönet →</button>}
          </article>
        </section>
      </div>
    </div>
  );
}
