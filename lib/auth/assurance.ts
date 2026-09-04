export type AuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

/**
 * Supabase access token carries the current authenticator assurance level.
 * The token is still verified with Supabase before it is trusted; this helper
 * only reads the already verified session's AAL claim for authorization rules.
 */
export function assuranceLevelFromToken(token: string): AuthenticatorAssuranceLevel {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { aal?: unknown };
    return decoded.aal === "aal2" ? "aal2" : decoded.aal === "aal1" ? "aal1" : null;
  } catch {
    return null;
  }
}
