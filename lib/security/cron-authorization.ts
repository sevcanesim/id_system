import { timingSafeEqual } from "node:crypto";

function matchesSecret(provided: string | null, expected: string) {
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Vercel Cron sends Authorization: Bearer $CRON_SECRET. Production refuses if the secret is unset. */
export function authorizeCommerceCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const header = request.headers.get("x-cron-secret");
  return matchesSecret(bearer, secret) || matchesSecret(header, secret);
}
