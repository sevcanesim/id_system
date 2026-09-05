function supabaseConnectSources(): string {
  const hosted = "https://*.supabase.co wss://*.supabase.co";
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return hosted;
  try {
    const origin = new URL(raw).origin;
    if (origin.endsWith(".supabase.co")) return hosted;
    const websocketOrigin = origin.startsWith("https:")
      ? `wss://${new URL(raw).host}`
      : `ws://${new URL(raw).host}`;
    return `${hosted} ${origin} ${websocketOrigin}`;
  } catch {
    return hosted;
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  options?: { allowUnsafeEval?: boolean },
): string {
  const connectSrc = `'self' ${supabaseConnectSources()} https://maps.googleapis.com`;
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
