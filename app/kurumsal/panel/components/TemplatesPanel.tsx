import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icon } from "../../../icons";
import CardTemplate, { type CardBranding, type EditableCardData } from "../../../CardTemplate";
import CorporateTemplateSelector from "./CorporateTemplateSelector";
import type { DatabaseTemplateOption } from "../../../../lib/config/database";

type TemplateDraft = { name: string; primaryColor: string; logoUrl: string };

type Props = {
  templateVariant: string;
  onTemplateVariantChange: (variant: string) => void;
  template: TemplateDraft;
  setTemplate: Dispatch<SetStateAction<TemplateDraft>>;
  previewBranding: CardBranding;
  previewData: EditableCardData;
  activeTemplateName: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  templateOptions: DatabaseTemplateOption[];
};

function variantLabel(templateVariant: string) {
  const normalized = templateVariant.replace("CLASSIC", "ESSENTIAL").replace("MINIMAL", "PROFESSIONAL");
  if (normalized === "ESSENTIAL") return "Essential";
  if (normalized === "PROFESSIONAL") return "Professional";
  return "Executive";
}

// Şirketin varsayılan olarak yayınladığı kurumsal kart görünümü: üç hazır
// varyanttan biri (bkz. CorporateTemplateSelector) + ana renk/logo, sağda
// gerçek CardTemplate bileşeniyle canlı önizleme.
export default function TemplatesPanel({
  templateVariant,
  onTemplateVariantChange,
  template,
  setTemplate,
  previewBranding,
  previewData,
  activeTemplateName,
  onSubmit,
  templateOptions,
}: Props) {
  return (
    <form className="business-settings-card business-template-editor" onSubmit={onSubmit}>
        <header className="template-reference-heading">
          <div><span>ŞABLON YÖNETİMİ · Kurumsal kart şablonları</span><h2>Kurumsal kart görünümünü yönet</h2><p>Kurumsal görünümü seçin; renk, logo ve alanları canlı önizleme üzerinde yönetin.</p></div>
          <strong>{variantLabel(templateVariant)}</strong>
        </header>
        <CorporateTemplateSelector value={templateVariant} onChange={onTemplateVariantChange} options={templateOptions} />
        <div className="business-template-workbench">
          <div className="business-template-fields">
            <label>
              Şablon adı
              <input
                value={template.name}
                onChange={(event) => setTemplate((value) => ({ ...value, name: event.target.value }))}
              />
            </label>
            <label>
              Ana renk <small className="optional-label">#RRGGBB</small>
              <span className="template-color-control">
                <input
                  type="color"
                  aria-label="Ana renk seç"
                  value={/^#[0-9a-f]{6}$/i.test(template.primaryColor) ? template.primaryColor : "#17121f"}
                  onChange={(event) => setTemplate((value) => ({ ...value, primaryColor: event.target.value }))}
                />
                <input
                  value={template.primaryColor}
                  onChange={(event) => setTemplate((value) => ({ ...value, primaryColor: event.target.value }))}
                />
              </span>
            </label>
            <label>
              Logo URL <small className="optional-label">https:// ile başlamalı</small>
              <input
                placeholder="https://firma.com/logo.png"
                value={template.logoUrl}
                onChange={(event) => setTemplate((value) => ({ ...value, logoUrl: event.target.value }))}
              />
            </label>
            <div className="template-preview-note">
              <Icon name="eye" />
              <span>Değişiklikler sağdaki önizlemeye anında uygulanır. Kaydetmeden tasarımı deneyebilirsin.</span>
            </div>
          </div>
          <section className="business-template-live-preview" aria-label="Kurumsal kart canlı önizleme">
            <header>
              <div>
                <small>CANLI ÖNİZLEME</small>
                <strong>{template.name || "Kurumsal Şablon"}</strong>
              </div>
              <span>{variantLabel(templateVariant)}</span>
            </header>
            <div className="business-template-phone">
              <CardTemplate preview branding={previewBranding} data={previewData} />
            </div>
          </section>
        </div>
        <button>Kurumsal Şablonu Kaydet</button>
        {activeTemplateName && (
          <small>
            Aktif şablon: {activeTemplateName} · {variantLabel(templateVariant)}
          </small>
        )}
    </form>
  );
}
