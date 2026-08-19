import type { EditableCardData } from "../app/CardTemplate";

export type CardProfileRow = {
  id: string;
  user_id?: string;
  organization_id?: string | null;
  entitlement_id?: string | null;
  slug: string;
  public_id?: string | null;
  name: string;
  role: string;
  company: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
  location: string | null;
  image_url: string | null;
  bio?: string | null;
  is_published: boolean;
  card_status: "ACTIVE" | "LOST" | "SUSPENDED" | "REFUNDED";
  service_started_at: string | null;
  service_expires_at: string | null;
  grace_ends_at: string | null;
};

export function isCardProfileServiceActive(profile: Pick<CardProfileRow, "service_expires_at" | "grace_ends_at">, now = Date.now()): boolean {
  if (!profile.service_expires_at) return true;
  if (new Date(profile.service_expires_at).getTime() > now) return true;
  return Boolean(profile.grace_ends_at && new Date(profile.grace_ends_at).getTime() > now);
}

export function rowToCardData(profile: CardProfileRow): EditableCardData {
  return {
    name: profile.name ?? "",
    role: profile.role ?? "",
    company: profile.company ?? "",
    phone: profile.phone ?? "",
    whatsapp: profile.whatsapp ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    linkedin: profile.linkedin ?? "",
    instagram: profile.instagram ?? "",
    location: profile.location ?? "",
    image: profile.image_url ?? "",
    bio: profile.bio ?? ""
  };
}

export function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function createVCard(profile: CardProfileRow) {
  const fullName = escapeVCard(profile.name);
  const company = profile.company ? escapeVCard(profile.company) : "";
  const role = escapeVCard(profile.role);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
    `N:${fullName};;;;`,
    company ? `ORG:${company}` : "",
    role ? `TITLE:${role}` : "",
    profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : "",
    profile.whatsapp ? `TEL;TYPE=WHATSAPP:${profile.whatsapp}` : "",
    profile.email ? `EMAIL;TYPE=INTERNET:${profile.email}` : "",
    profile.website ? `URL:${profile.website}` : "",
    profile.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${profile.linkedin}` : "",
    profile.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${profile.instagram}` : "",
    profile.location ? `URL;TYPE=location:${profile.location}` : "",
    `URL;TYPE=profile:https://qr.yenomilabs.com/${profile.slug ? `p/${profile.slug}` : profile.public_id ? `p/${profile.public_id}` : ""}`,
    "END:VCARD"
  ].filter(Boolean);
  return `${lines.join("\r\n")}\r\n`;
}
