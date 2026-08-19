import { Icon } from "../../../icons";

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
          return (
            <li key={link.kind}>
              <div className="corp-link-info">
                <strong>{link.label}</strong>
                <small>{link.subtitle}</small>
                {link.configured && (
                  <span className={`corp-link-publication ${link.isPublished ? "published" : "draft"}`}>
                    {link.isPublished && link.publishAt && new Date(link.publishAt).getTime() > Date.now()
                      ? `Planlandı · ${dateTime.format(new Date(link.publishAt))}`
                      : link.isPublished
                        ? "Yayında"
                        : "Taslak"}
                  </span>
                )}
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
              </div>
              <div className="corp-link-actions">
                <label className="corp-link-schedule">
                  <span>Yayın zamanı</span>
                  <input
                    type="datetime-local"
                    value={linkScheduleDraft[link.kind] || ""}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(event) => onScheduleDraftChange(link.kind, event.target.value)}
                  />
                </label>
                <input
                  placeholder="https://..."
                  value={linkUrlDraft[link.kind] || ""}
                  onChange={(e) => onUrlDraftChange(link.kind, e.target.value)}
                />
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || !(linkUrlDraft[link.kind] || "").trim()}
                  onClick={() => void onSaveUrl(link.kind)}
                >
                  URL Kaydet
                </button>
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
                {link.configured && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => void onTogglePublication(link.kind, !link.isPublished)}
                  >
                    {link.isPublished ? "Taslağa Al" : "Yayınla"}
                  </button>
                )}
                {link.configured && (
                  <button
                    type="button"
                    className="corp-link-remove"
                    disabled={busy}
                    onClick={() => void onRemove(link.kind)}
                  >
                    <Icon name="close" />
                  </button>
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
                          <button type="button" disabled={busy} onClick={() => void onRollback(version.id, link.kind)}>
                            Geri al
                          </button>
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
