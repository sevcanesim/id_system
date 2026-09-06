import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type CorporateLeadPayload = {
  fullName: string;
  email: string;
  company: string;
  employeeCount: string;
  message: string;
};

const PAYLOAD_VERSION = "v1";

function encryptionKey() {
  const secret = process.env.CORPORATE_LEAD_ENCRYPTION_KEY?.trim();
  return secret ? createHash("sha256").update(secret).digest() : null;
}

function associatedData(leadId: string) {
  return Buffer.from(`yenomi:corporate-lead:${leadId}`, "utf8");
}

export function canEncryptCorporateLeads() {
  return encryptionKey() !== null;
}

export function encryptCorporateLeadPayload(leadId: string, payload: CorporateLeadPayload) {
  const key = encryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(associatedData(leadId));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [PAYLOAD_VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptCorporateLeadPayload(leadId: string, encryptedPayload: string | null | undefined): CorporateLeadPayload | null {
  const key = encryptionKey();
  if (!key || !encryptedPayload) return null;
  try {
    const [version, ivValue, tagValue, cipherValue] = encryptedPayload.split(".");
    if (version !== PAYLOAD_VERSION || !ivValue || !tagValue || !cipherValue) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAAD(associatedData(leadId));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const raw = Buffer.concat([decipher.update(Buffer.from(cipherValue, "base64url")), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(raw) as Partial<CorporateLeadPayload>;
    if (
      typeof parsed.fullName !== "string"
      || typeof parsed.email !== "string"
      || typeof parsed.company !== "string"
      || typeof parsed.employeeCount !== "string"
      || typeof parsed.message !== "string"
    ) return null;
    return {
      fullName: parsed.fullName,
      email: parsed.email,
      company: parsed.company,
      employeeCount: parsed.employeeCount,
      message: parsed.message,
    };
  } catch {
    return null;
  }
}
