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

/**
 * Durable, operator-only diagnostics for failures that must not be exposed to
 * customers. Keep this intentionally narrow: callers may add opaque IDs and
 * small classifications, never provider payloads, e-mail addresses, tokens,
 * addresses, or exception stacks.
 */
export async function recordSystemError(input: SystemErrorInput) {
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("system_error_logs").insert({
      request_id: input.requestId ?? null,
      source: input.source.slice(0, 120),
      error_code: input.errorCode.slice(0, 120),
      message: input.message.slice(0, 500),
      details: input.details ?? {},
      user_id: input.userId ?? null,
      organization_id: input.organizationId ?? null,
    });
    return !error;
  } catch {
    // Observability must never replace or mask the original customer flow.
    return false;
  }
}
