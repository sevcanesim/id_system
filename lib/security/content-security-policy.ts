function supabaseConnectSources(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return "";
  try {
    const origin = new URL(raw).origin;
    const websocketOrigin = origin.startsWith("https:")
      ? `wss://${new URL(raw).host}`
      : `ws://${new URL(raw).host}`;
    return `${origin} ${websocketOrigin}`;
  } catch {
    return "";
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  options?: { allowUnsafeEval?: boolean },
): string {
  const connectSrc = ["'self'", supabaseConnectSources(), "https://maps.googleapis.com"].filter(Boolean).join(" ");
  const evalSrc = options?.allowUnsafeEval ? " 'unsafe-eval'" : "";
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic' https://www.paytr.com${evalSrc}`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://www.paytr.com",
    "form-action 'self' https://www.paytr.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function createRequestNonce(): string {
  const bytes = crypto.randomUUID();
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return btoa(bytes);
}
