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

function formatTrendDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date);
}

function buildBars(points: AnalyticsTrendPoint[]) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const slot = 100 / points.length;
  const width = points.length === 1 ? 28 : Math.max(1.2, Math.min(7, slot * 0.68));
  return points.map((point, index) => {
    const height = point.count === 0 ? 0 : Math.max(1.8, (point.count / max) * 78);
    return {
      ...point,
      x: index * slot + (slot - width) / 2,
      y: 90 - height,
      width,
      height,
    };
  });
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
  const bars = buildBars(safePoints);
  const total = safePoints.reduce((sum, point) => sum + point.count, 0);
  const firstDate = startLabel || safePoints[0]?.date || "—";
  const lastDate = endLabel || safePoints[safePoints.length - 1]?.date || "—";
  const activeDays = safePoints.filter((point) => point.count > 0).length;
  const peak = safePoints.reduce((highest, point) => point.count > highest.count ? point : highest, safePoints[0]);

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
            <line className={styles.guide} x1="0" y1="12" x2="100" y2="12" />
            <line className={styles.guide} x1="0" y1="51" x2="100" y2="51" />
            <line className={styles.guide} x1="0" y1="90" x2="100" y2="90" />
            {bars.map((bar) => (
              <rect
                key={bar.date || bar.x}
                className={bar.count === peak.count ? styles.peakBar : styles.bar}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx="1.4"
              >
                <title>{`${formatTrendDate(bar.date)}: ${bar.count.toLocaleString("tr-TR")} görüntülenme`}</title>
              </rect>
            ))}
          </svg>
        ) : (
          <p className={styles.empty}>{emptyMessage}</p>
        )}
      </div>
      {hasData ? (
        <div className={styles.caption} role="status">
          <span>{activeDays} aktif gün</span>
          <strong>Zirve: {peak.count.toLocaleString("tr-TR")} görüntülenme</strong>
          <span>{formatTrendDate(peak.date)}</span>
        </div>
      ) : null}
      <div className={styles.footer}>
        <span>{firstDate}</span>
        <strong>{summary || `${total.toLocaleString("tr-TR")} toplam görüntülenme`}</strong>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}
