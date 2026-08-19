export type CorporateTemplateVariant =
  | "ESSENTIAL"
  | "PROFESSIONAL"
  | "EXECUTIVE";

type TemplateOption = {
  value: CorporateTemplateVariant;
  title: string;
  description: string;
};

export function normalizeCorporateTemplateVariant(
  value?: string | null,
): CorporateTemplateVariant {
  if (value === "MINIMAL") return "PROFESSIONAL";
  if (value === "PROFESSIONAL" || value === "EXECUTIVE") return value;
  return "ESSENTIAL";
}

export default function CorporateTemplateSelector({
  value,
  onChange,
  options,
}: {
  value?: string | null;
  onChange: (value: CorporateTemplateVariant) => void;
  options: TemplateOption[];
}) {
  const selected = normalizeCorporateTemplateVariant(value);
  if (!options.length) return <p>Şablon seçenekleri yükleniyor…</p>;

  return (
    <div
      className="business-template-options"
      role="radiogroup"
      aria-label="Kurumsal kart görünümü"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected === option.value}
          className={selected === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          <span
            className={`template-mini template-${option.value.toLowerCase()}`}
            aria-hidden="true"
          >
            <i />
            <b />
            <em />
          </span>
          <strong>{option.title}</strong>
          <small>{option.description}</small>
          {selected === option.value && <mark>Seçili</mark>}
        </button>
      ))}
    </div>
  );
}
