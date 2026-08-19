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

function publicationLabel(link: CorporateLink) {
  if (!link.configured) return "Kayıt yok";
  if (link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now()) {
    return `Planlandı · ${dateTime.format(new Date(link.publishAt))}`;
  }
  return link.isPublished ? "Yayında" : "Taslak";
}

function sourceLabel(link: CorporateLink) {
  if (!link.configured) return "Varsayılan";
  return link.linkType === "FILE" ? "PDF aktif" : "URL aktif";
}

// Çalışan kartındaki "Kurumsal Bağlantılar" bölümünün dört sabit slotu
// (bkz. supabase/migrations/*_organization_links.sql — organization_links
// tablosu). Her slot ya URL ya da yüklenmiş bir PDF; taslak/yayında durumu,
// ileri tarihli yayın planlaması ve sürüm geçmişi burada yönetiliyor.
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
          <span>KART ŞABLONU</span>
          <h2>Kurumsal Bağlantılar</h2>
          <p>
            Çalışan kartındaki &quot;Kurumsal Bağlantılar&quot; bölümünde
            görünecek dört sabit alan. Her biri bir PDF (ör. ürün kataloğu)
            ya da bir URL (ör. randevu bağlantısı) olabilir. Boş bırakılan
            alan şirket web sitesi/e-postasına düşen varsayılan davranışta
            kalır.
          </p>
        </div>
      </header>
      <ul className="corp-links-list">
        {links.map((link) => {
          const busy = linkBusyKind === link.kind;
          const scheduled = Boolean(link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now());
          return (
            <li key={link.kind}>
              <div className="corp-link-info">
                <strong>{link.label}</strong>
                <small>{link.subtitle}</small>
              </div>
              <dl className="corp-link-status" aria-label={`${link.label} yayın durumu`}>
                <div>
                  <dt>Kayıt</dt>
                  <dd>{link.configured ? "Kayıtlı" : "Kayıtlı değil"}</dd>
                </div>
                <div>
                  <dt>Yayın</dt>
                  <dd className={link.isPublished ? (scheduled ? "scheduled" : "published") : link.configured ? "draft" : "empty"}>
                    {publicationLabel(link)}
                  </dd>
                </div>
                <div>
                  <dt>Kaynak</dt>
                  <dd>{sourceLabel(link)}</dd>
                </div>
                <div className="corp-link-status-current">
                  <dt>Aktif içerik</dt>
                  <dd>
                    {link.configured ? (
                      link.linkType === "FILE" ? (
                        <span className="corp-link-current">
                          <Icon name="box" /> {link.fileName}{" "}
                          {link.fileSize ? `· ${(link.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}
                        </span>
                      ) : (
                        <span className="corp-link-current">
                          <Icon name="external" /> {link.url}
                        </span>
                      )
                    ) : (
                      <span className="corp-link-current empty">
                        Yapılandırılmadı — kartta varsayılan gösterilir
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="corp-link-editor">
                <Field label="URL">
                  <Input
                    placeholder="https://..."
                    value={linkUrlDraft[link.kind] || ""}
                    onChange={(e) => onUrlDraftChange(link.kind, e.target.value)}
                  />
                </Field>
                <div className="corp-link-source-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !(linkUrlDraft[link.kind] || "").trim()}
                    onClick={() => void onSaveUrl(link.kind)}
                  >
                    URL Kaydet
                  </Button>
                  <label className="corp-link-upload">
                    {busy ? "Yükleniyor..." : "PDF Yükle"}
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUploadFile(link.kind, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <Field label="Yayın zamanı">
                  <Input
                    type="datetime-local"
                    value={linkScheduleDraft[link.kind] || ""}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(event) => onScheduleDraftChange(link.kind, event.target.value)}
                  />
                </Field>
                {link.configured && (
                  <div className="corp-link-toolbar">
                    <Button
                      type="button"
                      variant={link.isPublished ? "secondary" : "primary"}
                      disabled={busy}
                      onClick={() => void onTogglePublication(link.kind, !link.isPublished)}
                    >
                      {link.isPublished ? "Taslağa Al" : "Yayınla"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void onRemove(link.kind)}
                    >
                      Sil
                    </Button>
                  </div>
                )}
              </div>
              {linkVersions.some((version) => version.kind === link.kind) && (
                <details className="corp-link-history">
                  <summary>Sürüm geçmişi</summary>
                  <ol>
                    {linkVersions
                      .filter((version) => version.kind === link.kind)
                      .slice(0, 6)
                      .map((version) => (
                        <li key={version.id}>
                          <div>
                            <strong>{version.file_name || version.url || "Boş sürüm"}</strong>
                            <small>
                              {dateTimeMedium.format(new Date(version.created_at))} · {version.change_reason}
                            </small>
                          </div>
                          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onRollback(version.id, link.kind)}>
                            Geri al
                          </Button>
                        </li>
                      ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
