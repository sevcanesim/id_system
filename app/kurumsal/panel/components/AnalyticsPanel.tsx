"use client";

import { EmptyState } from "../../../components/ui/States";
import type { CardAnalytics } from "../domain/types";

type Props = {
  analytics: CardAnalytics | null;
  analyticsDays: 7 | 30 | 90;
  onPeriodChange: (days: 7 | 30 | 90) => void;
  onViewOwnCard: () => void;
  onShareSettings: () => void;
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

export default function AnalyticsPanel({
  analytics,
  analyticsDays,
  onPeriodChange,
  onViewOwnCard,
  onShareSettings,
}: Props) {
  const unavailable = analytics?.available === false;
  const series = analytics?.byDay?.length ? analytics.byDay : [{ date: new Date().toISOString().slice(0, 10), count: 0 }];
  const trend = chartPoints(series);
  const hasTrend = series.some((item) => item.count > 0);
  const cards = analytics?.byCard ?? [];
  const topCard = cards[0] ?? null;
  const restCards = cards.slice(1, 10);
  const countries = analytics?.byCountry?.slice(0, 5) ?? [];
  const departments = analytics?.byDepartment?.slice(0, 5) ?? [];
  const totalViews = analytics?.totalViews ?? 0;
  const last30 = analytics?.last30DaysViews ?? 0;
  const clicks = analytics?.content?.clicks ?? 0;
  const downloads = analytics?.content?.downloads ?? 0;
  const interactions = analytics?.content?.totalInteractions ?? 0;
  const hasData = totalViews > 0 || last30 > 0 || cards.length > 0 || interactions > 0;

  return (
    <section className="p11-employees p11-analytics" aria-labelledby="p11-analytics-title">
      <header className="p11-employees-header">
        <div>
          <span>ANALİTİK</span>
          <h2 id="p11-analytics-title">Kurumsal kart performansı</h2>
          <p>Gerçek görüntülenme, trend ve kart karşılaştırmasını seçili dönem için inceleyin.</p>
        </div>
        <select
          aria-label="Etkileşim tarih aralığı"
          value={analyticsDays}
          onChange={(event) => onPeriodChange(Number(event.target.value) as 7 | 30 | 90)}
        >
          <option value={7}>Son 7 gün</option>
          <option value={30}>Son 30 gün</option>
          <option value={90}>Son 90 gün</option>
        </select>
      </header>

      {unavailable ? (
        <EmptyState
          compact
          icon="analytics"
          title="Analitik geçici olarak kullanılamıyor"
          description="Görüntülenme verisi şu anda alınamıyor. Daha sonra yeniden deneyin."
        />
      ) : !hasData ? (
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
            <article><small>Toplam görüntülenme</small><strong>{totalViews.toLocaleString("tr-TR")}</strong><span>Son {analyticsDays} gün</span></article>
            <article><small>Son 30 gün</small><strong>{last30.toLocaleString("tr-TR")}</strong><span>Dönem karşılaştırması</span></article>
            <article><small>İçerik etkileşimi</small><strong>{interactions.toLocaleString("tr-TR")}</strong><span>URL ve PDF</span></article>
            <article><small>Öne çıkan kart</small><strong>{topCard ? topCard.count.toLocaleString("tr-TR") : "—"}</strong><span>{topCard?.name || "Henüz sıralama yok"}</span></article>
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
              <div className="v26-chart-canvas">
                {hasTrend ? (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Kart görüntülenme eğrisi">
                    <defs>
                      <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#9848f2" stopOpacity=".52" />
                        <stop offset="1" stopColor="#9848f2" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`0,100 ${trend} 100,100`} fill="url(#analyticsArea)" />
                    <polyline points={trend} fill="none" stroke="#a855f7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                ) : (
                  <p>Bu dönemde henüz kart görüntülenmesi yok.</p>
                )}
              </div>
              <footer>
                <span>{analytics?.periodStart || series[0]?.date}</span>
                <strong>{totalViews.toLocaleString("tr-TR")} toplam görüntülenme</strong>
                <span>{analytics?.periodEnd || series[series.length - 1]?.date}</span>
              </footer>
            </section>

            <aside className="p11-top-card" aria-label="En çok görüntülenen kart">
              <small>En çok görüntülenen kart</small>
              {topCard ? (
                <>
                  <strong>{topCard.name}</strong>
                  <b>{topCard.count.toLocaleString("tr-TR")}</b>
                  <span>görüntülenme</span>
                  <p>
                    {totalViews > 0
                      ? `Tüm görüntülenmenin %${Math.round((topCard.count / totalViews) * 100)}’i bu karta ait.`
                      : "Bu dönemdeki en yüksek kart performansı."}
                  </p>
                </>
              ) : (
                <p>Kart bazlı sıralama henüz oluşmadı.</p>
              )}
            </aside>
          </div>

          <section className="p11-analytics-compare" aria-label="Karşılaştırma">
            <article>
              <small>Seçili dönem</small>
              <strong>{totalViews.toLocaleString("tr-TR")}</strong>
              <span>Toplam görüntülenme</span>
            </article>
            <article>
              <small>Son 30 gün</small>
              <strong>{last30.toLocaleString("tr-TR")}</strong>
              <span>Dönem karşılaştırması</span>
            </article>
            <article>
              <small>URL tıklaması</small>
              <strong>{clicks.toLocaleString("tr-TR")}</strong>
              <span>İçerik etkileşimi</span>
            </article>
            <article>
              <small>PDF indirme</small>
              <strong>{downloads.toLocaleString("tr-TR")}</strong>
              <span>Dosya etkileşimi</span>
            </article>
          </section>

          {(restCards.length > 0 || countries.length > 0 || departments.length > 0) && (
            <div className="p11-analytics-rankings">
              {restCards.length > 0 && (
                <div className="p10-ranking">
                  <h3>Diğer kartlar</h3>
                  {restCards.map((item, index) => (
                    <div key={item.profileId}>
                      <span>{index + 2}</span>
                      <strong>{item.name}</strong>
                      <small>{item.count.toLocaleString("tr-TR")} görüntülenme</small>
                    </div>
                  ))}
                </div>
              )}
              {countries.length > 0 && (
                <div className="p10-ranking">
                  <h3>Konum dağılımı</h3>
                  {countries.map((item, index) => (
                    <div key={`${item.country}-${index}`}>
                      <span>{index + 1}</span>
                      <strong>{item.country || "Bilinmiyor"}</strong>
                      <small>{item.count.toLocaleString("tr-TR")} görüntülenme</small>
                    </div>
                  ))}
                </div>
              )}
              {departments.length > 0 && (
                <div className="p10-ranking">
                  <h3>Departman performansı</h3>
                  {departments.map((item, index) => (
                    <div key={item.department}>
                      <span>{index + 1}</span>
                      <strong>{item.department}</strong>
                      <small>{item.count.toLocaleString("tr-TR")} görüntülenme</small>
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
