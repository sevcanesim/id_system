import SiteFooter from "../ui/SiteFooter";

type FooterVariant = "default" | "compact" | "how-it-works";

export default function AppFooter({ variant = "default" }: { variant?: FooterVariant } = {}) {
  return <SiteFooter variant={variant} />;
}
