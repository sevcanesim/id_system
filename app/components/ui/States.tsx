import type { ReactNode } from "react";
import { PageHeader, Skeleton, Stack, Button } from "./DesignSystem";

/** Canonical EmptyState API shared by public, dashboard and admin surfaces. */
export { EmptyState } from "./DesignSystem";
export { EmptyState as FoundationEmptyState } from "./DesignSystem";
export type { EmptyStateAction } from "./DesignSystem";

export function LoadingState({
  label = "Yükleniyor",
  className = "",
  variant = "inline",
}: {
  label?: string;
  className?: string;
  variant?: "inline" | "panel";
}) {
  return (
    <div className={`ds-view-loading${variant === "panel" ? " ds-view-loading--panel" : ""}${className ? ` ${className}` : ""}`.trim()} role="status" aria-live="polite" aria-busy="true">
      <Stack gap={3}>
        <strong>{label}</strong>
        {variant === "panel" ? (
          <>
            <div className="ds-view-loading__hero" aria-hidden="true"><Skeleton height={148} /></div>
            <div className="ds-view-loading__kpis" aria-hidden="true">
              <Skeleton height={84} />
              <Skeleton height={84} />
              <Skeleton height={84} />
              <Skeleton height={84} />
            </div>
          </>
        ) : (
          <>
            <Skeleton height={14} />
            <Skeleton width="86%" height={14} />
            <Skeleton width="64%" height={14} />
          </>
        )}
      </Stack>
    </div>
  );
}

/**
 * Shell-preserving loading view for public/auth transitions. It deliberately
 * never replaces the entire application with a blank spinner screen.
 */
export function PageLoadingView({ label = "Sayfa hazırlanıyor" }: { label?: string }) {
  return (
    <main className="ds-page-loading" aria-busy="true">
      <div className="ds-page-loading__surface" role="status" aria-live="polite">
        <span className="ds-page-loading__mark" aria-hidden="true" />
        <strong>{label}</strong>
        <span className="ds-page-loading__hint">İçerik hazırlanıyor…</span>
      </div>
    </main>
  );
}

/** Existing PageHeading API now delegates to the canonical PageHeader. */
export function PageHeading({ kicker, title, description, actions }: { kicker?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <PageHeader eyebrow={kicker} title={title} description={description} actions={actions} />;
}


export function ErrorState({ title = "Bir şeyler ters gitti", description = "İçerik yüklenemedi. Lütfen tekrar deneyin.", onRetry, className = "" }: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return <div className={`ds-error-state ${className}`.trim()} role="alert">
    <span className="ds-error-state__icon" aria-hidden="true">!</span>
    <div><h2>{title}</h2><p>{description}</p></div>
    {onRetry && <Button variant="primary" size="sm" onClick={onRetry}>Yeniden Dene</Button>}
  </div>;
}
