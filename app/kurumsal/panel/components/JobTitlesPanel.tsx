import type { FormEvent } from "react";
import { TITLE_OPTIONS } from "../../../../lib/form-standards";

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

export default function JobTitlesPanel(_props: Props) {
  return (
    <section className="job-titles-panel">
      <header>
        <div>
          <span>POZİSYON SEVİYELERİ</span>
          <h2>Standart çalışan ünvanları</h2>
          <p>
            Çalışanlar ünvanlarını serbest yazamaz. Kart oluşturma ve düzenleme
            ekranlarında yalnızca aşağıdaki beş standart seviyeden seçim yapılır.
          </p>
        </div>
      </header>

      <ul className="job-title-list" aria-label="Standart çalışan ünvanları">
        {TITLE_OPTIONS.map((title) => (
          <li key={title}>
            <span>{title}</span>
          </li>
        ))}
      </ul>

      <p className="job-title-policy-note">
        Ünvan kataloğu şirket bazında değiştirilemez; yeni ünvan ekleme ve ünvan talebi akışları kapalıdır.
      </p>
    </section>
  );
}
