import type { Dispatch, FormEvent, SetStateAction } from "react";
import { normalizeTrPhone } from "../../../../lib/form-standards";
import { Icon } from "../../../icons";

type Fields = Record<string, string | boolean>;
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type Props = {
  fields: Fields;
  setFields: Dispatch<SetStateAction<Fields>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  organizationName: string;
  savedOrganizationName: string;
  onOrganizationNameChange: (value: string) => void;
  onSaveOrganizationName: () => void | Promise<void>;
  canRenameOrganization: boolean;
  organizationNameBusy: boolean;
  organizationNameError: string | null;
  organizationNameSaved: boolean;
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
  organizationName,
  savedOrganizationName,
  onOrganizationNameChange,
  onSaveOrganizationName,
  canRenameOrganization,
  organizationNameBusy,
  organizationNameError,
  organizationNameSaved,
  profileBusy,
  profileDirty,
  profileSaved,
  profileError,
}: Props) {
  const update = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const nameDirty = organizationName.trim() !== savedOrganizationName.trim();
  const nameState: SaveState = organizationNameBusy
    ? "saving"
    : organizationNameError
      ? "error"
      : nameDirty
        ? "dirty"
        : organizationNameSaved
          ? "saved"
          : "idle";
  const profileState: SaveState = profileBusy
    ? "saving"
    : profileError
      ? "error"
      : profileDirty
        ? "dirty"
        : profileSaved
          ? "saved"
          : "idle";
  const nameStatus = saveCopy(nameState, organizationNameError);
  const profileStatus = saveCopy(profileState, profileError);

  return (
    <form className="business-company-settings" onSubmit={onSubmit}>
      <header>
        <div>
          <span>KURUMSAL KİMLİK</span>
          <h2>Şirket bilgileri</h2>
          <p>Resmi ad, iletişim ve alan politikaları aynı çalışma alanında yönetilir. Logo ve marka görünümü Marka & Şablon sekmesinden uygulanır.</p>
        </div>
        <button type="submit" disabled={profileBusy || !profileDirty}>
          {profileBusy ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </header>
      {profileStatus ? <p className="org-save-status" data-state={profileState} role="status">{profileStatus}</p> : null}

      <div className="company-settings-grid">
        <section>
          <h3>Şirket kimliği</h3>
          <label>
            Şirket adı
            <input
              value={organizationName}
              onChange={(event) => onOrganizationNameChange(event.target.value)}
              placeholder="Şirketinizin adı"
              maxLength={80}
              disabled={!canRenameOrganization}
            />
          </label>
          {canRenameOrganization ? (
            <button
              type="button"
              onClick={() => void onSaveOrganizationName()}
              disabled={organizationNameBusy || organizationName.trim().length < 2 || !nameDirty}
            >
              {organizationNameBusy ? "Kaydediliyor..." : "Şirket Adını Kaydet"}
            </button>
          ) : (
            <small className="optional-label">Bu alanı yalnızca şirket sahibi değiştirebilir.</small>
          )}
          {nameStatus ? <p className="org-save-status" data-state={nameState} role="status">{nameStatus}</p> : null}
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
          <div className="settings-tristate-head"><span /><span>Serbest</span><span>Öneri</span><span>Kilitli</span></div>
          {LOCK_FIELDS.map(([key, label, freeText, suggestedText, lockedText]) => {
            const currentMode = String(fields[key] || "free");
            const description = currentMode === "locked" ? lockedText : currentMode === "suggested" ? suggestedText : freeText;
            return (
              <div className="settings-tristate" key={key}>
                <span>
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
