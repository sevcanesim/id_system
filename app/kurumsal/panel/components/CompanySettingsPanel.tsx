import type { Dispatch, FormEvent, SetStateAction } from "react";
import { normalizeTrPhone } from "../../../../lib/form-standards";
import { Icon } from "../../../icons";
import { StatusBadge } from "../../../components/ui/DesignSystem";

type Fields = Record<string, string | boolean>;
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type LegalProfile = {
  name: string;
  corporate_id?: string | null;
  legal_name?: string | null;
  tax_id_type?: "VKN" | null;
  tax_number?: string | null;
  tax_office?: string | null;
  mersis_number?: string | null;
  trade_registry_number?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_district?: string | null;
  billing_postal_code?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  authorized_person_name?: string | null;
} | null;
type Props = {
  fields: Fields;
  setFields: Dispatch<SetStateAction<Fields>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  legalProfile: LegalProfile;
  profileBusy: boolean;
  profileDirty: boolean;
  profileSaved: boolean;
  profileError: string | null;
};

const LOCK_FIELDS = [
  ["lockName", "Ad Soyad", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir · değişiklik İK kaydına düşer", "Şirket sahibi tarafından yönetiliyor · Çalışan değiştiremez"],
  ["lockCompany", "Şirket adı", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir", "Şirket sahibi tarafından yönetiliyor · Çalışan değiştiremez"],
  ["lockTitle", "Ünvan ve departman", "Çalışan pozisyon kataloğundan seçer", "Şirket önerir, çalışan değiştirebilir", "Şirket sahibi tarafından yönetiliyor · Çalışan değiştiremez"],
  ["lockEmail", "Kurumsal e-posta", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir · değişiklik İK kaydına düşer", "Şirket sahibi tarafından yönetiliyor · Çalışan değiştiremez"],
  ["lockPhone", "Kurumsal telefon", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir", "Şirket sahibi tarafından yönetiliyor · Çalışan değiştiremez"],
] as const;

const LOCK_MODES = [
  ["free", "Serbest", "Çalışan bu alanı kendisi doldurur."],
  ["suggested", "Öneri", "Şirket bir değer önerir; çalışan değiştirebilir."],
  ["locked", "Kilitli", "Şirket yönetir. Çalışan kartında düzenlenemez."],
] as const;

function saveCopy(state: SaveState, error: string | null) {
  if (state === "saving") return "Kaydediliyor…";
  if (state === "error") return error || "Kaydedilemedi.";
  if (state === "dirty") return "Kaydedilmemiş değişiklik var.";
  if (state === "saved") return "Kaydedildi.";
  return "";
}

export default function CompanySettingsPanel({
  fields,
  setFields,
  onSubmit,
  legalProfile,
  profileBusy,
  profileDirty,
  profileSaved,
  profileError,
}: Props) {
  const update = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const profileState: SaveState = profileBusy
    ? "saving"
    : profileError
      ? "error"
      : profileDirty
        ? "dirty"
        : profileSaved
          ? "saved"
          : "idle";
  const profileStatus = saveCopy(profileState, profileError);
  const legalName = legalProfile?.legal_name?.trim() || legalProfile?.name || "Kayıt bulunamadı";
  const taxIdType = legalProfile?.tax_id_type || "VKN";
  const taxNumber = legalProfile?.tax_number?.trim() || "Kayıt bulunamadı";
  const taxOffice = legalProfile?.tax_office?.trim() || "Kayıt bulunamadı";
  const recordComplete = Boolean(legalProfile?.name?.trim() && legalProfile?.tax_number?.trim() && legalProfile?.tax_office?.trim());

  return (
    <form className="business-company-settings" onSubmit={onSubmit}>
      <header>
        <div>
          <span>KURUMSAL KİMLİK</span>
          <h2>Şirket bilgileri</h2>
          <p>Resmî şirket kaydı tüm kurumsal kartlar ve ticari işlemler için tek kaynaktır. İletişim ve alan politikalarını aşağıdan yönetebilirsin.</p>
        </div>
        <button type="submit" disabled={profileBusy || !profileDirty}>
          {profileBusy ? "Kaydediliyor..." : "Politikaları Kaydet"}
        </button>
      </header>
      {profileStatus ? <p className="org-save-status" data-state={profileState} role="status">{profileStatus}</p> : null}

      <div className="company-settings-grid">
        <section className="company-legal-profile">
          <div className="company-legal-profile__heading">
            <div>
              <h3>Resmî şirket kaydı</h3>
              <p>Aktivasyon sırasında kaydedilen bu bilgiler şirket genelinde geçerlidir ve değiştirilemez.</p>
            </div>
            <StatusBadge tone={recordComplete ? "success" : "warning"} className="company-legal-profile__status">
              <Icon name="lock" />{recordComplete ? "Sabit kayıt" : "Kayıt eksik"}
            </StatusBadge>
          </div>
          <dl>
            {legalProfile?.corporate_id ? <div><dt>Yenomi Şirket ID</dt><dd>{legalProfile.corporate_id}</dd></div> : null}
            <div><dt>Şirket unvanı</dt><dd>{legalName}</dd></div>
            <div><dt>Vergi kimliği</dt><dd>{taxIdType} · {taxNumber}</dd></div>
            <div><dt>Vergi dairesi</dt><dd>{taxOffice}</dd></div>
            {legalProfile?.mersis_number ? <div><dt>MERSİS no</dt><dd>{legalProfile.mersis_number}</dd></div> : null}
            {legalProfile?.trade_registry_number ? <div><dt>Ticaret sicil no</dt><dd>{legalProfile.trade_registry_number}</dd></div> : null}
          </dl>
          {!recordComplete ? <p className="company-legal-profile__notice"><Icon name="alert-circle" />Resmî kayıt eksik. Değiştirilemez kayıtların tamamlanması için destek ekibiyle iletişime geçin.</p> : null}
        </section>
        <section>
          <h3>Kurumsal iletişim</h3>
          <label>Web sitesi<input type="url" placeholder="https://sirketiniz.com" value={String(fields.website)} onChange={(event) => update("website", event.target.value)} /></label>
          <label>Şirket telefonu<input type="tel" inputMode="tel" autoComplete="tel" placeholder="+90 5xx xxx xx xx" value={String(fields.phone)} onChange={(event) => update("phone", normalizeTrPhone(event.target.value))} /></label>
          <label>Merkez adresi<textarea placeholder="Şirket adresi" value={String(fields.address)} onChange={(event) => update("address", event.target.value)} /></label>
          <label>KVKK / gizlilik bağlantısı<input type="url" placeholder="https://..." value={String(fields.privacyUrl)} onChange={(event) => update("privacyUrl", event.target.value)} /></label>
        </section>
      </div>

      <div className="company-settings-grid single">
        <section>
          <h3>Çalışan alan kilitleri</h3>
          <p>Her alanın kim tarafından düzenlenebileceği burada belirlenir. İkonlar serbest, öneri ve kilitli anlamındadır.</p>
          <div className="settings-tristate-legend" aria-label="Alan politikası anlamları">
            {LOCK_MODES.map(([mode, label, copy]) => (
              <article key={mode}>
                <strong>
                  <Icon name={mode === "free" ? "lock-open" : mode === "suggested" ? "adjustments" : "lock"} />
                  {label}
                </strong>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="settings-tristate-head"><span>Alan</span><span>Serbest</span><span>Öneri</span><span>Kilitli</span></div>
          {LOCK_FIELDS.map(([key, label, freeText, suggestedText, lockedText]) => {
            const currentMode = String(fields[key] || "free");
            const description = currentMode === "locked" ? lockedText : currentMode === "suggested" ? suggestedText : freeText;
            return (
              <div className="settings-tristate" key={key}>
                <span className="settings-tristate-copy">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <div className="settings-tristate-control" role="radiogroup" aria-label={label}>
                  {(["free", "suggested", "locked"] as const).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      role="radio"
                      aria-checked={currentMode === mode}
                      aria-label={mode === "free" ? `${label}: çalışan serbestçe girer` : mode === "suggested" ? `${label}: şirket önerir, çalışan değiştirebilir` : `${label}: şirket sahibi yönetir, çalışan değiştiremez`}
                      title={mode === "free" ? "Serbest" : mode === "suggested" ? "Öneri" : "Kilitli"}
                      className={currentMode === mode ? `active mode-${mode}` : ""}
                      onClick={() => update(key, mode)}
                    >
                      {mode === "free" ? <Icon name="lock-open" /> : mode === "suggested" ? <Icon name="adjustments" /> : <Icon name="lock" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <aside>
        <Icon name="lock" /> Kilitli alanlar çalışan kartında düzenlenemez ve buradaki değerle dolar. Öneri alanları önceden doldurulur ama çalışan üzerine yazabilir. Web sitesi, adres ve KVKK bağlantısı bu panelde saklanır; kart görünümü Marka & Şablon’dan yönetilir.
      </aside>
    </form>
  );
}
