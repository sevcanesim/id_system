import styles from "./AnalyticsTrendChart.module.css";

export type AnalyticsTrendPoint = {
  date: string;
  count: number;
};

type AnalyticsTrendChartProps = {
  points: AnalyticsTrendPoint[];
  ariaLabel: string;
  summary?: string;
  emptyMessage?: string;
  startLabel?: string;
  endLabel?: string;
};

function buildPoints(points: AnalyticsTrendPoint[]) {
  const max = Math.max(1, ...points.map((point) => point.count));
  return points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 92 - (point.count / max) * 76;
    return `${x},${y}`;
  }).join(" ");
}

export default function AnalyticsTrendChart({
  points,
  ariaLabel,
  summary,
  emptyMessage = "Bu dönemde henüz görüntülenme yok.",
  startLabel,
  endLabel,
}: AnalyticsTrendChartProps) {
  const safePoints = points.length ? points : [{ date: "", count: 0 }];
  const hasData = safePoints.some((point) => point.count > 0);
  const trendPoints = buildPoints(safePoints);
  const total = safePoints.reduce((sum, point) => sum + point.count, 0);
  const firstDate = startLabel || safePoints[0]?.date || "—";
  const lastDate = endLabel || safePoints[safePoints.length - 1]?.date || "—";

  return (
    <div className={styles.chart}>
      <div className={styles.canvas}>
        {hasData ? (
          <svg
            className={styles.svg}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaLabel}
          >
            <defs>
              <linearGradient id="yenomiAnalyticsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity=".2" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,100 ${trendPoints} 100,100`} fill="url(#yenomiAnalyticsArea)" />
            <polyline
              points={trendPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <p className={styles.empty}>{emptyMessage}</p>
        )}
      </div>
      <div className={styles.footer}>
        <span>{firstDate}</span>
        <strong>{summary || `${total.toLocaleString("tr-TR")} toplam görüntülenme`}</strong>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}
