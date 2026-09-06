"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UserPanelShell from "../components/UserPanelShell";
import { Card, EmptyState } from "../components/ui";
import AnalyticsTrendChart from "../components/ui/AnalyticsTrendChart";
import PremiumFeatureGate from "../components/ui/PremiumFeatureGate";
import { useIndividualPremiumAccess } from "../components/ui/useIndividualPremiumAccess";
import { LoadingState } from "../components/ui/States";
import styles from "./AnalyticsPage.module.css";

type Analytics = {
  totalViews: number;
  last30DaysViews: number;
  byDay: Array<{ date: string; count: number }>;
  byCard: Array<{ id: string; name: string; count: number }>;
  available?: boolean;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const premiumAccess = useIndividualPremiumAccess();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (premiumAccess !== "premium") {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/analytics/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.ok && !cancelled) setData(await response.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [premiumAccess]);

  const recentDailySeries = useMemo(() => data?.byDay.slice(-30) ?? [], [data]);
  const average30 = useMemo(() => {
    if (!data || recentDailySeries.length === 0) return 0;
    const observedDays = Math.max(1, Math.min(30, new Set(recentDailySeries.map((point) => point.date)).size));
    return Math.round(data.last30DaysViews / observedDays);
  }, [data, recentDailySeries]);

  return (
    <UserPanelShell
      activeKey="connections"
      eyebrow="KART"
      title="İstatistikler"
      description="Dijital profilinizin gerçek görüntülenme verisini sade ve anlamlı metriklerle takip edin."
    >
      {premiumAccess === "checking" ? <LoadingState variant="panel" label="Premium erişimin kontrol ediliyor" hint="İstatistik özelliğin hazırlanıyor." /> : premiumAccess === "locked" ? <PremiumFeatureGate feature="Gelişmiş istatistikler" /> : loading ? (
        <Card><p className="p9-section-copy">İstatistikler yükleniyor…</p></Card>
      ) : !data ? (
        <EmptyState
          title="İstatistikler yüklenemedi."
          description="Oturumunuzu kontrol edip yeniden deneyin."
          action={{ href: "/giris?next=%2Fistatistikler", label: "Hesabına gir" }}
        />
      ) : data.totalViews === 0 && data.last30DaysViews === 0 ? (
        <section className={styles.empty} aria-labelledby="analytics-empty-title">
          <div className={styles.emptyCopy}>
            <span>İLK PAYLAŞIMINI BEKLİYOR</span>
            <h2 id="analytics-empty-title">Kartını paylaştığında etkiyi burada görürsün.</h2>
            <p>Görüntülenmeler, bağlantı tıklamaları ve kişi kaydetmeleri gerçek zamanlı olarak bu alanda toplanır. Henüz örnek veri göstermiyoruz.</p>
            <Link className="ds-button ds-button--primary" href="/kartim">Kartımı aç ve paylaş</Link>
          </div>
          <div className={styles.chartTeaser} aria-hidden="true">
            <div className={styles.chartHeader}><span>Görüntülenme eğilimi</span><i /></div>
            <div className={styles.chartBars}><i /><i /><i /><i /><i /><i /><i /></div>
            <div className={styles.chartLegend}><span /><span /><span /></div>
          </div>
        </section>
      ) : (
        <div className="p9-stack">
          <div className="p9-analytics-metrics">
            <Card variant="metric" className="p9-metric">
              <small>Son 30 gün</small>
              <strong>{data.last30DaysViews.toLocaleString("tr-TR")}</strong>
              <span>profil görüntülenmesi</span>
            </Card>
            <Card variant="metric" className="p9-metric">
              <small>90 günlük toplam</small>
              <strong>{data.totalViews.toLocaleString("tr-TR")}</strong>
              <span>profil görüntülenmesi</span>
            </Card>
            <Card variant="metric" className="p9-metric">
              <small>Günlük ortalama</small>
              <strong>{average30.toLocaleString("tr-TR")}</strong>
              <span>{recentDailySeries.length ? `${Math.min(30, recentDailySeries.length)} gözlenen gün` : "veri yok"}</span>
            </Card>
          </div>

          <Card className="p9-chart">
            <div className="p9-chart__head">
              <div>
                <h2 className="ds-card-title">Görüntülenme eğilimi</h2>
                <p>Son 30 günün günlük profil görüntülenmeleri.</p>
              </div>
              <span className="ds-badge">30 gün</span>
            </div>
            <AnalyticsTrendChart
              points={recentDailySeries}
              ariaLabel="Son 30 günlük profil görüntülenme eğrisi"
              summary={`${data.last30DaysViews.toLocaleString("tr-TR")} görüntülenme`}
              emptyMessage="Profiliniz görüntülendikçe trend verileri burada oluşacaktır."
            />
          </Card>

          <Card>
            <h2 className="ds-card-title">Kart bazında performans</h2>
            <p className="p9-section-copy">Birden fazla kartınız varsa hangi profilin daha çok görüntülendiğini karşılaştırın.</p>
            {data.byCard.length ? (
              <div className="p9-card-ranking">
                {data.byCard.map((card) => (
                  <div className="p9-card-ranking__row" key={card.id}>
                    <strong>{card.name}</strong>
                    <span>{card.count.toLocaleString("tr-TR")} görüntülenme</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Karşılaştırılacak kart verisi yok."
                description="Kart görüntülenmeleri oluştuğunda burada listelenecektir."
              />
            )}
          </Card>
        </div>
      )}
    </UserPanelShell>
  );
}
