"use client";

import { Icon } from "../../../icons";
import type { CardAnalytics, Member, MemberCardStatus, Org, PhysicalCard, Template } from "../domain/types";
import type { CorporatePanelTab } from "../domain/navigation";
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
  const acceptedMembers = members.filter((member) => member.status !== "LEFT" && member.status !== "INVITED");
  const cardsWithoutDigital = Math.max(0, acceptedMembers.length - digitalCardsReady);
  const unassignedPhysical = countMembersWithoutPhysicalAssignment(members, physicalCards);
  const daysUntilExpiry = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : null;
  const cardActivationPercent = usedSeats ? Math.round((digitalCardsReady / usedSeats) * 100) : 0;
  const organizationRole = normalizeOrganizationRole(org?.role);
  const organizationRoleLabel = organizationRole ? ROLE_LABELS[organizationRole] : "—";
  const ownMember = members.find((member) => member.user_id === currentUserId);
  const recentActivity = [...members]
    .sort((a, b) => new Date(b.last_activity_at || b.created_at).getTime() - new Date(a.last_activity_at || a.created_at).getTime())
    .slice(0, 5);
  const overviewSeries = analytics?.byDay?.length ? analytics.byDay : [{ date: new Date().toISOString().slice(0, 10), count: 0 }];
  const hasOverviewData = overviewSeries.some((item) => item.count > 0);
  const overviewChartPoints = chartPoints(overviewSeries);
  const analyticsAvailable = analytics?.available !== false;
  const totalViews = analyticsAvailable ? analytics?.totalViews ?? 0 : null;
  const contentClicks = analytics?.content?.clicks ?? 0;

  const canOpen = (tab: CorporatePanelTab) => visibleTabs.some(([visibleTab]) => visibleTab === tab);

  let priority: {
    eyebrow: string;
    title: string;
    copy: string;
    action: string;
    tab: CorporatePanelTab;
    tone: "critical" | "attention" | "healthy";
    icon: "lock" | "contact" | "users" | "check";
  };

  if (unassignedPhysical > 0) {
    priority = {
      eyebrow: "ÖNCELİKLİ İŞ",
      title: `${unassignedPhysical} çalışanın fiziksel kartı atanmayı bekliyor.`,
      copy: "Kartları çalışanlarla eşleştirerek fiziksel dağıtımı tamamlayın.",
      action: "Kartları eşleştir",
      tab: "cards",
      tone: "attention",
      icon: "contact",
    };
  } else if (availableSeats === 0) {
    priority = {
      eyebrow: "KAPASİTE DOLU",
      title: "Yeni çalışan eklemek için kart kapasitesini artırın.",
      copy: `${usedSeats} / ${subscription?.seat_limit ?? "—"} kart kapasitesi kullanımda. Yeni davetler ek kapasite açılana kadar durdurulur.`,
      action: canManageLicenses ? "Kartları yönet" : "Ekibi görüntüle",
      tab: canManageLicenses ? "cards" : "employees",
      tone: "critical",
      icon: "lock",
    };
  } else if (invitedMembers > 0) {
    priority = {
      eyebrow: "DAVETLER",
      title: `${invitedMembers} çalışan daveti yanıt bekliyor.`,
      copy: "Bekleyen davetleri kontrol edin ve ekip kurulumunu tamamlayın.",
      action: "Davetleri görüntüle",
      tab: "employees",
      tone: "attention",
      icon: "users",
    };
  } else if (cardsWithoutDigital > 0) {
    priority = {
      eyebrow: "KART KURULUMU",
      title: `${cardsWithoutDigital} çalışanın dijital kart kurulumu eksik.`,
      copy: "Eksik profilleri tamamlayarak tüm ekibin aynı standartta görünmesini sağlayın.",
      action: "Kartları tamamla",
      tab: "cards",
      tone: "attention",
      icon: "contact",
    };
  } else if (daysUntilExpiry != null && daysUntilExpiry <= 30) {
    priority = {
      eyebrow: "YENİLEME",
      title: `Aboneliğiniz ${daysUntilExpiry} gün içinde yenilenmeli.`,
      copy: "Hizmet kesintisi yaşamamak için yenileme planınızı kontrol edin.",
      action: canManageLicenses ? "Kartları yönet" : "Ekibi görüntüle",
      tab: canManageLicenses ? "cards" : "employees",
      tone: "attention",
      icon: "lock",
    };
  } else {
    priority = {
      eyebrow: "SİSTEM DURUMU",
      title: "Kurumsal kart operasyonunuz güncel.",
      copy: "Ekip, kart kapasitesi ve dijital kart kurulumlarında şu anda kritik bir iş bulunmuyor.",
      action: "Ekibi yönet",
      tab: "employees",
      tone: "healthy",
      icon: "check",
    };
  }

  return (
    <div className="cp-overview-v2" data-overview-version="2">
      <header className="cp-overview-v2__workspace">
        <div>
          <span className="cp-overview-v2__eyebrow">YENOMI BUSINESS</span>
          <h2>Genel Bakış</h2>
          <p>Bugün müdahale gerektiren işleri ve ekip sağlığını tek ekranda görün.</p>
        </div>
      </header>

      <section className={`cp-overview-v2__priority is-${priority.tone}`} aria-labelledby="corporate-priority-title">
        <div className="cp-overview-v2__priority-icon"><Icon name={priority.icon} /></div>
        <div className="cp-overview-v2__priority-copy">
          <span>{priority.eyebrow}</span>
          <h3 id="corporate-priority-title">{priority.title}</h3>
          <p>{priority.copy}</p>
        </div>
        <div className="cp-overview-v2__priority-actions">
          {canOpen(priority.tab) && (
            <button type="button" className="cp-overview-v2__primary" onClick={() => openTab(priority.tab)}>
              {priority.action} <span aria-hidden="true">→</span>
            </button>
          )}
          <button type="button" className="cp-overview-v2__secondary" onClick={onEditOwnCard}>
            Kartımı düzenle
          </button>
        </div>
      </section>

      <section className="cp-overview-v2__metrics" aria-label="Kurumsal hesap özeti">
        <article>
          <span>Kart Kapasitesi</span>
          <strong>{usedSeats}<small> / {subscription?.seat_limit ?? "—"}</small></strong>
          <p>{availableSeats === 0 ? "Kapasite dolu" : `${availableSeats ?? "—"} boş kart`}</p>
        </article>
        <article>
          <span>Bekleyen Davetler</span>
          <strong>{invitedMembers}</strong>
          <p>{invitedMembers > 0 ? "Yanıt bekliyor" : "Tüm davetler kabul edildi"}</p>
        </article>
        <article>
          <span>Dijital Profil Kurulumu</span>
          <strong>{digitalCardsReady}<small> / {usedSeats || 0}</small></strong>
          <p>%{cardActivationPercent} kurulum tamamlandı</p>
        </article>
        <article>
          <span>Fiziksel Kart Atamaları</span>
          <strong>{unassignedPhysical}</strong>
          <p>{unassignedPhysical > 0 ? "Kart atanmayı bekliyor" : "Tüm kartlar eşleşti"}</p>
        </article>
      </section>

      <div className="cp-overview-v2__quick-actions" aria-label="Hızlı işlemler">
        {canOpen("employees") && (
          <button type="button" onClick={() => openTab("employees")}>
            <Icon name="users" /> Ekibi Yönet
          </button>
        )}
        {canOpen("cards") && (
          <button type="button" onClick={() => openTab("cards")}>
            <Icon name="contact" /> Kartları Eşleştir
          </button>
        )}
        {canOpen("cards") && canManageLicenses && (
          <button type="button" onClick={() => openTab("cards")}>
            <Icon name="contact" /> Kart Kapasitesi
          </button>
        )}
      </div>

      <div className="cp-overview-v2__main-grid">
        <section className="cp-overview-v2__performance" aria-labelledby="corporate-performance-title">
          <header>
            <div>
              <span className="cp-overview-v2__eyebrow">PERFORMANS</span>
              <h3 id="corporate-performance-title">Kart etkileşimleri</h3>
              <p>QR ve NFC üzerinden oluşan gerçek görüntülenme verileri.</p>
            </div>
            <div className="cp-overview-v2__chart-tools">
              <select
                aria-label="Etkileşim tarih aralığı"
                value={analyticsDays}
                onChange={(event) => onPeriodChange(Number(event.target.value) as 7 | 30 | 90)}
              >
                <option value={7}>7 gün</option>
                <option value={30}>30 gün</option>
                <option value={90}>90 gün</option>
              </select>
              <button type="button" onClick={onExportCsv}>CSV</button>
            </div>
          </header>

          <div className="cp-overview-v2__chart-summary">
            <div><span>Toplam görüntülenme</span><strong>{totalViews == null ? "—" : totalViews.toLocaleString("tr-TR")}</strong></div>
            <div><span>İçerik tıklaması</span><strong>{contentClicks.toLocaleString("tr-TR")}</strong></div>
          </div>

          <div className={`cp-overview-v2__chart${hasOverviewData ? " has-data" : " is-empty"}`}>
            {hasOverviewData ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Kart görüntülenme eğrisi">
                <defs>
                  <linearGradient id="overviewGoldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b58a35" stopOpacity=".24" />
                    <stop offset="100%" stopColor="#b58a35" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,100 ${overviewChartPoints} 100,100`} fill="url(#overviewGoldArea)" />
                <polyline points={overviewChartPoints} fill="none" stroke="#a9812f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : (
              <div className="cp-overview-v2__empty">
                <Icon name="analytics" />
                <strong>Henüz görüntülenme yok</strong>
                <span>İlk QR veya NFC etkileşimi geldiğinde performans burada görünür.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="cp-overview-v2__activity" aria-labelledby="corporate-activity-title">
          <header>
            <div>
              <span className="cp-overview-v2__eyebrow">SON HAREKETLER</span>
              <h3 id="corporate-activity-title">Ekip aktivitesi</h3>
            </div>
            {canOpen("employees") && <button type="button" onClick={() => openTab("employees")}>Tümü →</button>}
          </header>
          <div className="cp-overview-v2__activity-list">
            {recentActivity.length ? recentActivity.map((member) => {
              const activity = member.status === "INVITED"
                ? "Davet bekliyor"
                : member.status === "SUSPENDED"
                  ? "Hesap pasife alındı"
                  : member.status === "LEFT"
                    ? "Şirketten ayrıldı"
                    : "Çalışan hesabı aktif";
              return (
                <button type="button" key={member.id} onClick={() => { openTab("employees"); openMemberDrawer(member); }}>
                  <span className="cp-overview-v2__avatar" aria-hidden="true">
                    {(member.full_name || member.email || "Y").trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="cp-overview-v2__activity-copy">
                    <strong>{member.full_name || member.email}</strong>
                    <small>{activity}</small>
                  </span>
                  <time>{relativeTime(member.last_activity_at || member.created_at)}</time>
                </button>
              );
            }) : (
              <div className="cp-overview-v2__activity-empty">Henüz ekip aktivitesi oluşmadı.</div>
            )}
          </div>
        </aside>
      </div>

      <footer className="cp-overview-v2__quick-actions" aria-label="Hızlı işlemler">
        {canOpen("employees") && <button type="button" onClick={() => openTab("employees")}><Icon name="users" /> Ekibi yönet</button>}
        {canOpen("cards") && <button type="button" onClick={() => openTab("cards")}><Icon name="contact" /> Kartları yönet</button>}
        {canManageLicenses && canOpen("cards") && <button type="button" onClick={() => openTab("cards")}><Icon name="contact" /> Kart kapasitesi</button>}
      </footer>

      <span className="cp-overview-v2__sr-summary" aria-live="polite">
        {org?.organizations?.name || "Kurumsal hesap"}: {usedSeats} kullanılan kart kapasitesi, {digitalCardsReady} aktif kart, {unassignedPhysical} fiziksel kart ataması bekliyor.
      </span>
    </div>
  );
}
