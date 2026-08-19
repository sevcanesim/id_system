import type { EditableCardData, CardTemplateLink } from "../app/CardTemplate";
import type { Profile } from "../app/data";

export function demoProfileToCardData(profile: Profile): EditableCardData {
  const detailLinks: CardTemplateLink[] = profile.links
    .filter((link) => link.kind !== "save")
    .map((link) => ({
      title: link.title,
      subtitle: link.subtitle,
      href: link.href,
      kind: link.kind === "save" || !link.kind ? "external" : link.kind,
    }));
  const saveLink = profile.links.find((link) => link.kind === "save");

  return {
    name: profile.name,
    role: profile.role,
    company: "",
    phone: profile.phone || "",
    whatsapp: "",
    whatsappHref: profile.whatsapp || detailLinks.find((link) => link.kind === "whatsapp")?.href || "",
    email: profile.email,
    website: "",
    linkedin: profile.linkedin || "",
    instagram: profile.instagram || "",
    location: "",
    image: profile.image,
    links: detailLinks,
    saveHref: saveLink?.href || `/${profile.slug}/vcard`,
  };
}
