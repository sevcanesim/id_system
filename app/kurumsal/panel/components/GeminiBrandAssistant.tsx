"use client";

import { useState } from "react";
import { Icon } from "../../../icons";

type TemplateDraft = { name: string; primaryColor: string; logoUrl: string };

type Props = {
  template: TemplateDraft;
  setTemplate: React.Dispatch<React.SetStateAction<TemplateDraft>>;
  templateVariant: string;
  onTemplateVariantChange: (variant: string) => void;
  setMessage: (msg: string) => void;
};

const PRESET_PROMPTS = [
  { label: "Fintech Elit", prompt: "Finans ve yatırım sektörü için lüks lacivert ve altın" },
  { label: "Hukuk & Kurumsal", prompt: "Avukatlık ve danışmanlık için ağırbaşlı mat siyah ve bronz" },
  { label: "Teknoloji Minimalist", prompt: "SaaS ve yapay zeka şirketleri için gece mavisi ve neon cam mavisi" },
  { label: "Kreatif Ajans", prompt: "Tasarım ve mimarlık stüdyoları için saf siyah ve mercan kırmızı" },
  { label: "Zümrüt Eco", prompt: "Sürdürülebilir yeşil teknoloji markaları için koyu zümrüt" },
];

const CURATED_LUXURY_COLORS = [
  { hex: "#17121F", name: "Yenomi Void (Varsayılan Siyah)" },
  { hex: "#0B1D3A", name: "Fintech Navy (Lacivert)" },
  { hex: "#0F172A", name: "Executive Slate (Gece Mavisi)" },
  { hex: "#18181B", name: "Minimal Carbon (Mat Karbon)" },
  { hex: "#062C1E", name: "Heritage Emerald (Zümrüt Yeşil)" },
  { hex: "#C5A059", name: "Champagne Gold (Şampanya Altın)" },
];

