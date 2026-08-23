"use client";

import { cloneElement, isValidElement, useId, useState } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { Icon } from "../../icons";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "secondary-strong" | "accent" | "ghost" | "destructive" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cx("ds-button", `ds-button--${variant}`, size !== "md" && `ds-button--${size}`, className)} {...props} />;
}

export function ButtonLink({ href, children, variant = "secondary", size = "md", className, ariaDisabled }: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  ariaDisabled?: boolean;
}) {
  return <Link href={href} aria-disabled={ariaDisabled || undefined} className={cx("ds-button", `ds-button--${variant}`, size !== "md" && `ds-button--${size}`, className)}>{children}</Link>;
}

export function Card({ variant = "surface", className, ...props }: HTMLAttributes<HTMLDivElement> & { variant?: "surface" | "interactive" | "highlight" | "metric" }) {
  return <div className={cx("ds-card", variant !== "surface" && `ds-card--${variant}`, className)} {...props} />;
}

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "error" | "info" }) {
  return <span className={cx("ds-badge", tone !== "neutral" && `ds-badge--${tone}`, className)} {...props} />;
}


export function Avatar({ name, src, size = "md", className }: {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "YI";
  const [hasError, setHasError] = useState(false);
  const showSrc = Boolean(src) && !hasError;
  return <span className={cx("ds-avatar", `ds-avatar--${size}`, className)} aria-label={name}>
    {showSrc ? <img src={src} alt="" onError={() => setHasError(true)} /> : <span aria-hidden="true">{initials}</span>}
  </span>;
}

export function Breadcrumbs({ items, className }: {
  items: Array<{ label: ReactNode; href?: string }>;
  className?: string;
}) {
  return <nav className={cx("ds-breadcrumbs", className)} aria-label="Sayfa yolu">
    <ol>{items.map((item, index) => <li key={index}>
      {item.href && index !== items.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}
      {index < items.length - 1 && <span className="ds-breadcrumbs__separator" aria-hidden="true">/</span>}
    </li>)}</ol>
  </nav>;
}

export function Tooltip({ label, children, side = "top", className }: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return <span className={cx("ds-tooltip", `ds-tooltip--${side}`, className)}>
    {children}<span className="ds-tooltip__content" role="tooltip">{label}</span>
  </span>;
}

export function ProductCard({ title, description, visual, price, action, badge, className }: {
  title: ReactNode;
  description?: ReactNode;
  visual?: ReactNode;
  price?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return <article className={cx("ds-product-card", className)}>
    {visual && <div className="ds-product-card__visual">{visual}</div>}
    <div className="ds-product-card__body">
      {badge && <div className="ds-product-card__badge">{badge}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {price && <div className="ds-product-card__price">{price}</div>}
      {action && <div className="ds-product-card__action">{action}</div>}
    </div>
  </article>;
}

export function PricingCard({ name, description, price, period = "yıl", features = [], action, featured = false, className }: {
  name: ReactNode;
  description?: ReactNode;
  price: ReactNode;
  period?: ReactNode;
  features?: ReactNode[];
  action?: ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return <article className={cx("ds-pricing-card", featured && "ds-pricing-card--featured", className)}>
    <div className="ds-pricing-card__head"><h3>{name}</h3>{featured && <Badge tone="warning">Öne Çıkan</Badge>}</div>
    {description && <p className="ds-pricing-card__description">{description}</p>}
    <div className="ds-pricing-card__price"><strong>{price}</strong><span>/ {period}</span></div>
    {features.length > 0 && <ul>{features.map((feature, index) => <li key={index}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>}
    {action && <div className="ds-pricing-card__action">{action}</div>}
  </article>;
}

export function PageHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return <header className={cx("ds-page-header", className)}>
    <div>{eyebrow && <span className="ds-page-header__eyebrow">{eyebrow}</span>}<h1 className="ds-type-page-title">{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="ds-page-header__actions">{actions}</div>}
  </header>;
}

export function AdminPageHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return <header className={cx("ds-admin-page-header", className)}>
    <div className="ds-admin-page-header__copy">
      {eyebrow && <span className="ds-admin-page-header__eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="ds-admin-page-header__actions">{actions}</div>}
  </header>;
}

export function DarkSurface({ variant = "default", className, ...props }: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "elevated" | "subtle" }) {
  return <div className={cx("ds-dark-surface", variant !== "default" && `ds-dark-surface--${variant}`, className)} {...props} />;
}

export function StatusBadge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "error" | "info" }) {
  return <span className={cx("ds-status-badge", `ds-status-badge--${tone}`, className)} {...props} />;
}

export function FormGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-form-grid", className)} {...props} />;
}

type FieldControlProps = {
  id?: string;
  "aria-invalid"?: boolean | "grammar" | "spelling" | "false" | "true";
  "aria-describedby"?: string;
};

export function Field({ label, help, error, required, children, className }: {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const generatedInputId = `field-${generatedId.replace(/:/g, "")}`;
  const existingId = isValidElement<FieldControlProps>(children) ? children.props.id : undefined;
  const inputId = existingId ?? generatedInputId;
  const helpId = help ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const existingDescribedBy = isValidElement<FieldControlProps>(children) ? children.props["aria-describedby"] : undefined;
  const describedBy = [existingDescribedBy, helpId, errorId].filter(Boolean).join(" ") || undefined;
  const existingInvalid = isValidElement<FieldControlProps>(children) ? children.props["aria-invalid"] : undefined;
  const control = isValidElement<FieldControlProps>(children)
    ? cloneElement(children, {
        id: inputId,
        "aria-invalid": error ? true : existingInvalid,
        "aria-describedby": describedBy,
      })
    : children;

  return <div className={cx("ds-field", className)} data-invalid={error ? "true" : undefined}>
    <label className="ds-label" htmlFor={inputId}>{label}{required ? " *" : ""}</label>
    {control}
    {error ? <span id={errorId} className="ds-error" role="alert">{error}</span> : help ? <span id={helpId} className="ds-help">{help}</span> : null}
  </div>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("ds-input", className)} {...props} />;
}
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx("ds-select", className)} {...props} />;
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("ds-textarea", className)} {...props} />;
}
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("ds-label", className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return <label className={cx("ds-checkbox", className)}><input type="checkbox" {...props} /><span>{label}</span></label>;
}

