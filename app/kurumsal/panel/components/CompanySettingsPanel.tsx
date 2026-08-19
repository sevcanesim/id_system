import type { Dispatch, FormEvent, SetStateAction } from "react";
import { normalizeTrPhone } from "../../../../lib/form-standards";
import { Icon } from "../../../icons";

type Fields = Record<string, string | boolean>;
type Props = {
  fields: Fields;
  setFields: Dispatch<SetStateAction<Fields>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  organizationName: string;
  onOrganizationNameChange: (value: string) => void;
  onSaveOrganizationName: () => void | Promise<void>;
  canRenameOrganization: boolean;
  organizationNameBusy: boolean;
};

const LOCK_FIELDS = [
  ["lockName", "Ad Soyad", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir · değişiklik İK kaydına düşer", "Şirket tarafından yönetiliyor"],
  ["lockCompany", "Şirket adı", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir", "Şirket tarafından yönetiliyor"],
  ["lockTitle", "Ünvan ve departman", "Çalışan pozisyon kataloğundan seçer", "Şirket önerir, çalışan değiştirebilir", "Şirket tarafından yönetiliyor"],
  ["lockEmail", "Kurumsal e-posta", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir · değişiklik İK kaydına düşer", "Şirket tarafından yönetiliyor"],
  ["lockPhone", "Kurumsal telefon", "Çalışan girer, öneri yok", "Şirket önerir, çalışan değiştirebilir", "Şirket tarafından yönetiliyor"],
] as const;

export default function CompanySettingsPanel({
  fields,
  setFields,
  onSubmit,
  organizationName,
  onOrganizationNameChange,
  onSaveOrganizationName,
  canRenameOrganization,
  organizationNameBusy,
}: Props) {
  const update = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  return (
    <>
      <div className="business-company-settings org-identity-card">
        <header>
          <div><span>KURUMSAL KİMLİK</span><h2>Şirket adı</h2><p>Kurumsal panelde, çalışan kartlarında ve genel kart sayfalarında görünen resmi ad. Yalnızca şirket sahibi değiştirebilir.</p></div>
        </header>
        <div className="company-settings-grid single">
          <section>
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
                disabled={organizationNameBusy || organizationName.trim().length < 2}
              >
                {organizationNameBusy ? "Kaydediliyor..." : "Şirket Adını Kaydet"}
              </button>
            ) : (
              <small className="optional-label">Bu alanı yalnızca şirket sahibi değiştirebilir.</small>
            )}
          </section>
        </div>
      </div>
      <form className="business-company-settings" onSubmit={onSubmit}>
        <header>
          <div><span>MERKEZİ YÖNETİM</span><h2>Şirket profili ve alan kilitleri</h2><p>Buradaki bilgiler tüm çalışan kartlarına merkezi olarak uygulanır.</p></div>
          <button>Değişiklikleri Kaydet</button>
        </header>
      <div className="company-settings-grid">
        <section>
          <h3>Kurumsal iletişim</h3>
          <label>Web sitesi<input type="url" placeholder="https://sirketiniz.com" value={String(fields.website)} onChange={(event) => update("website", event.target.value)} /></label>
          <label>Şirket telefonu<input type="tel" inputMode="tel" autoComplete="tel" placeholder="+90 5xx xxx xx xx" value={String(fields.phone)} onChange={(event) => update("phone", normalizeTrPhone(event.target.value))} /></label>
          <label>Merkez adresi<textarea placeholder="Şirket adresi" value={String(fields.address)} onChange={(event) => update("address", event.target.value)} /></label>
          <label>KVKK / gizlilik bağlantısı<input type="url" placeholder="https://..." value={String(fields.privacyUrl)} onChange={(event) => update("privacyUrl", event.target.value)} /></label>
        </section>
        <section>
          <h3>Çalışan alan kilitleri</h3>
          <p>Her alan için üç durum var: çalışan serbestçe girer, şirket bir değer önerir ama çalışan değiştirebilir, ya da şirket tam kontrol eder.</p>
          <div className="settings-tristate-head"><span /><span>Serbest</span><span>Öneri</span><span>Kilitli</span></div>
          {LOCK_FIELDS.map(([key, label, freeText, suggestedText, lockedText]) => {
            const currentMode = String(fields[key] || "free");
            const description = currentMode === "locked" ? lockedText : currentMode === "suggested" ? suggestedText : freeText;
            return (
              <div className="settings-tristate" key={key}>
                <span><strong>{label}</strong><small>{description}</small></span>
                <div className="settings-tristate-control" role="radiogroup" aria-label={label}>
                  {(["free", "suggested", "locked"] as const).map((mode) => (
                    <button type="button" key={mode} role="radio" aria-checked={currentMode === mode} className={currentMode === mode ? `active mode-${mode}` : ""} onClick={() => update(key, mode)}>
                      {mode === "free" ? <Icon name="lock-open" /> : mode === "suggested" ? <Icon name="adjustments" /> : <Icon name="lock" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>
      <aside><Icon name="lock" /> Kilitli alanlar (ad soyad, şirket adı, ünvan, e-posta, telefon) çalışan kart oluşturma ekranında düzenlenemez hale gelir ve buradaki değerle otomatik doldurulur. Öneri durumundaki alanlar aynı değerle önceden doldurulur ama çalışan üzerine yazabilir; değişiklikler kimlik geçmişine işlenir. Web sitesi, adres ve KVKK bağlantısı şimdilik yalnızca bu panelde saklanır.</aside>
      </form>
    </>
  );
}
