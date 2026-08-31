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

type AnalyticsEntry = { date: string; count: number };
type AnalyticsChartPoint = AnalyticsEntry & { x: number; y: number };

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
});

function formatAnalyticsDate(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? value : shortDateFormatter.format(parsedDate);
}

function buildAnalyticsChart(series: AnalyticsEntry[]) {
  const maximumCount = Math.max(1, ...series.map((entry) => entry.count));
  let peakIndex = 0;

  const points: AnalyticsChartPoint[] = series.map((entry, index) => {
    if (entry.count > series[peakIndex].count) peakIndex = index;
    const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
    const y = 90 - (entry.count / maximumCount) * 72;
    return { ...entry, x, y };
  });

  return {
    points,
    polyline: points.map(({ x, y }) => `${x},${y}`).join(" "),
    peak: points[peakIndex],
  };
}

export default function OverviewPanel({
  org,
  subscription,
  usedSeats,
  availableSeats,
  invitedMembers,
  digitalCardsReady,
  members,
  physicalCards,
  analytics,
  analyticsDays,
  onPeriodChange,
  canManageLicenses,
  visibleTabs,
  openTab,
  openMemberDrawer,
  relativeTime,
  onExportCsv,
}: Props) {
  const activeMembers = members.filter((member) => member.status !== "LEFT" && member.status !== "INVITED");
  const incompleteDigitalCards = Math.max(0, activeMembers.length - digitalCardsReady);
  const unassignedPhysicalCards = countMembersWithoutPhysicalAssignment(members, physicalCards);
  const daysUntilExpiry = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : null;
  const profileCompletionPercent = usedSeats ? Math.round((digitalCardsReady / usedSeats) * 100) : 0;
  const organizationRole = normalizeOrganizationRole(org?.role);
  const organizationRoleLabel = organizationRole ? ROLE_LABELS[organizationRole] : "—";
  const recentActivity = [...members]
    .sort((firstMember, secondMember) => new Date(secondMember.last_activity_at || secondMember.created_at).getTime() - new Date(firstMember.last_activity_at || firstMember.created_at).getTime())
    .slice(0, 5);
  const overviewSeries = analytics?.byDay?.length ? analytics.byDay : [{ date: new Date().toISOString().slice(0, 10), count: 0 }];
  const hasOverviewData = overviewSeries.some((entry) => entry.count > 0);
  const analyticsChart = buildAnalyticsChart(overviewSeries);
  const activeAnalyticsDays = overviewSeries.reduce((activeDays, entry) => activeDays + (entry.count > 0 ? 1 : 0), 0);
  const periodStartLabel = formatAnalyticsDate(overviewSeries[0].date);
  const periodEndLabel = formatAnalyticsDate(overviewSeries[overviewSeries.length - 1].date);
  const analyticsAvailable = analytics?.available !== false;
  const totalViews = analyticsAvailable ? analytics?.totalViews ?? 0 : null;
  const contentClicks = analytics?.content?.clicks ?? 0;
  const chartAccessibilityLabel = `${analyticsDays} günlük kart görüntülenme eğrisi. ${activeAnalyticsDays} aktif gün, zirve ${analyticsChart.peak.count} görüntülenme.`;

  const canOpen = (tab: CorporatePanelTab) => visibleTabs.some(([visibleTab]) => visibleTab === tab);

  let priority: {
    eyebrow: string;
    title: string;
    copy: string;
    action: string;
    tab: CorporatePanelTab;
    tone: "critical" | "attention" | "healthy";
    icon: "lock" | "contact" | "users" | "check";
    capacityUpgrade?: boolean;
  };

  if (unassignedPhysicalCards > 0) {
    priority = {
      eyebrow: "AKSİYON GEREKİYOR",
      title: `${unassignedPhysicalCards} fiziksel kart çalışanla eşleşmemiş.`,
      copy: "Kartları ilgili çalışanlarla eşleştirerek dağıtım sürecini tamamlayın.",
      action: "Atamaları tamamla",
      tab: "employees",
      tone: "attention",
      icon: "contact",
    };
  } else if (availableSeats === 0) {
    priority = {
      eyebrow: "KAPASİTE DOLU",
      title: "Yeni çalışan için boş kart kapasitesi yok.",
      copy: `${usedSeats} / ${subscription?.seat_limit ?? "—"} kapasite kullanımda. Yeni çalışan eklemek için kapasite açılması gerekiyor.`,
      action: canManageLicenses ? "Kapasiteyi artır" : "Ekibi görüntüle",
      tab: "employees",
      tone: "critical",
      icon: "lock",
      capacityUpgrade: canManageLicenses,
    };
  } else if (invitedMembers > 0) {
    priority = {
      eyebrow: "DAVET BEKLİYOR",
      title: `${invitedMembers} çalışan henüz daveti tamamlamadı.`,
      copy: "Bekleyen davetleri kontrol ederek ekip kurulumunu tamamlayın.",
      action: "Davetleri kontrol et",
      tab: "employees",
      tone: "attention",
      icon: "users",
    };
  } else if (incompleteDigitalCards > 0) {
    priority = {
      eyebrow: "PROFİL EKSİK",
      title: `${incompleteDigitalCards} çalışanın dijital kartı hazır değil.`,
      copy: "Eksik profilleri tamamlayarak tüm ekibin kartlarını yayına hazır hale getirin.",
      action: "Eksik kartları tamamla",
      tab: "employees",
      tone: "attention",
      icon: "contact",
    };
  } else if (daysUntilExpiry != null && daysUntilExpiry <= 30) {
    priority = {
      eyebrow: "YENİLEME YAKLAŞIYOR",
      title: `Aboneliğin yenilenmesine ${daysUntilExpiry} gün kaldı.`,
      copy: "Kart erişiminde kesinti oluşmaması için yenileme durumunu kontrol edin.",
      action: "Ekibi ve kartları kontrol et",
      tab: "employees",
      tone: "attention",
      icon: "lock",
    };
  } else {
    priority = {
      eyebrow: "HER ŞEY YOLUNDA",
      title: "Şu anda müdahale gerektiren bir kart işlemi yok.",
      copy: "Ekip kurulumu, dijital kartlar ve fiziksel kart atamaları güncel.",
      action: "Ekibi görüntüle",
      tab: "employees",
      tone: "healthy",
      icon: "check",
    };
  }

  return (
    <div className="cp-overview-v2" data-overview-version="3">
      <header className="cp-overview-v2__workspace">
        <div>
          <span className="cp-overview-v2__eyebrow">YENOMI BUSINESS</span>
          <h2>Genel Bakış</h2>
          <p>Bugün müdahale gerektiren işleri ve kart kullanımını tek ekranda takip edin.</p>
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
          {priority.capacityUpgrade ? (
            <a className="cp-overview-v2__primary" href="/kurumsal#kapasite">
              {priority.action} <span aria-hidden="true">→</span>
            </a>
          ) : canOpen(priority.tab) ? (
            <button type="button" className="cp-overview-v2__primary" onClick={() => openTab(priority.tab)}>
              {priority.action} <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      </section>

      <section className="cp-overview-v2__metrics" aria-label="Kurumsal hesap özeti">
        <article data-state={availableSeats === 0 ? "attention" : "neutral"}>
          <span>Kart kapasitesi</span>
          <strong>{usedSeats}<small> / {subscription?.seat_limit ?? "—"}</small></strong>
          <p>{availableSeats === 0 ? "Kapasite dolu" : `${availableSeats ?? "—"} boş kart`}</p>
        </article>
        <article data-state={invitedMembers > 0 ? "attention" : "neutral"}>
          <span>Bekleyen davet</span>
          <strong>{invitedMembers}</strong>
          <p>{invitedMembers > 0 ? "Takip gerekiyor" : "Bekleyen yok"}</p>
        </article>
        <article data-state={profileCompletionPercent < 100 ? "attention" : "positive"}>
          <span>Profil kurulumu</span>
          <strong>%{profileCompletionPercent}</strong>
          <p>{profileCompletionPercent === 100 ? "Tüm profiller hazır" : `${digitalCardsReady} / ${usedSeats || 0} hazır`}</p>
        </article>
        <article data-state={unassignedPhysicalCards > 0 ? "attention" : "positive"}>
          <span>Fiziksel kart ataması</span>
          <strong>{unassignedPhysicalCards}</strong>
          <p>{unassignedPhysicalCards > 0 ? "Atama bekliyor" : "Eksik atama yok"}</p>
        </article>
      </section>

      <div className="cp-overview-v2__main-grid">
        <section className="cp-overview-v2__performance" aria-labelledby="corporate-performance-title">
          <header>
            <div>
              <span className="cp-overview-v2__eyebrow">KULLANIM</span>
              <h3 id="corporate-performance-title">Kart kullanımı</h3>
              <p>QR ve NFC üzerinden oluşan doğrulanmış görüntülenme ve içerik etkileşimleri.</p>
            </div>
            <div className="cp-overview-v2__chart-tools">
              <select
                aria-label="Kart kullanımı tarih aralığı"
                value={analyticsDays}
                onChange={(event) => onPeriodChange(Number(event.target.value) as 7 | 30 | 90)}
              >
                <option value={7}>7 gün</option>
                <option value={30}>30 gün</option>
                <option value={90}>90 gün</option>
              </select>
              <button type="button" onClick={onExportCsv} aria-label="Kart kullanım verilerini CSV olarak indir">CSV indir</button>
            </div>
          </header>

          <div className="cp-overview-v2__chart-summary">
            <div><span>Görüntülenme</span><strong>{totalViews == null ? "—" : totalViews.toLocaleString("tr-TR")}</strong></div>
            <div><span>İçerik tıklaması</span><strong>{contentClicks.toLocaleString("tr-TR")}</strong></div>
            {hasOverviewData && (
              <div className="cp-overview-v2__chart-signal">
                <span>Aktif gün</span>
                <strong>{activeAnalyticsDays}</strong>
              </div>
            )}
          </div>

          <div className={`cp-overview-v2__chart${hasOverviewData ? " has-data" : " is-empty"}`}>
            {hasOverviewData ? (
              <>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={chartAccessibilityLabel}>
                  <line className="cp-overview-v2__chart-guide" x1="0" y1="28" x2="100" y2="28" />
                  <line className="cp-overview-v2__chart-guide" x1="0" y1="54" x2="100" y2="54" />
                  <line className="cp-overview-v2__chart-guide" x1="0" y1="80" x2="100" y2="80" />
                  <polyline className="cp-overview-v2__chart-line" points={analyticsChart.polyline} fill="none" vectorEffect="non-scaling-stroke" />
                  <line
                    className="cp-overview-v2__chart-peak"
                    x1={analyticsChart.peak.x}
                    x2={analyticsChart.peak.x}
                    y1={Math.max(12, analyticsChart.peak.y - 3)}
                    y2={Math.min(94, analyticsChart.peak.y + 3)}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="cp-overview-v2__chart-context" aria-hidden="true">
                  <span>{periodStartLabel}</span>
                  <strong>{activeAnalyticsDays} aktif gün · Zirve {analyticsChart.peak.count}</strong>
                  <span>{periodEndLabel}</span>
                </div>
              </>
            ) : (
              <div className="cp-overview-v2__empty">
                <Icon name="analytics" />
                <strong>Bu dönemde görüntülenme yok</strong>
                <span>İlk QR veya NFC etkileşiminden sonra kullanım verileri burada görünür.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="cp-overview-v2__activity" aria-labelledby="corporate-activity-title">
          <header>
            <div>
              <span className="cp-overview-v2__eyebrow">EKİP</span>
              <h3 id="corporate-activity-title">Son hesap hareketleri</h3>
            </div>
            {canOpen("employees") && <button type="button" onClick={() => openTab("employees")}>Ekibi aç →</button>}
          </header>
          <div className="cp-overview-v2__activity-list">
            {recentActivity.length ? recentActivity.map((member) => {
              const activityLabel = member.status === "INVITED"
                ? "Davet bekliyor"
                : member.status === "SUSPENDED"
                  ? "Hesap pasife alındı"
                  : member.status === "LEFT"
                    ? "Şirketten ayrıldı"
                    : member.last_activity_at
                      ? "Son hesap etkinliği"
                      : "Çalışan hesabı oluşturuldu";
              return (
                <button type="button" key={member.id} onClick={() => { openTab("employees"); openMemberDrawer(member); }}>
                  <span className="cp-overview-v2__avatar" aria-hidden="true">
                    {(member.full_name || member.email || "Y").trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="cp-overview-v2__activity-copy">
                    <strong>{member.full_name || member.email}</strong>
                    <small>{activityLabel}</small>
                  </span>
                  <time>{relativeTime(member.last_activity_at || member.created_at)}</time>
                </button>
              );
            }) : (
              <div className="cp-overview-v2__activity-empty">Henüz ekip hareketi oluşmadı.</div>
            )}
          </div>
        </aside>
      </div>

      <span className="cp-overview-v2__sr-summary" aria-live="polite">
        {org?.organizations?.name || "Kurumsal hesap"}: {organizationRoleLabel}, {usedSeats} kullanılan kart kapasitesi, {digitalCardsReady} aktif kart, {unassignedPhysicalCards} fiziksel kart ataması bekliyor.
      </span>
    </div>
  );
}
