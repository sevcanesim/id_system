"use client";

import { useState } from "react";
import { Icon } from "../../../icons";
import { Button, Field, Input } from "../../../components/ui/DesignSystem";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";

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

function publicationLabel(link: CorporateLink) {
  if (!link.configured) return "Boş";
  if (link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now()) {
    return `Planlandı · ${dateTime.format(new Date(link.publishAt))}`;
  }
  return link.isPublished ? "Yayında" : "Taslak";
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
  if (!link.configured) return link.kind === "MEETING" ? "Takvim eklenmedi" : "İçerik eklenmedi";
  if (link.kind === "MEETING") return "Takvim";
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
  linkBusyKind,
  onSaveUrl,
  onUploadFile,
  onTogglePublication,
  onRemove,
  onRollback,
}: Props) {
  const [deletedVersionIds, setDeletedVersionIds] = useState<Set<string>>(() => new Set());
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

  async function deleteVersion(version: LinkVersion) {
    if (!window.confirm("Bu sürüm geçmişten kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
    setDeletingVersionId(version.id);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const access = data.session?.access_token;
      if (!access) {
        window.alert("Sürümü silmek için oturum gerekli.");
        return;
      }
      const response = await fetch("/api/organizations/links", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ action: "DELETE_VERSION", versionId: version.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        window.alert(payload?.error || "Sürüm silinemedi.");
        return;
      }
      setDeletedVersionIds((current) => {
        const next = new Set(current);
        next.add(version.id);
        return next;
      });
    } catch {
      window.alert("Sürüm silinemedi.");
    } finally {
      setDeletingVersionId(null);
    }
  }

  return (
    <section className="corp-links-panel">
      <header>
        <div>
          <span>İÇERİK</span>
          <h2>Kurumsal Bağlantılar</h2>
          <p>Katalog, sunum ve referans içeriklerini URL veya PDF olarak yönetin. Toplantı Planla alanı yalnız takvim veya randevu bağlantısı kullanır.</p>
        </div>
      </header>

      <div className="corp-links-list" role="list">
        {links.map((link, index) => {
          const busy = linkBusyKind === link.kind;
          const isMeeting = link.kind === "MEETING";
          const scheduled = Boolean(link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now());
          const versions = linkVersions.filter((version) => version.kind === link.kind && !deletedVersionIds.has(version.id));
          return (
            <details className="corp-link-card" key={link.kind} open={index === 0}>
              <summary className="corp-link-card__summary">
                <div className="corp-link-info">
                  <strong>{link.label}</strong>
                  <small>{isMeeting ? "Google Calendar, Calendly veya Microsoft Bookings bağlantısı" : link.subtitle}</small>
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
                  <div className="corp-link-section-heading"><span>Aktif içerik</span></div>
                  {isMeeting ? (
                    link.configured && link.linkType !== "FILE" ? (
                      <span className="corp-link-current"><Icon name="clock" /> {link.url}</span>
                    ) : (
                      <span className="corp-link-current empty">Takvim veya randevu bağlantısı ekleyin.</span>
                    )
                  ) : link.configured ? (
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
                  <Field label={isMeeting ? "Takvim / randevu bağlantısı" : "URL"} help={isMeeting ? "Google Calendar, Calendly, Microsoft Bookings veya kullandığınız randevu servisinin bağlantısını ekleyin." : undefined}>
                    <Input placeholder={isMeeting ? "https://calendar.google.com/... veya https://calendly.com/..." : "https://..."} value={linkUrlDraft[link.kind] || ""} onChange={(e) => onUrlDraftChange(link.kind, e.target.value)} />
                  </Field>
                  <div className="corp-link-source-actions">
                    <Button type="button" variant="primary" disabled={busy || !(linkUrlDraft[link.kind] || "").trim()} onClick={() => void onSaveUrl(link.kind)}>{isMeeting ? "Takvimi Kaydet" : "URL Kaydet"}</Button>
                    {!isMeeting && link.linkType !== "FILE" && <label className="corp-link-upload" htmlFor={`corp-link-replace-${link.kind}`}>{busy ? "Yükleniyor..." : "PDF Yükle"}</label>}
                    {!isMeeting && <input id={`corp-link-replace-${link.kind}`} type="file" accept="application/pdf" disabled={busy} hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void onUploadFile(link.kind, file); e.target.value = ""; }} />}
                  </div>
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
                        const deleting = deletingVersionId === version.id;
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
                            <div className="corp-link-history__actions">
                              <Button type="button" variant="secondary" size="sm" disabled={busy || deleting} onClick={() => void onRollback(version.id, link.kind)}>Geri al</Button>
                              <Button type="button" variant="destructive" size="sm" disabled={busy || deleting} onClick={() => void deleteVersion(version)}>{deleting ? "Siliniyor..." : "Sil"}</Button>
                            </div>
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
