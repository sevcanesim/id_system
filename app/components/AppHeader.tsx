"use client";
import SiteHeader, { HeaderVariant } from "../ui/SiteHeader";

type HeaderAction = { href: string; label: string; primary?: boolean };
export default function AppHeader({
  actions = [],
  landing = false,
  context,
  variant,
  showDefaultCta = true,
}: {
  context?: string;
  landing?: boolean;
  variant?: HeaderVariant;
  actions?: HeaderAction[];
  showDefaultCta?: boolean;
}) {
  return (
    <SiteHeader
      theme={landing || context === "Ürünler" || context === "Giriş" ? "light" : "dark"}
      variant={variant}
      actions={actions}
      showDefaultCta={showDefaultCta}
    />
  );
}
