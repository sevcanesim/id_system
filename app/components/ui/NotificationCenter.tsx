"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../../icons";

export type NoticeTone = "neutral" | "success" | "warning" | "error" | "info";

export type NoticeInput = {
  message: ReactNode;
  title?: ReactNode;
  tone?: NoticeTone;
  duration?: number;
};

type Notice = Required<Pick<NoticeInput, "tone">> & NoticeInput & { id: string };

type NoticeContextValue = {
  notify: (notice: NoticeInput) => string;
  dismiss: (id: string) => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

function noticeIcon(tone: NoticeTone): IconName {
  if (tone === "success") return "check";
  if (tone === "warning" || tone === "error") return "alert";
  if (tone === "info") return "shield";
  return "bolt";
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const sequence = useRef(0);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback((input: NoticeInput) => {
    const tone = input.tone ?? "neutral";
    const id = `notice-${++sequence.current}`;
    const duration = input.duration ?? (tone === "error" ? 8000 : 5200);
    const notice: Notice = { ...input, id, tone };

    setNotices((current) => [...current, notice].slice(-3));
    const timer = window.setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  useEffect(() => {
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<NoticeInput>).detail;
      if (detail?.message) notify(detail);
    };
    window.addEventListener("yenomi:notice", onNotice);
    return () => {
      window.removeEventListener("yenomi:notice", onNotice);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, [notify]);

  return (
    <NoticeContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="ds-notice-region" aria-live="polite" aria-relevant="additions">
        {notices.map((notice) => (
          <article key={notice.id} className={`ds-global-notice ds-global-notice--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
            <span className="ds-global-notice__icon"><Icon name={noticeIcon(notice.tone)} /></span>
            <div>
              {notice.title && <strong>{notice.title}</strong>}
              <p>{notice.message}</p>
            </div>
            <button type="button" aria-label="Bildirimi kapat" onClick={() => dismiss(notice.id)}><Icon name="close" /></button>
          </article>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) throw new Error("useNotice must be used within NoticeProvider.");
  return context;
}

/** Enables legacy or isolated client surfaces to publish a global notice. */
export function publishNotice(notice: NoticeInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NoticeInput>("yenomi:notice", { detail: notice }));
}
