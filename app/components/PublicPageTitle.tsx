import type { ReactNode } from "react";

type PublicPageTitleProps = {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PublicPageTitle({
  kicker,
  title,
  description,
  backHref,
  backLabel = "Ana sayfa",
  className = "",
}: PublicPageTitleProps) {
  return (
    <header className={`public-page-title ${className}`.trim()}>
      <div className="public-page-title__inner">
        {backHref ? (
          <a className="public-page-title__back" href={backHref}>
            ← {backLabel}
          </a>
        ) : null}
        <span className="public-page-title__kicker">{kicker}</span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    </header>
  );
}
