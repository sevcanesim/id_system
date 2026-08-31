import type { ReactNode } from "react";
import { Button, PageHeader, Skeleton } from "./DesignSystem";

export { EmptyState } from "./DesignSystem";
export { EmptyState as FoundationEmptyState } from "./DesignSystem";
export type { EmptyStateAction } from "./DesignSystem";

type LoadingStateProps = {
  label?: string;
  hint?: string;
  className?: string;
  variant?: "compact" | "inline" | "panel";
};

function ActivityMark() {
  return (
    <span className="ds-loading-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function PanelSkeleton() {
  return (
    <div className="ds-view-loading__canvas" aria-hidden="true">
      <div className="ds-view-loading__heading">
        <Skeleton width="34%" height={15} />
        <Skeleton width="58%" height={11} />
      </div>
      <div className="ds-view-loading__metrics">
        {Array.from({ length: 4 }, (_, metricIndex) => (
          <div className="ds-view-loading__metric" key={metricIndex}>
            <Skeleton width="52%" height={10} />
            <Skeleton width="38%" height={24} />
          </div>
        ))}
      </div>
      <div className="ds-view-loading__workspace">
        <div className="ds-view-loading__primary">
          <Skeleton width="28%" height={12} />
          <Skeleton height={13} />
          <Skeleton width="88%" height={13} />
          <Skeleton width="72%" height={13} />
        </div>
        <div className="ds-view-loading__secondary">
          <Skeleton width="46%" height={12} />
          <Skeleton height={34} />
          <Skeleton height={34} />
          <Skeleton height={34} />
        </div>
      </div>
    </div>
  );
}

export function LoadingState({
  label = "İçerik hazırlanıyor",
  hint = "Güncel bilgiler yükleniyor.",
  className = "",
  variant = "inline",
}: LoadingStateProps) {
  const classes = [
    "ds-view-loading",
    `ds-view-loading--${variant}`,
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <div className="ds-view-loading__intro">
        <ActivityMark />
        <div className="ds-view-loading__copy">
          <strong>{label}</strong>
          {hint ? <span>{hint}</span> : null}
        </div>
      </div>
      {variant === "panel" ? (
        <PanelSkeleton />
      ) : variant === "inline" ? (
        <div className="ds-view-loading__lines" aria-hidden="true">
          <Skeleton height={11} />
          <Skeleton width="82%" height={11} />
          <Skeleton width="61%" height={11} />
        </div>
      ) : null}
    </div>
  );
}

export function PageLoadingView({
  label = "Sayfa hazırlanıyor",
  hint = "İçerik birazdan hazır olacak.",
}: {
  label?: string;
  hint?: string;
}) {
  return (
    <main className="ds-page-loading" aria-busy="true">
      <section className="ds-page-loading__surface" role="status" aria-live="polite">
        <ActivityMark />
        <div className="ds-page-loading__copy">
          <span className="ds-page-loading__eyebrow">YENOMI ID</span>
          <strong>{label}</strong>
          <p>{hint}</p>
        </div>
        <div className="ds-page-loading__progress" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}

export function PageHeading({ kicker, title, description, actions }: { kicker?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <PageHeader eyebrow={kicker} title={title} description={description} actions={actions} />;
}

export function ErrorState({ title = "Bir şeyler ters gitti", description = "İçerik yüklenemedi. Lütfen tekrar deneyin.", onRetry, className = "" }: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`ds-error-state ${className}`.trim()} role="alert">
      <span className="ds-error-state__icon" aria-hidden="true">!</span>
      <div><h2>{title}</h2><p>{description}</p></div>
      {onRetry && <Button variant="primary" size="sm" onClick={onRetry}>Yeniden Dene</Button>}
    </div>
  );
}
