"use client";

import { useEffect, useMemo, useState } from "react";
import UserPanelShell from "../components/UserPanelShell";
import AnalyticsTrendChart from "../components/ui/AnalyticsTrendChart";
import NetworkingPanel from "../kurumsal/panel/components/NetworkingPanel";
import { getBrowserSession } from "../../lib/auth/get-browser-session";
import styles from "./IndividualConnections.module.css";

type Analytics = {
  totalViews: number;
  last30DaysViews: number;
  byDay: Array<{ date: string; count: number }>;
};

export default function IndividualLeadsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { accessToken } = await getBrowserSession();
      if (!accessToken) return;
      const response = await fetch("/api/analytics/me", {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (response.ok && !cancelled) setAnalytics(await response.json() as Analytics);
    })();
    return () => { cancelled = true; };
  }, []);

  const dailyAverage = useMemo(() => {
    if (!analytics?.last30DaysViews) return 0;
    return Math.round(analytics.last30DaysViews / Math.max(1, new Set(analytics.byDay.map((point) => point.date)).size));
  }, [analytics]);
  const hasTrendData = Boolean(analytics?.byDay.some((point) => point.count > 0));

  async function token() {
    const { accessToken } = await getBrowserSession();
    return accessToken;
  }

  return (
    <UserPanelShell
      activeKey="connections"
      eyebrow="BAĞLANTILAR"
      title="Bağlantılarım"
      description="Kartını tarayan kişileri, gerçek profil görünürlüğünü ve Network Mail takibini aynı çalışma alanında yönet."
    >
      <section className={styles.insights} aria-labelledby="connection-insights-title">
        <div className={styles.insightsHeader}>
          <div><span>GÖRÜNÜRLÜK ÖZETİ</span><h2 id="connection-insights-title">Kartının etkisi tek bakışta.</h2></div>
          <a href="/istatistikler">Tüm istatistikler →</a>
        </div>
        <div className={styles.metrics}>
          <div><small>Toplam görüntülenme</small><strong>{analytics?.totalViews.toLocaleString("tr-TR") ?? "—"}</strong><span>canlı profil erişimi</span></div>
          <div><small>Son 30 gün</small><strong>{analytics?.last30DaysViews.toLocaleString("tr-TR") ?? "—"}</strong><span>profil görüntülenmesi</span></div>
          <div><small>Günlük ortalama</small><strong>{analytics ? dailyAverage.toLocaleString("tr-TR") : "—"}</strong><span>gözlenen günlerde</span></div>
        </div>
        <div className={`${styles.trend} ${hasTrendData ? "" : styles.trendEmpty}`}>
          <div><strong>Profil görüntülenme eğilimi</strong><span>Son 30 gün</span></div>
          {hasTrendData ? <AnalyticsTrendChart
            points={analytics?.byDay.slice(-30) ?? []}
            ariaLabel="Son 30 gün profil görüntülenme eğrisi"
            summary={`${analytics?.last30DaysViews.toLocaleString("tr-TR")} görüntülenme`}
          /> : <div className={styles.emptyTrend}><strong>Henüz veri oluşmadı</strong><span>Kartını paylaşmaya başladığında görüntülenme eğilimin burada görünür.</span><a href="/kartim">Canlı kartı aç →</a></div>}
        </div>
      </section>
      <NetworkingPanel view="leads" variant="individual" token={token} />
    </UserPanelShell>
  );
}
