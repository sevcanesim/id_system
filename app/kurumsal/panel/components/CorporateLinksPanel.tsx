"use client";

import { Icon } from "../../../icons";
import { Button, Field, Input } from "../../../components/ui/DesignSystem";

type CorporateLink = {
  id: string | null;
  kind: string;
  label: string;
  subtitle: string;
  configured: boolean;
  linkType: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  publishAt: string | null;
};

type LinkVersion = {
  id: string;
  kind: string;
  label: string | null;
  link_type: string | null;
  url: string | null;
  file_name: string | null;
  is_published: boolean;
  publish_at: string | null;
  change_reason: string;
  created_at: string;
};

type Props = {
  links: CorporateLink[];
  linkVersions: LinkVersion[];
  linkUrlDraft: Record<string, string>;
  onUrlDraftChange: (kind: string, value: string) => void;
  linkScheduleDraft: Record<string, string>;
  onScheduleDraftChange: (kind: string, value: string) => void;
  linkBusyKind: string | null;
  onSaveUrl: (kind: string) => void | Promise<void>;
  onUploadFile: (kind: string, file: File) => void | Promise<void>;
  onTogglePublication: (kind: string, publish: boolean) => void | Promise<void>;
  onRemove: (kind: string) => void | Promise<void>;
  onRollback: (versionId: string, kind: string) => void | Promise<void>;
};

const dateTime = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });
const dateTimeMedium = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

function turkishToIsoLocal(value: string) {
  const match = value.trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[ T,]*)(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}T${match[4].padStart(2, "0")}:${match[5]}`;
}

function toDatetimeLocalValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (iso) return iso[1];
  const fromTurkish = turkishToIsoLocal(trimmed);
  if (fromTurkish) return fromTurkish;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "";
  const date = new Date(parsed);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function publicationLabel(link: CorporateLink) {
  if (!link.configured) return "Boş";
  if (link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now()) {
    return `Planlandı · ${dateTime.format(new Date(link.publishAt))}`;
  }
  return link.isPublished ? "Yayında" : "Taslak";
}

function publicationTiming(link: CorporateLink) {
  if (!link.configured) return null;
  if (link.publishAt && new Date(link.publishAt).getTime() > Date.now()) {
    return { label: "Planlanan yayın", value: dateTimeMedium.format(new Date(link.publishAt)) };
  }
  if (link.isPublished && link.publishedAt) {
    return { label: "Yayınlandı", value: dateTimeMedium.format(new Date(link.publishedAt)) };
  }
  if (link.isPublished) return { label: "Durum", value: "Yayında" };
  return { label: "Durum", value: "Taslak" };
}

function versionPublication(version: LinkVersion) {
  if (version.publish_at) {
    const publishDate = new Date(version.publish_at);
    const scheduled = publishDate.getTime() > new Date(version.created_at).getTime() + 60_000;
    return {
      tone: scheduled ? "scheduled" : version.is_published ? "published" : "draft",
      label: scheduled ? "Planlanan yayın" : version.is_published ? "Yayın zamanı" : "Planlanan yayın",
      value: dateTimeMedium.format(publishDate),
    };
  }
  return {
    tone: version.is_published ? "published" : "draft",
    label: "Yayın durumu",
    value: version.is_published ? "Yayında" : "Taslak",
  };
}

function sourceLabel(link: CorporateLink) {
  if (!link.configured) return "İçerik eklenmedi";
  return link.linkType === "FILE" ? "PDF" : "URL";
}

function compactFileName(name: string, max = 36) {
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf(".");
  const ext = dot > 0 ? trimmed.slice(dot) : "";
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  if (trimmed.length <= max) return trimmed;
  const keep = Math.max(8, max - ext.length - 3);
  return `${base.slice(0, keep)}...${ext}`;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${bytes} B`;
}

