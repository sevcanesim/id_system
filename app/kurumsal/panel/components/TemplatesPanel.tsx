import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icon } from "../../../icons";
import CardTemplate, { type CardBranding, type EditableCardData } from "../../../CardTemplate";
import CorporateTemplateSelector from "./CorporateTemplateSelector";
import CardPreviewFrame from "./CardPreviewFrame";
import type { DatabaseTemplateOption } from "../../../../lib/config/database";

type TemplateDraft = {
  name: string;
  primaryColor: string;
  logoUrl: string;
};

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

const DEFAULT_BRAND_COLOR = "#17121F";
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function normalizeBrandColor(value: string) {
  return HEX_COLOR_PATTERN.test(value.trim()) ? value.trim().toUpperCase() : DEFAULT_BRAND_COLOR;
}

function variantLabel(templateVariant: string) {
  const normalized = templateVariant.replace("CLASSIC", "ESSENTIAL").replace("MINIMAL", "PROFESSIONAL");
  if (normalized === "ESSENTIAL") return "Essential";
  if (normalized === "PROFESSIONAL") return "Professional";
  return "Executive";
}

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
  const currentVariant = variantLabel(templateVariant);
  const safeBrandColor = normalizeBrandColor(template.primaryColor);

  return (
    <form className="corporate-template-studio" onSubmit={onSubmit}>
      <header className="corporate-template-studio__header">
        <div className="corporate-template-studio__heading">
          <span>ŞABLON YÖNETİMİ</span>
          <h2>Ekibinin kart görünümünü tek yerden yönet</h2>
          <p>
            Kart stilini ve marka kimliğini belirle. Yaptığın değişiklikleri yayına almadan önce canlı önizlemede kontrol et.
          </p>
        </div>
        <div className="corporate-template-studio__status" aria-label="Aktif şablon durumu">
          <small>AKTİF ŞABLON</small>
          <strong>{activeTemplateName || template.name || "Kurumsal Standart"}</strong>
          <span>{currentVariant}</span>
        </div>
      </header>

      <div className="corporate-template-studio__workspace">
        <div className="corporate-template-studio__editor">
          <section className="corporate-template-section" aria-labelledby="template-style-title">
            <header className="corporate-template-section__header">
              <div className="corporate-template-section__index">01</div>
              <div>
                <h3 id="template-style-title">Kart stilini seç</h3>
                <p>Kurumsal kimliğine en uygun temel yerleşimi belirle.</p>
              </div>
            </header>
            <CorporateTemplateSelector
              value={templateVariant}
              onChange={onTemplateVariantChange}
              options={templateOptions}
            />
          </section>

          <section className="corporate-template-section" aria-labelledby="template-brand-title">
            <header className="corporate-template-section__header">
              <div className="corporate-template-section__index">02</div>
              <div>
                <h3 id="template-brand-title">Marka kimliğini düzenle</h3>
                <p>Şablon adı, ana renk ve şirket logosu tüm ekip kartlarına uygulanır.</p>
              </div>
            </header>

            <div className="corporate-template-fields">
              <label className="corporate-template-field corporate-template-field--full">
                <span>Şablon adı</span>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={template.name}
                  onChange={(event) => setTemplate((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Örn. Satış Ekibi 2026"
                />
                <small>Yönetim panelinde bu adla görünür.</small>
              </label>

              <label className="corporate-template-field">
                <span>Ana renk</span>
                <span className="corporate-template-color-control">
                  <input
                    type="color"
                    aria-label="Ana renk seç"
                    value={safeBrandColor}
                    onChange={(event) => setTemplate((current) => ({ ...current, primaryColor: event.target.value.toUpperCase() }))}
                  />
                  <input
                    aria-label="Ana renk HEX değeri"
                    value={template.primaryColor}
                    maxLength={7}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    onBlur={(event) => {
                      const normalized = normalizeBrandColor(event.target.value);
                      setTemplate((current) => ({ ...current, primaryColor: normalized }));
                    }}
                    onChange={(event) => setTemplate((current) => ({ ...current, primaryColor: event.target.value }))}
                    placeholder={DEFAULT_BRAND_COLOR}
                  />
                </span>
                <small>HEX formatında marka rengini kullan.</small>
              </label>

              <label className="corporate-template-field">
                <span>Logo URL <em>Opsiyonel</em></span>
                <input
                  type="url"
                  inputMode="url"
                  maxLength={2048}
                  placeholder="https://firma.com/logo.png"
                  value={template.logoUrl}
                  onChange={(event) => setTemplate((current) => ({ ...current, logoUrl: event.target.value.trimStart() }))}
                />
                <small>HTTPS adresi kullan. Şeffaf PNG veya SVG önerilir.</small>
              </label>
            </div>

            <div className="corporate-template-preview-note">
              <Icon name="eye" />
              <div>
                <strong>Değişiklikler henüz yayınlanmaz</strong>
                <span>Sağdaki önizleme anlık güncellenir. Hazır olduğunda kaydet.</span>
              </div>
            </div>
          </section>

          <footer className="corporate-template-savebar">
            <div>
              <small>YAYINA ALINACAK GÖRÜNÜM</small>
              <strong>{template.name || "Kurumsal Şablon"} · {currentVariant}</strong>
            </div>
            <button type="submit">Şablonu kaydet</button>
          </footer>
        </div>

        <aside className="corporate-template-preview" aria-label="Kurumsal kart canlı önizleme">
          <header className="corporate-template-preview__header">
            <div>
              <small>CANLI ÖNİZLEME</small>
              <strong>{template.name || "Kurumsal Şablon"}</strong>
            </div>
            <span>{currentVariant}</span>
          </header>

          <div className="corporate-template-preview__stage">
            <CardPreviewFrame compact>
              <CardTemplate preview branding={previewBranding} data={previewData} />
            </CardPreviewFrame>
          </div>

          <footer className="corporate-template-preview__footer">
            <span
              className="corporate-template-preview__swatch"
              style={{ background: safeBrandColor }}
              aria-hidden="true"
            />
            <div>
              <small>MARKA RENGİ</small>
              <strong>{safeBrandColor}</strong>
            </div>
          </footer>
        </aside>
      </div>
    </form>
  );
}
