"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./DesignSystem";

type DialogProps = { open: boolean; title: ReactNode; children: ReactNode; onClose: () => void; footer?: ReactNode };

function useDialogFocus(open: boolean, onClose: () => void, dialogRef: React.RefObject<HTMLElement | null>) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []).filter((element) => !element.hasAttribute("hidden"));

    getFocusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = getFocusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [dialogRef, onClose, open]);
}

export function Modal({ open, title, children, onClose, footer }: DialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(open, onClose, dialogRef);
  if (!open) return null;
  return <>
    <button type="button" className="ds-overlay" aria-label="Pencereyi kapat" onClick={onClose} />
    <section ref={dialogRef} className="ds-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="ds-dialog-header"><h2 id={titleId}>{title}</h2><Button variant="icon" aria-label="Kapat" onClick={onClose}>×</Button></div>
      {children}{footer}
    </section>
  </>;
}

export function Drawer({ open, title, children, onClose }: Omit<DialogProps, "footer">) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(open, onClose, dialogRef);
  if (!open) return null;
  return <>
    <button type="button" className="ds-overlay" aria-label="Paneli kapat" onClick={onClose} />
    <aside ref={dialogRef} className="ds-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="ds-dialog-header"><h2 id={titleId}>{title}</h2><Button variant="icon" aria-label="Kapat" onClick={onClose}>×</Button></div>
      {children}
    </aside>
  </>;
}

export function Tabs({ items, active, onChange, label = "Sekmeler" }: { items: Array<{ id: string; label: string }>; active: string; onChange: (id: string) => void; label?: string }) {
  return <div className="ds-tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.id} id={`tab-${item.id}`} type="button" className="ds-tab" role="tab" aria-selected={active === item.id} tabIndex={active === item.id ? 0 : -1}
      onClick={() => onChange(item.id)} onKeyDown={(event) => {
        if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowRight' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        onChange(items[next].id);
        requestAnimationFrame(() => document.getElementById(`tab-${items[next].id}`)?.focus());
      }}>{item.label}</button>)}
  </div>;
}

export function Toast({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "error" | "info" }) {
  return <div className="ds-toast" role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"}>{children}</div>;
}
