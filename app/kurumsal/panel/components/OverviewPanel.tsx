"use client";

import type { CSSProperties } from "react";
import { Icon, type IconName } from "../../../icons";
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
  canPurchaseCorporateCommerce: boolean;
  canInvite: boolean;
  visibleTabs: ReadonlyArray<readonly [CorporatePanelTab, string]>;
  openTab: (tab: CorporatePanelTab) => void;
  onInvite: () => void;
  openMemberDrawer: (member: Member) => void;
  relativeTime: (value: string) => string;
  onEditOwnCard: () => void;
  onEditCorporateBranding: () => void;
  onExportCsv: () => void;
};

type AnalyticsEntry = { date: string; count: number };
type AnalyticsChartPoint = AnalyticsEntry & { x: number; y: number; width: number; height: number };
type PriorityItem = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  action: string;
  tab: CorporatePanelTab;
  tone: "critical" | "attention" | "healthy";
  icon: IconName;
  capacityUpgrade?: boolean;
};

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
  const slot = 100 / Math.max(series.length, 1);
  const gap = series.length > 48 ? 0.2 : 0.55;
  const width = Math.max(0.45, slot - gap);
  let peakIndex = 0;

  const points: AnalyticsChartPoint[] = series.map((entry, index) => {
    if (entry.count > series[peakIndex].count) peakIndex = index;
    const height = (entry.count / maximumCount) * 72;
    const x = index * slot + (slot - width) / 2;
    const y = 92 - height;
    return { ...entry, x, y, width, height };
  });

  return {
    points,
    peak: points[peakIndex],
  };
}

