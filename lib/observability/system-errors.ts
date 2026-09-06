import { getSupabaseAdminClient } from "../supabase/server-admin";

type SystemErrorInput = {
  source: string;
  errorCode: string;
  message: string;
  requestId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  details?: Record<string, string | number | boolean | null>;
};

const SENSITIVE_KEY = /(?:authorization|cookie|email|phone|address|token|secret|password|card|cvv|iban|payload|stack)/i;
const JWT_VALUE = /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LONG_SECRET = /\b[A-Za-z0-9_-]{32,}\b/g;

function diagnosticCode(value: string, fallback: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, "_").slice(0, 120);
  return normalized || fallback;
}

function diagnosticMessage(value: string) {
  return value
    .replace(EMAIL_VALUE, "[redacted-email]")
    .replace(JWT_VALUE, "[redacted-token]")
    .replace(LONG_SECRET, "[redacted-value]")
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function diagnosticDetails(details: SystemErrorInput["details"]) {
  return Object.fromEntries(Object.entries(details ?? {}).map(([key, value]) => [
    key.slice(0, 80),
    SENSITIVE_KEY.test(key) ? "[redacted]" : typeof value === "string" ? diagnosticMessage(value).slice(0, 180) : value,
  ]));
}

export async function recordSystemError(input: SystemErrorInput) {
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("system_error_logs").insert({
      request_id: input.requestId ?? null,
      source: diagnosticCode(input.source, "SYSTEM"),
      error_code: diagnosticCode(input.errorCode, "UNKNOWN"),
      message: diagnosticMessage(input.message),
      details: diagnosticDetails(input.details),
      user_id: input.userId ?? null,
      organization_id: input.organizationId ?? null,
    });
    return !error;
  } catch {
    // Observability must never replace or mask the original customer flow.
    return false;
  }
}
