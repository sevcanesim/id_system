"use client";
import SiteHeader, { HeaderVariant } from "../ui/SiteHeader";

type HeaderAction = { href: string; label: string; primary?: boolean };
export default function AppHeader({
  actions = [],
  variant,
  showDefaultCta = true,
}: {
  variant?: HeaderVariant;
  actions?: HeaderAction[];
  showDefaultCta?: boolean;
}) {
  return <SiteHeader variant={variant} actions={actions} showDefaultCta={showDefaultCta} />;
}