export default function CorporateLinksPanel({
  links,
  linkVersions,
  linkUrlDraft,
  onUrlDraftChange,
  linkScheduleDraft,
  onScheduleDraftChange,
  linkBusyKind,
  onSaveUrl,
  onUploadFile,
  onTogglePublication,
  onRemove,
  onRollback,
}: Props) {
  return (
    <section className="corp-links-panel">
      <header>
        <div>
          <span>İÇERİK</span>
          <h2>Kurumsal Bağlantılar</h2>
          <p>Çalışan kartlarında gösterilecek sabit içerik alanlarını yönetin. Her alan URL veya PDF olabilir; yalnız düzenlemek istediğiniz alanı açın.</p>
        </div>
      </header>

      <div className="corp-links-list" role="list">
        {links.map((link, index) => {
          const busy = linkBusyKind === link.kind;
          const scheduled = Boolean(link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now());
          const versions = linkVersions.filter((version) => version.kind === link.kind);
          const timing = publicationTiming(link);
          return (
            <details className="corp-link-card" key={link.kind} open={index === 0}>
              <summary className="corp-link-card__summary">
                <div className="corp-link-info">
                  <strong>{link.label}</strong>
                  <small>{link.subtitle}</small>
                </div>
                <div className="corp-link-card__meta" aria-label={`${link.label} özeti`}>
                  <span className={`corp-link-state ${link.isPublished ? (scheduled ? "scheduled" : "published") : link.configured ? "draft" : "empty"}`}>{publicationLabel(link)}</span>
                  <span>{sourceLabel(link)}</span>
                  {versions.length > 0 && <span>{versions.length} sürüm</span>}
                </div>
                <span className="corp-link-card__chevron" aria-hidden="true"><Icon name="chevronDown" /></span>
              </summary>

              <div className="corp-link-card__body">
                <div className="corp-link-current-block">
                  <div className="corp-link-section-heading">
                    <span>Aktif içerik</span>
                    {timing && <small><strong>{timing.label}:</strong> {timing.value}</small>}
                  </div>
                  {link.configured ? (
                    link.linkType === "FILE" ? (
                      <article className="corp-file">
                        <span className="corp-file-badge">PDF</span>
                        <div className="corp-file-copy">
                          <strong title={link.fileName || "PDF"}>{compactFileName(link.fileName || "dosya.pdf")}</strong>
                          <small>{link.fileSize ? formatFileSize(link.fileSize) : "Boyut yok"}</small>
                        </div>
                        <div className="corp-file-actions">
                          {link.fileUrl ? <a className="ds-button ds-button--secondary ds-button--sm" href={link.fileUrl} target="_blank" rel="noopener noreferrer">Görüntüle</a> : <Button type="button" variant="secondary" size="sm" disabled>Görüntüle</Button>}
                          <label className="corp-link-upload corp-file-replace" htmlFor={`corp-link-replace-${link.kind}`}>{busy ? "Yükleniyor..." : "Değiştir"}</label>
                        </div>
                      </article>
                    ) : (
                      <span className="corp-link-current"><Icon name="external" /> {link.url}</span>
                    )
                  ) : (
                    <span className="corp-link-current empty">URL kaydedin veya PDF yükleyin.</span>
                  )}
                </div>

                <div className="corp-link-editor">
                  <Field label="URL">
                    <Input placeholder="https://..." value={linkUrlDraft[link.kind] || ""} onChange={(e) => onUrlDraftChange(link.kind, e.target.value)} />
                  </Field>
                  <div className="corp-link-source-actions">
                    <Button type="button" variant="primary" disabled={busy || !(linkUrlDraft[link.kind] || "").trim()} onClick={() => void onSaveUrl(link.kind)}>URL Kaydet</Button>
                    {link.linkType !== "FILE" && <label className="corp-link-upload" htmlFor={`corp-link-replace-${link.kind}`}>{busy ? "Yükleniyor..." : "PDF Yükle"}</label>}
                    <input id={`corp-link-replace-${link.kind}`} type="file" accept="application/pdf" disabled={busy} hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void onUploadFile(link.kind, file); e.target.value = ""; }} />
                  </div>
                  <Field label="Yayın zamanı" help="Türkiye saati">
                    <Input type="datetime-local" lang="tr-TR" value={toDatetimeLocalValue(linkScheduleDraft[link.kind] || "")} onChange={(event) => onScheduleDraftChange(link.kind, event.target.value)} />
                  </Field>
                  {link.configured && (
                    <div className="corp-link-toolbar">
                      <Button type="button" variant={link.isPublished ? "secondary" : "primary"} disabled={busy} onClick={() => void onTogglePublication(link.kind, !link.isPublished)}>{link.isPublished ? "Taslağa Al" : "Yayınla"}</Button>
                      <Button type="button" variant="destructive" disabled={busy} onClick={() => { if (!window.confirm(`${link.label} içeriğini silmek bu alanı karttan kaldırır. Devam edilsin mi?`)) return; void onRemove(link.kind); }}>Sil</Button>
                    </div>
                  )}
                </div>

                {versions.length > 0 && (
                  <details className="corp-link-history">
                    <summary><span><Icon name="clock" /><strong>Sürüm geçmişi</strong><small>{versions.length} kayıt</small></span><Icon name="chevronDown" /></summary>
                    <ol>
                      {versions.slice(0, 6).map((version) => {
                        const publication = versionPublication(version);
                        return (
                          <li key={version.id} className="corp-link-history__item">
                            <div className="corp-link-history__main">
                              <strong title={version.file_name || version.url || "Boş sürüm"}>{version.file_name ? compactFileName(version.file_name) : version.url || "Boş sürüm"}</strong>
                              <small>{dateTimeMedium.format(new Date(version.created_at))} · {version.change_reason}</small>
                            </div>
                            <div className="corp-link-history__publication">
                              <span className={`corp-link-history__state ${publication.tone}`}>{publication.value}</span>
                              <small>{publication.label}</small>
                            </div>
                            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onRollback(version.id, link.kind)}>Geri al</Button>
                          </li>
                        );
                      })}
                    </ol>
                  </details>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