export function Switch({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return <label className={cx("ds-switch", className)}><input type="checkbox" role="switch" {...props} /><span className="ds-switch__track" aria-hidden="true"><span className="ds-switch__thumb" /></span><span>{label}</span></label>;
}

export function Container({ dashboard = false, className, ...props }: HTMLAttributes<HTMLDivElement> & { dashboard?: boolean }) {
  return <div className={cx("ds-container", dashboard && "ds-container--dashboard", className)} {...props} />;
}
export function Stack({ gap = 4, className, ...props }: HTMLAttributes<HTMLDivElement> & { gap?: 2 | 3 | 4 | 6 | 8 }) {
  return <div className={cx("ds-stack", className)} data-gap={gap === 4 ? undefined : String(gap)} {...props} />;
}
export function Grid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-grid", className)} {...props} />;
}

export type AlertTone = "neutral" | "success" | "warning" | "error" | "info";

export function Alert({ tone = "neutral", title, children, className }: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cx("ds-alert", `ds-alert--${tone}`, className)} role={tone === "error" ? "alert" : "status"}>
    {title && <strong>{title}</strong>}
    {children && <div>{children}</div>}
  </div>;
}

export function Pagination({ page, pageCount, onChange, label = "Sayfalama" }: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return <nav className="ds-pagination" aria-label={label}>
    <Button variant="secondary" size="sm" disabled={page <= 1} aria-label="Önceki sayfa" onClick={() => onChange(page - 1)}>Önceki</Button>
    <div className="ds-pagination__pages">
      {pages.map((item) => <button key={item} type="button" className="ds-pagination__page" aria-current={item === page ? "page" : undefined} onClick={() => onChange(item)}>{item}</button>)}
    </div>
    <Button variant="secondary" size="sm" disabled={page >= pageCount} aria-label="Sonraki sayfa" onClick={() => onChange(page + 1)}>Sonraki</Button>
  </nav>;
}

export type EmptyStateAction =
  | ReactNode
  | { label: string; href: string }
  | { label: string; onClick: () => void };

type EmptyStateActionConfig = Exclude<EmptyStateAction, ReactNode>;

function isEmptyStateActionConfig(action: EmptyStateAction | undefined): action is EmptyStateActionConfig {
  return typeof action === "object" && action !== null && "label" in action;
}

export function EmptyState({ title, description, action, icon, illustration, compact = false, className }: {
  title: ReactNode;
  description?: ReactNode;
  action?: EmptyStateAction;
  icon?: Parameters<typeof Icon>[0]["name"];
  illustration?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const renderedAction = isEmptyStateActionConfig(action)
    ? "href" in action
      ? <Link className="ds-button ds-button--primary" href={action.href}>{action.label}</Link>
      : <Button variant="primary" onClick={action.onClick}>{action.label}</Button>
    : action;

  return <div className={cx("ds-empty", compact && "ds-empty--compact", className)} role="status">
    {(illustration || icon) && (
      <div className="ds-empty__illustration" aria-hidden="true">
        {illustration ?? <Icon name={icon} variant="solid" />}
      </div>
    )}
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {renderedAction}
  </div>;
}

export function Skeleton({ width = "100%", height = 16, className }: { width?: string | number; height?: string | number; className?: string }) {
  return <span className={cx("ds-skeleton", className)} style={{ width, height }} aria-hidden="true" />;
}

export function DataTable({ headers, rows, emptyMessage = "Gösterilecek kayıt yok.", mobileCards = false }: {
  headers: ReactNode[];
  rows: ReactNode[][];
  emptyMessage?: string;
  mobileCards?: boolean;
}) {
  if (rows.length === 0) return <EmptyState title={emptyMessage} />;
  return <div className="ds-table-wrap" data-mobile={mobileCards ? "cards" : undefined}><table className="ds-table"><thead><tr>{headers.map((header, i) => <th key={i} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
