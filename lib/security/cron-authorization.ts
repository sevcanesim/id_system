import { timingSafeEqual } from "node:crypto";

function sameSecret(provided: string | null, expected: string) {
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authorizeCommerceCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim() || "";
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  return sameSecret(bearer, cronSecret) || sameSecret(request.headers.get("x-cron-secret"), cronSecret);
}
