import type { FormEvent } from "react";
import { Icon } from "../../../icons";

type JobTitle = { id: string; title: string };
type TitleRequest = {
  id: string;
  member_id: string;
  requested_title: string;
  created_at: string;
  organization_members: { full_name: string | null; department: string | null };
};

type Props = {
  jobTitles: JobTitle[];
  newJobTitle: string;
  onNewJobTitleChange: (value: string) => void;
  onAddJobTitle: (event: FormEvent) => void | Promise<void>;
  jobTitleBusy: boolean;
  onRemoveJobTitle: (id: string) => void | Promise<void>;
  titleRequests: TitleRequest[];
  titleRequestBusyId: string | null;
  onResolveTitleRequest: (requestId: string, approve: boolean) => void | Promise<void>;
};

// Şirketin gerçek pozisyon kataloğu + İK onayı bekleyen ünvan talepleri.
// Kart formundaki Ünvan alanı yalnızca buradaki listeden seçilir
// (bkz. app/olustur/CardWizard.tsx — orgLock.jobTitles).
export default function JobTitlesPanel({
  jobTitles,
  newJobTitle,
  onNewJobTitleChange,
  onAddJobTitle,
  jobTitleBusy,
  onRemoveJobTitle,
  titleRequests,
  titleRequestBusyId,
  onResolveTitleRequest,
}: Props) {
  return (
    <section className="job-titles-panel">
      <header>
        <div>
          <span>POZİSYON KATALOĞU</span>
          <h2>Şirketin gerçek ünvanları</h2>
          <p>
            Çalışan kart formundaki Ünvan alanı yalnızca buradaki listeden
            seçilir. Listede olmayan bir ünvan istenirse çalışan İK&apos;ya
            talep gönderir.
          </p>
        </div>
      </header>
      <form className="job-title-add-form" onSubmit={onAddJobTitle}>
        <label>
          Yeni unvan ekle
          <input
            value={newJobTitle}
            onChange={(e) => onNewJobTitleChange(e.target.value)}
            placeholder="Unvan adı..."
            maxLength={120}
          />
        </label>
        <button disabled={jobTitleBusy || newJobTitle.trim().length < 2}>
          {jobTitleBusy ? "Ekleniyor..." : "+ Ekle"}
        </button>
      </form>
      <ul className="job-title-list">
        {jobTitles.length === 0 && (
          <li className="empty">
            Henüz pozisyon eklenmedi. Boşken çalışan ünvanını serbest
            yazabilir.
          </li>
        )}
        {jobTitles.map((item) => (
          <li key={item.id}>
            <span>{item.title}</span>
            <button type="button" onClick={() => void onRemoveJobTitle(item.id)}>
              <Icon name="close" />
            </button>
          </li>
        ))}
      </ul>
      {titleRequests.length > 0 && (
        <>
          <h3>Bekleyen ünvan talepleri</h3>
          <ul className="title-request-list">
            {titleRequests.map((req) => (
              <li key={req.id}>
                <div>
                  <strong>{req.organization_members?.full_name || "Çalışan"}</strong>
                  <span>
                    &quot;{req.requested_title}&quot; istiyor
                    {req.organization_members?.department
                      ? ` · ${req.organization_members.department}`
                      : ""}
                  </span>
                </div>
                <div className="title-request-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={titleRequestBusyId === req.id}
                    onClick={() => void onResolveTitleRequest(req.id, false)}
                  >
                    Reddet
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={titleRequestBusyId === req.id}
                    onClick={() => void onResolveTitleRequest(req.id, true)}
                  >
                    Onayla
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
