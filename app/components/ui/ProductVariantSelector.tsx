import type { ReactNode } from "react";

export type ProductVariantOption = {
  id: string;
  name: string;
  color?: "BLACK" | "WHITE" | "PURPLE";
  priceDeltaKurus?: number;
};

const swatchClass: Record<NonNullable<ProductVariantOption["color"]>, string> = {
  BLACK: "ds-product-option__swatch--black",
  WHITE: "ds-product-option__swatch--white",
  PURPLE: "ds-product-option__swatch--purple",
};

export function ProductVariantSelector({
  label = "Kart rengi",
  variants,
  value,
  onChange,
  renderPrice,
}: {
  label?: ReactNode;
  variants: readonly ProductVariantOption[];
  value: string;
  onChange: (variantId: string) => void;
  renderPrice?: (variant: ProductVariantOption) => ReactNode;
}) {
  const activeVariants = variants.filter(Boolean);
  if (activeVariants.length < 2) return null;

  return (
    <fieldset className="ds-product-option-group">
      <legend className="ds-product-option-group__label">{label}</legend>
      <div className="ds-product-option-group__options" role="radiogroup" aria-label={typeof label === "string" ? label : "Ürün seçeneği"}>
        {activeVariants.map((variant) => {
          const selected = variant.id === value;
          return (
            <label key={variant.id} className={`ds-product-option${selected ? " ds-product-option--selected" : ""}`}>
              <input
                className="ds-product-option__input"
                type="radio"
                name="product-variant"
                value={variant.id}
                checked={selected}
                onChange={() => onChange(variant.id)}
              />
              {variant.color && <span className={`ds-product-option__swatch ${swatchClass[variant.color]}`} aria-hidden="true" />}
              <span className="ds-product-option__copy">
                <strong>{variant.name}</strong>
                {renderPrice && <small>{renderPrice(variant)}</small>}
              </span>
              <span className="ds-product-option__check" aria-hidden="true">✓</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
