import { isYenomiTestEmail } from "./production-test-gate";

function emailDomain(email?: string | null): string | undefined {
  if (!email) return undefined;
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : undefined;
}

/** Structured login telemetry. Never include passwords or raw tokens. */
export function logAuthLoginEvent(event: {
  ok: boolean;
  reason: string;
  email?: string | null;
  ip?: string | null;
  userId?: string | null;
}) {
  console.info("auth.login", JSON.stringify({
    ok: event.ok,
    reason: event.reason,
    email_domain: emailDomain(event.email),
    test_email: isYenomiTestEmail(event.email),
    ip: event.ip || undefined,
    user_id: event.userId || undefined,
  }));
}