export default function GeminiBrandAssistant({
  template,
  setTemplate,
  onTemplateVariantChange,
  setMessage,
}: Props) {
  const [promptInput, setPromptInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [contrastResult, setContrastResult] = useState<{
    badgeText: string;
    isCompliantAA: boolean;
    recommendationHex: string;
  } | null>(null);

  async function handlePromptGenerate(customPrompt?: string) {
    const textToUse = customPrompt || promptInput;
    if (!textToUse.trim()) return;

    setAiLoading(true);
    setAiNote(null);
    try {
      const response = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "prompt_generate", prompt: textToUse }),
      });
      const data = await response.json();
      if (response.ok && data.result) {
        setTemplate((prev) => ({
          ...prev,
          name: data.result.name,
          primaryColor: data.result.primaryColor,
        }));
        onTemplateVariantChange(data.result.variant);
        setAiNote(data.result.badgeText + ": " + data.result.description);
        setMessage("Gemini AI: " + data.result.name + " şablonu oluşturuldu.");
      } else {
        setMessage(data.error || "Gemini AI şablon üretemedi.");
      }
    } catch {
      setMessage("Gemini AI servisine bağlanılamadı.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleExtractBrand() {
    if (!template.logoUrl || !template.logoUrl.startsWith("http")) {
      setMessage("Lütfen önce geçerli bir Logo veya Web Sitesi URL'si girin.");
      return;
    }

    setExtractLoading(true);
    try {
      const response = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "extract_brand", logoUrl: template.logoUrl }),
      });
      const data = await response.json();
      if (response.ok && data.result) {
        setTemplate((prev) => ({
          ...prev,
          name: prev.name || data.result.brandName,
          primaryColor: data.result.primaryColor,
        }));
        setAiNote(data.result.badgeText);
        setMessage("Gemini AI: Marka rengi (" + data.result.primaryColor + ") başarıyla çıkarıldı.");
      } else {
        setMessage(data.error || "Marka rengi çıkarılamadı.");
      }
    } catch {
      setMessage("Gemini AI servisine ulaşılamadı.");
    } finally {
      setExtractLoading(false);
    }
  }

  async function handleAuditContrast() {
    try {
      const response = await fetch("/api/ai/brand-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "audit_contrast", colorHex: template.primaryColor }),
      });
      const data = await response.json();
      if (response.ok && data.result) {
        setContrastResult({
          badgeText: data.result.badgeText,
          isCompliantAA: data.result.isCompliantAA,
          recommendationHex: data.result.recommendationHex,
        });
      }
    } catch {
      // Best-effort contrast check
    }
  }

  return (
    <div className="gemini-brand-assistant-card">
      <header className="gemini-assistant-header">
        <div className="gemini-badge-title">
          <span className="gemini-ai-sparkle-icon">✨</span>
          <strong>Gemini AI Marka Asistanı</strong>
        </div>
        <p className="gemini-assistant-desc">
          Doğal dille komut yazın, logonuzdan renk çıkarın veya kurumsal renk uyumunu yapay zeka ile otomatik tarayın.
        </p>
      </header>

      {/* Prompt Generator Row */}
      <div className="gemini-prompt-row">
        <div className="gemini-input-wrapper">
          <Icon name="search" />
          <input
            type="text"
            placeholder="Örn: Finans sektörü için lüks lacivert ve altın detaylı kurumsal tema..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handlePromptGenerate();
              }
            }}
          />
        </div>
        <button
          type="button"
          className="gemini-generate-btn"
          disabled={aiLoading}
          onClick={() => handlePromptGenerate()}
        >
          {aiLoading ? (
            <span>Tasarım Üretiliyor...</span>
          ) : (
            <>
              <span>✨ Gemini İle Üret</span>
            </>
          )}
        </button>
      </div>

      {/* Preset Prompt Chips */}
      <div className="gemini-chips-container">
        <span className="gemini-chips-label">Hızlı Akıllı Öneriler:</span>
        <div className="gemini-chips-list">
          {PRESET_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="gemini-chip-btn"
              onClick={() => {
                setPromptInput(item.prompt);
                handlePromptGenerate(item.prompt);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Recommendation Note */}
      {aiNote && (
        <div className="gemini-ai-note-box">
          <span className="gemini-ai-sparkle">✨</span>
          <span>{aiNote}</span>
        </div>
      )}

      {/* Color Harmonizer Swatches */}
      <div className="gemini-color-harmonies">
        <div className="gemini-harmonies-header">
          <span>Önerilen Kurumsal Lüks Paletler:</span>
          {template.logoUrl && (
            <button
              type="button"
              className="gemini-extract-btn"
              disabled={extractLoading}
              onClick={handleExtractBrand}
            >
              {extractLoading ? "Analiz Ediliyor..." : "✨ Logo/Web'den Renk Ayıkla"}
            </button>
          )}
        </div>
        <div className="gemini-swatches-grid">
          {CURATED_LUXURY_COLORS.map((item) => (
            <button
              key={item.hex}
              type="button"
              className={`gemini-swatch-item ${template.primaryColor.toUpperCase() === item.hex.toUpperCase() ? "active" : ""}`}
              style={{ backgroundColor: item.hex }}
              title={`${item.name} (${item.hex})`}
              onClick={() => {
                setTemplate((prev) => ({ ...prev, primaryColor: item.hex }));
                handleAuditContrast();
              }}
            >
              <span className="gemini-swatch-hex">{item.hex}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contrast Auditor Result with Luxury Styling */}
      {contrastResult && (
        <div className={`gemini-contrast-badge ${contrastResult.isCompliantAA ? "compliant" : "warning"}`}>
          <Icon name={contrastResult.isCompliantAA ? "check" : "alert-circle"} />
          <span>{contrastResult.badgeText}</span>
          {!contrastResult.isCompliantAA && contrastResult.recommendationHex && (
            <button
              type="button"
              className="gemini-fix-contrast-btn"
              onClick={() => {
                setTemplate((prev) => ({ ...prev, primaryColor: contrastResult.recommendationHex }));
                setContrastResult(null);
                setMessage("AI ile renk kontrastı otomatik düzeltildi.");
              }}
            >
              AI İle Rengi Düzelt ({contrastResult.recommendationHex})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
