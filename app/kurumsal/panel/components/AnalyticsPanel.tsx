"use client";

import { useEffect, useState } from "react";
import AnalyticsTrendChart from "../../../components/ui/AnalyticsTrendChart";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { StatusBadge } from "../../../components/ui/DesignSystem";
import { Icon } from "../../../icons";
import type { CardAnalytics } from "../domain/types";

type Props = {
  analytics: CardAnalytics | null;
  analyticsDays: 7 | 30 | 90;
  onPeriodChange: (days: 7 | 30 | 90) => void;
  onViewOwnCard: () => void;
  onShareSettings: () => void;
};

export default function AnalyticsPanel({
  analytics,
  analyticsDays,
  onPeriodChange,
  onViewOwnCard,
  onShareSettings,
}: Props) {
  const [refreshingPeriod, setRefreshingPeriod] = useState<7 | 30 | 90 | null>(null);
  const analyticsUnavailable = analytics?.available === false;
  const dailySeries = analytics?.byDay?.length
    ? analytics.byDay
    : [{ date: new Date().toISOString().slice(0, 10), count: 0 }];
  const cardRankings = analytics?.byCard ?? [];
  const leadingCard = cardRankings[0] ?? null;
  const remainingCards = cardRankings.slice(1, 10);
  const countryRankings = analytics?.byCountry?.slice(0, 5) ?? [];
  const departmentRankings = analytics?.byDepartment?.slice(0, 5) ?? [];
  const totalViews = analytics?.totalViews ?? 0;
  const last30DaysViews = analytics?.last30DaysViews ?? 0;
  const contentClicks = analytics?.content?.clicks ?? 0;
  const contentDownloads = analytics?.content?.downloads ?? 0;
  const totalInteractions = analytics?.content?.totalInteractions ?? 0;
  const trafficSources = analytics?.attribution?.bySource ?? [];
  const campaigns = analytics?.attribution?.byCampaign ?? [];
  const funnel = analytics?.funnel ?? { views: totalViews, contentInteractions: totalInteractions, leads: 0, meetings: 0 };
  const hasAnalyticsData = totalViews > 0
    || last30DaysViews > 0
    || cardRankings.length > 0
    || totalInteractions > 0;

  useEffect(() => {
    setRefreshingPeriod(null);
  }, [analytics]);

  function changePeriod(days: 7 | 30 | 90) {
    if (days === analyticsDays) return;
    setRefreshingPeriod(days);
    onPeriodChange(days);
  }

  return (
    <section
      className="p11-employees p11-analytics"
      aria-labelledby="p11-analytics-title"
      aria-busy={refreshingPeriod !== null}
    >
      <header className="p11-employees-header">
        <div>
          <span>ANALİTİK</span>
          <h2 id="p11-analytics-title">Kurumsal kart performansı</h2>
          <p>Gerçek görüntülenme, trend ve kart karşılaştırmasını seçili dönem için inceleyin.</p>
        </div>
        <select
          aria-label="Etkileşim tarih aralığı"
          value={analyticsDays}
          onChange={(event) => changePeriod(Number(event.target.value) as 7 | 30 | 90)}
        >
          <option value={7}>Son 7 gün</option>
          <option value={30}>Son 30 gün</option>
          <option value={90}>Son 90 gün</option>
        </select>
      </header>

      {refreshingPeriod !== null ? (
        <LoadingState
          className="p11-analytics-refresh"
          variant="compact"
          label="Analitik güncelleniyor"
          hint={`Son ${refreshingPeriod} günün verileri hazırlanıyor; mevcut görünüm ekranda kalır.`}
        />
      ) : null}

      {analyticsUnavailable ? (
        <EmptyState
          compact
          icon="analytics"
          title="Analitik geçici olarak kullanılamıyor"
          description="Görüntülenme verisi şu anda alınamıyor. Daha sonra yeniden deneyin."
        />
      ) : !hasAnalyticsData ? (
        <EmptyState
          compact
          icon="analytics"
          title="Henüz etkileşim verisi oluşmadı"
          description="Kartınızı paylaşmaya başladığınızda görüntülenme ve etkileşim verileri burada görünecek."
          action={
            <div className="ds-empty-actions">
              <button type="button" className="ds-button ds-button--primary" onClick={onViewOwnCard}>Kartımı Gör</button>
              <button type="button" className="ds-button ds-button--secondary" onClick={onShareSettings}>Paylaşım Ayarları</button>
            </div>
          }
        />
      ) : (
        <>
          <div className="p11-kpis">
            <article>
              <small><Icon name="eye" /> Toplam görüntülenme</small>
              <strong>{totalViews.toLocaleString("tr-TR")}</strong>
              <span>Son {analyticsDays} gün</span>
            </article>
            <article>
              <small><Icon name="clock" /> Son 30 gün</small>
              <strong>{last30DaysViews.toLocaleString("tr-TR")}</strong>
              <span>Dönem karşılaştırması</span>
            </article>
            <article>
              <small><Icon name="external" /> İçerik etkileşimi</small>
              <strong>{totalInteractions.toLocaleString("tr-TR")}</strong>
              <span>URL ve PDF</span>
            </article>
            <article>
              <small><Icon name="id" /> Öne çıkan kart</small>
              <strong>{leadingCard ? leadingCard.count.toLocaleString("tr-TR") : "—"}</strong>
              <span>{leadingCard?.name || "Henüz sıralama yok"}</span>
            </article>
          </div>

          <div className="v26-reference-main-row p11-analytics-main">
            <section className="v26-reference-chart">
              <header>
                <div>
                  <h3>Görüntülenme trendi</h3>
                  <p>Günlük kart erişimi</p>
                </div>
              </header>
              <div className="v26-chart-tabs">
                <b>Görüntülenme</b>
                <span>QR / NFC ölçümleri yalnızca kayıt oluştuğunda gösterilir</span>
              </div>
              <AnalyticsTrendChart
                points={dailySeries}
                ariaLabel="Kurumsal kart görüntülenme eğrisi"
                summary={`${totalViews.toLocaleString("tr-TR")} toplam görüntülenme`}
                startLabel={analytics?.periodStart}
                endLabel={analytics?.periodEnd}
              />
            </section>

            <aside className="p11-top-card" aria-label="En çok görüntülenen kart">
              <small>En çok görüntülenen kart</small>
              {leadingCard ? (
                <>
                  <strong>{leadingCard.name}</strong>
                  <b>{leadingCard.count.toLocaleString("tr-TR")}</b>
                  <span>görüntülenme</span>
                  <p>
                    {totalViews > 0
                      ? `Tüm görüntülenmenin %${Math.round((leadingCard.count / totalViews) * 100)}’i bu karta ait.`
                      : "Bu dönemdeki en yüksek kart performansı."}
                  </p>
                </>
              ) : (
                <p>Kart bazlı sıralama henüz oluşmadı.</p>
              )}
            </aside>
          </div>

          <section className="p11-analytics-compare" aria-label="Karşılaştırma">
            <article><small><Icon name="analytics" /> Seçili dönem</small><strong>{totalViews.toLocaleString("tr-TR")}</strong><span>Toplam görüntülenme</span></article>
            <article><small><Icon name="clock" /> Son 30 gün</small><strong>{last30DaysViews.toLocaleString("tr-TR")}</strong><span>Dönem karşılaştırması</span></article>
            <article><small><Icon name="external" /> URL tıklaması</small><strong>{contentClicks.toLocaleString("tr-TR")}</strong><span>İçerik etkileşimi</span></article>
            <article><small><Icon name="fileText" /> PDF indirme</small><strong>{contentDownloads.toLocaleString("tr-TR")}</strong><span>Dosya etkileşimi</span></article>
          </section>

          <section className="p11-roi-funnel" aria-labelledby="p11-roi-funnel-title">
            <header>
              <div><span>YENOMI ROI</span><h3 id="p11-roi-funnel-title">Erişimden görüşmeye</h3><p>Kart etkileşimlerinin satış ve networking çıktısına dönüşümünü seçili dönemde izleyin.</p></div>
              {!analytics?.attribution?.available ? <StatusBadge tone="neutral">Kaynak ayrımı yeni kayıtlarla başlar</StatusBadge> : null}
            </header>
            <div className="p11-roi-funnel__steps">
              <article><small>1. Erişim</small><strong>{funnel.views.toLocaleString("tr-TR")}</strong><span>Kart görüntülenmesi</span></article>
              <article><small>2. İlgi</small><strong>{funnel.contentInteractions.toLocaleString("tr-TR")}</strong><span>URL veya PDF etkileşimi</span></article>
              <article><small>3. Lead</small><strong>{funnel.leads.toLocaleString("tr-TR")}</strong><span>Oluşturulan bağlantı</span></article>
              <article><small>4. Görüşme</small><strong>{funnel.meetings.toLocaleString("tr-TR")}</strong><span>Planlanan görüşme</span></article>
            </div>
            {(trafficSources.length > 0 || campaigns.length > 0) ? <div className="p11-roi-funnel__breakdown">
              {trafficSources.length > 0 ? <div><h4>Kaynağa göre erişim</h4>{trafficSources.map((item) => <span key={item.source}><b>{item.source === "DIRECT" ? "Doğrudan" : item.source}</b><i>{item.count.toLocaleString("tr-TR")}</i></span>)}</div> : null}
              {campaigns.length > 0 ? <div><h4>En iyi kampanyalar</h4>{campaigns.map((item) => <span key={item.campaign}><b>{item.campaign}</b><i>{item.count.toLocaleString("tr-TR")}</i></span>)}</div> : null}
            </div> : null}
          </section>

          {(remainingCards.length > 0 || countryRankings.length > 0 || departmentRankings.length > 0) && (
            <div className="p11-analytics-rankings">
              {remainingCards.length > 0 && (
                <div className="p10-ranking">
                  <h3><Icon name="id" /> Diğer kartlar</h3>
                  {remainingCards.map((cardRanking, rankingIndex) => (
                    <div key={cardRanking.profileId}>
                      <StatusBadge tone="neutral">#{rankingIndex + 2}</StatusBadge>
                      <strong>{cardRanking.name}</strong>
                      <small>{cardRanking.count.toLocaleString("tr-TR")} görüntülenme</small>
                    </div>
                  ))}
                </div>
              )}
              {countryRankings.length > 0 && (
                <div className="p10-ranking">
                  <h3><Icon name="globe" /> Konum dağılımı</h3>
                  {countryRankings.map((countryRanking, rankingIndex) => (
                    <div key={`${countryRanking.country}-${rankingIndex}`}>
                      <StatusBadge tone="neutral">#{rankingIndex + 1}</StatusBadge>
                      <strong>{countryRanking.country || "Bilinmiyor"}</strong>
                      <small>{countryRanking.count.toLocaleString("tr-TR")} görüntülenme</small>
                    </div>
                  ))}
                </div>
              )}
              {departmentRankings.length > 0 && (
                <div className="p10-ranking">
                  <h3><Icon name="users" /> Departman performansı</h3>
                  {departmentRankings.map((departmentRanking, rankingIndex) => (
                    <div key={departmentRanking.department}>
                      <StatusBadge tone="neutral">#{rankingIndex + 1}</StatusBadge>
                      <strong>{departmentRanking.department}</strong>
                      <small>{departmentRanking.count.toLocaleString("tr-TR")} görüntülenme</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
