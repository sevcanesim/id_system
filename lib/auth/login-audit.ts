import { createHmac } from "node:crypto";
import { isYenomiTestEmail } from "./production-test-gate";
import { getSupabaseAdminClient } from "../supabase/server-admin";

function emailDomain(email?: string | null): string | undefined {
  if (!email) return undefined;
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : undefined;
}

function auditFingerprint(value?: string | null): string | undefined {
  const secret = process.env.AUTH_LOG_FINGERPRINT_KEY || process.env.ANALYTICS_FINGERPRINT_KEY;
  if (!value || !secret) return undefined;
  return createHmac("sha256", secret).update(value).digest("base64url").slice(0, 24);
}

export async function logAuthLoginEvent(event: {
  ok: boolean;
  reason: string;
  email?: string | null;
  ip?: string | null;
  userId?: string | null;
}) {
  try {
    const { error } = await getSupabaseAdminClient().from("auth_login_events").insert({
      succeeded: event.ok,
      reason: event.reason.toLowerCase().replace(/[^a-z0-9_:-]/g, "_").slice(0, 120) || "unknown",
      email_domain: emailDomain(event.email),
      is_test_identity: isYenomiTestEmail(event.email),
      ip_fingerprint: auditFingerprint(event.ip),
      user_fingerprint: auditFingerprint(event.userId),
    });
    return !error;
  } catch {
    return false;
  }
}
