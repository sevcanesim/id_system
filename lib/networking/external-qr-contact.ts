export type ExternalContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
};

export type ExternalQrPayload =
  | { kind: "contact"; contact: ExternalContact }
  | { kind: "link"; url: string };

const MAX_QR_VALUE_LENGTH = 4_096;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: string | undefined, maxLength: number) {
  if (!value) return "";
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function contactPayload(contact: ExternalContact): ExternalQrPayload | null {
  const normalized = {
    fullName: cleanText(contact.fullName, 120),
    email: cleanText(contact.email, 254).toLowerCase(),
    phone: cleanText(contact.phone, 40),
    company: cleanText(contact.company, 160),
    position: cleanText(contact.position, 120),
  };

  if (normalized.email && !emailPattern.test(normalized.email)) normalized.email = "";
  if (!Object.values(normalized).some(Boolean)) return null;
  return { kind: "contact", contact: normalized };
}

function parseVCard(value: string) {
  if (!/^BEGIN:VCARD\b/i.test(value)) return null;

  const contact: ExternalContact = {};
  const unfoldedLines = value.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);

  for (const line of unfoldedLines) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;

    const property = line.slice(0, separator).split(";", 1)[0].toUpperCase();
    const propertyValue = line.slice(separator + 1);
    if (property === "FN" && !contact.fullName) contact.fullName = propertyValue;
    if (property === "EMAIL" && !contact.email) contact.email = propertyValue;
    if (property === "TEL" && !contact.phone) contact.phone = propertyValue;
    if (property === "ORG" && !contact.company) contact.company = propertyValue;
    if (property === "TITLE" && !contact.position) contact.position = propertyValue;
  }

  return contactPayload(contact);
}

function parseMeCard(value: string) {
  if (!/^MECARD:/i.test(value)) return null;

  const fields = new Map<string, string>();
  for (const part of value.slice(7).split(";")) {
    const separator = part.indexOf(":");
    if (separator < 1) continue;
    const key = part.slice(0, separator).toUpperCase();
    if (!fields.has(key)) fields.set(key, part.slice(separator + 1));
  }

  const name = fields.get("N");
  return contactPayload({
    fullName: name?.split(",").reverse().join(" "),
    email: fields.get("EMAIL"),
    phone: fields.get("TEL"),
    company: fields.get("ORG"),
    position: fields.get("TITLE"),
  });
}

function parseDirectContact(value: string) {
  if (/^mailto:/i.test(value)) {
    return contactPayload({ email: decodeURIComponent(value.slice(7).split("?", 1)[0]) });
  }

  if (/^tel:/i.test(value)) {
    return contactPayload({ phone: decodeURIComponent(value.slice(4).split("?", 1)[0]) });
  }

  return null;
}

function parseExternalLink(value: string): ExternalQrPayload | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    return { kind: "link", url: url.toString() };
  } catch {
    return null;
  }
}

export function parseExternalQrPayload(rawValue: string): ExternalQrPayload | null {
  const value = rawValue.trim();
  if (!value || value.length > MAX_QR_VALUE_LENGTH) return null;

  return parseVCard(value)
    || parseMeCard(value)
    || parseDirectContact(value)
    || parseExternalLink(value);
}