function activityMeta(member: Member) {
  if (member.status === "INVITED") return { label: "Davet bekliyor", icon: "mail" as IconName, tone: "attention" };
  if (member.status === "SUSPENDED") return { label: "Hesap pasife alındı", icon: "lock" as IconName, tone: "critical" };
  if (member.status === "LEFT") return { label: "Şirketten ayrıldı", icon: "logout" as IconName, tone: "neutral" };
  if (member.last_activity_at) return { label: "Profil veya kart etkinliği", icon: "pencil" as IconName, tone: "positive" };
  return { label: "Çalışan hesabı oluşturuldu", icon: "users" as IconName, tone: "positive" };
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
  canPurchaseCorporateCommerce,
  canInvite,
  visibleTabs,
  openTab,
  onInvite,
  openMemberDrawer,
  relativeTime,
  onEditCorporateBranding,
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
  const contentHighlights = analytics?.content?.byLink?.slice(0, 3) ?? [];
  const seatLimit = subscription?.seat_limit ?? 0;
  const capacityPercent = seatLimit > 0 ? Math.min(100, Math.round((usedSeats / seatLimit) * 100)) : 0;
  const chartAccessibilityLabel = `${analyticsDays} günlük kart görüntülenme dağılımı. ${activeAnalyticsDays} aktif gün, zirve ${analyticsChart.peak.count} görüntülenme.`;

  const canOpen = (tab: CorporatePanelTab) => visibleTabs.some(([visibleTab]) => visibleTab === tab);

  const priorityQueue: PriorityItem[] = [];
  if (unassignedPhysicalCards > 0) {
    priorityQueue.push({
      id: "physical-cards",
      eyebrow: "AKSİYON GEREKİYOR",
      title: `${unassignedPhysicalCards} fiziksel kart çalışanla eşleşmemiş.`,
      copy: "Kartları ilgili çalışanlarla eşleştirerek dağıtım sürecini tamamlayın.",
      action: "Atamaları tamamla",
      tab: "employees",
      tone: "attention",
      icon: "contact",
    });
  }
  if (availableSeats === 0) {
    priorityQueue.push({
      id: "capacity",
      eyebrow: "KAPASİTE DOLU",
      title: "Yeni çalışan için boş kart kapasitesi yok.",
      copy: `${usedSeats} / ${subscription?.seat_limit ?? "—"} kapasite kullanımda. Yeni çalışan eklemek için kapasite açılması gerekiyor.`,
      action: canPurchaseCorporateCommerce ? "Kapasiteyi artır" : "Ekibi görüntüle",
      tab: "employees",
      tone: "critical",
      icon: "lock",
      capacityUpgrade: canPurchaseCorporateCommerce,
    });
  }
  if (invitedMembers > 0) {
    priorityQueue.push({
      id: "invites",
      eyebrow: "DAVET BEKLİYOR",
      title: `${invitedMembers} çalışan henüz daveti tamamlamadı.`,
      copy: "Bekleyen davetleri kontrol ederek ekip kurulumunu tamamlayın.",
      action: "Davetleri kontrol et",
      tab: "employees",
      tone: "attention",
      icon: "users",
    });
  }
  if (incompleteDigitalCards > 0) {
    priorityQueue.push({
      id: "profiles",
      eyebrow: "PROFİL EKSİK",
      title: `${incompleteDigitalCards} çalışanın dijital kartı hazır değil.`,
      copy: "Eksik profilleri tamamlayarak tüm ekibin kartlarını yayına hazır hale getirin.",
      action: "Eksik kartları tamamla",
      tab: "employees",
      tone: "attention",
      icon: "contact",
    });
  }
  if (daysUntilExpiry != null && daysUntilExpiry <= 30) {
    priorityQueue.push({
      id: "renewal",
      eyebrow: "YENİLEME YAKLAŞIYOR",
      title: `Aboneliğin yenilenmesine ${daysUntilExpiry} gün kaldı.`,
      copy: "Kart erişiminde kesinti oluşmaması için yenileme durumunu kontrol edin.",
      action: "Ekibi ve kartları kontrol et",
      tab: "employees",
      tone: "attention",
      icon: "lock",
    });
  }
  if (priorityQueue.length === 0) {
    priorityQueue.push({
      id: "healthy",
      eyebrow: "HER ŞEY YOLUNDA",
      title: "Şu anda müdahale gerektiren bir kart işlemi yok.",
      copy: "Ekip kurulumu, dijital kartlar ve fiziksel kart atamaları güncel.",
      action: "Ekibi görüntüle",
      tab: "employees",
      tone: "healthy",
      icon: "check",
    });
  }
  const [priority, ...nextPriorities] = priorityQueue;

  return (
    <div className="cp-overview-v2" data-overview-version="3">
      <header className="cp-overview-v2__workspace">
        <div>
          <span className="cp-overview-v2__eyebrow">YENOMI BUSINESS</span>
          <h2>Genel Bakış</h2>
          <p>Bugün müdahale gerektiren işleri ve kart kullanımını tek ekranda takip edin.</p>
        </div>
        <div className="cp-overview-v2__quick-actions" aria-label="Hızlı işlemler">
          {canInvite && <button type="button" className="cp-overview-v2__primary" onClick={onInvite}><Icon name="plus" /> Çalışan davet et</button>}
          {canOpen("cards") && <button type="button" className="cp-overview-v2__secondary" onClick={() => openTab("cards")}><Icon name="contact" /> Kart ata</button>}
          {canManageLicenses && <button type="button" className="cp-overview-v2__secondary" onClick={onEditCorporateBranding}><Icon name="pencil" /> Kart standardı</button>}
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
        {nextPriorities.length > 0 && (
          <div className="cp-overview-v2__priority-queue" aria-label="Sıradaki operasyonlar">
            <span>Sıradaki</span>
            {nextPriorities.slice(0, 2).map((item) => (
              item.capacityUpgrade ? (
                <a key={item.id} href="/kurumsal#kapasite">{item.title}</a>
              ) : canOpen(item.tab) ? (
                <button key={item.id} type="button" onClick={() => openTab(item.tab)}>{item.title}</button>
              ) : null
            ))}
          </div>
        )}
      </section>

      <section className="cp-overview-v2__metrics" aria-label="Kurumsal hesap özeti">
        <article data-state={availableSeats === 0 ? "attention" : "neutral"}>
          <button type="button" onClick={() => canPurchaseCorporateCommerce ? window.location.assign("/kurumsal#kapasite") : openTab("employees")}>
            <span className="cp-overview-v2__metric-label"><Icon name="id" /><span>Kart kapasitesi</span></span>
            <strong>{usedSeats}<small> / {subscription?.seat_limit ?? "—"}</small></strong>
            <span className="cp-overview-v2__capacity-progress" aria-label={`Kapasitenin yüzde ${capacityPercent}'i kullanılıyor`}><i style={{ width: `${capacityPercent}%` }} /></span>
            <p>{availableSeats === 0 ? "Kapasite dolu" : `${availableSeats ?? "—"} boş kart`}</p>
            <em>{canPurchaseCorporateCommerce ? "Kapasiteyi artır" : "Ekibi görüntüle"} <span aria-hidden="true">→</span></em>
          </button>
        </article>
        <article data-state={invitedMembers > 0 ? "attention" : "neutral"}>
          <button type="button" onClick={() => openTab("employees")}>
            <span className="cp-overview-v2__metric-label"><Icon name="users" /><span>Bekleyen davet</span></span>
            <strong>{invitedMembers}</strong>
            <p>{invitedMembers > 0 ? "Takip gerekiyor" : "Bekleyen yok"}</p>
            <em>{invitedMembers > 0 ? "Davetleri yönet" : "Ekibi görüntüle"} <span aria-hidden="true">→</span></em>
          </button>
        </article>
        <article data-state={profileCompletionPercent < 100 ? "attention" : "positive"}>
          <button type="button" onClick={() => openTab("employees")}>
            <span className="cp-overview-v2__metric-label"><Icon name="shield" /><span>Profil kurulumu</span></span>
            <span className="cp-overview-v2__completion-ring" style={{ "--completion": `${profileCompletionPercent}%` } as CSSProperties}><b>%{profileCompletionPercent}</b></span>
            <p>{profileCompletionPercent === 100 ? "Tüm profiller hazır" : `${incompleteDigitalCards} çalışanın kartı eksik`}</p>
            <em>Profilleri görüntüle <span aria-hidden="true">→</span></em>
          </button>
        </article>
        <article data-state={unassignedPhysicalCards > 0 ? "attention" : "positive"}>
          <button type="button" onClick={() => openTab("cards")}>
            <span className="cp-overview-v2__metric-label"><Icon name="nfc" /><span>Fiziksel kart ataması</span></span>
            <strong>{unassignedPhysicalCards}</strong>
            <p>{unassignedPhysicalCards > 0 ? "Atama bekliyor" : "Eksik atama yok"}</p>
            <em>{unassignedPhysicalCards > 0 ? "Atamaya git" : "Kartları görüntüle"} <span aria-hidden="true">→</span></em>
          </button>
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

          <section className="cp-overview-v2__content-highlights" aria-label="En çok ilgi gören içerikler">
            <div><Icon name="link" /><span>En çok ilgi gören içerikler</span></div>
            {contentHighlights.length > 0 ? (
              <ul>
                {contentHighlights.map((item) => <li key={item.linkId}><span>{item.label}</span><b>{item.count.toLocaleString("tr-TR")}</b></li>)}
              </ul>
            ) : <p>Bu dönemde içerik etkileşimi oluşmadı.</p>}
          </section>

          <div className={`cp-overview-v2__chart${hasOverviewData ? " has-data" : " is-empty"}`}>
            {hasOverviewData ? (
              <>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={chartAccessibilityLabel}>
                  <line className="cp-overview-v2__chart-guide" x1="0" y1="28" x2="100" y2="28" />
                  <line className="cp-overview-v2__chart-guide" x1="0" y1="54" x2="100" y2="54" />
                  <line className="cp-overview-v2__chart-guide" x1="0" y1="80" x2="100" y2="80" />
                  {analyticsChart.points.filter((point) => point.count > 0).map((point) => (
                    <rect
                      key={point.date}
                      className={`cp-overview-v2__chart-bar${point.date === analyticsChart.peak.date ? " is-peak" : ""}`}
                      x={point.x}
                      y={point.y}
                      width={point.width}
                      height={point.height}
                      rx={Math.min(point.width / 2, 0.8)}
                    >
                      <title>{`${formatAnalyticsDate(point.date)}: ${point.count.toLocaleString("tr-TR")} görüntülenme`}</title>
                    </rect>
                  ))}
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
              const activity = activityMeta(member);
              const role = normalizeOrganizationRole(member.role);
              return (
                <button type="button" key={member.id} data-tone={activity.tone} onClick={() => { openTab("employees"); openMemberDrawer(member); }}>
                  <span className="cp-overview-v2__avatar" data-role={role || "EMPLOYEE"} aria-hidden="true">
                    {(member.full_name || member.email || "Y").trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="cp-overview-v2__activity-copy">
                    <strong>{member.full_name || member.email}</strong>
                    <small><Icon name={activity.icon} />{activity.label}{role && <b data-role={role}>{ROLE_LABELS[role]}</b>}</small>
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
