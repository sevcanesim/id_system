type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: number };
export type RateLimitOptions = { key: string; limit: number; windowMs: number; now?: number };

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Local fallback for development and for explicitly permitted degraded mode. */
export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 5_000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }

  return { allowed: bucket.count <= limit, limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

function redisKey(key: string): string {
  return `yenomi:ratelimit:${key.replace(/[^a-zA-Z0-9:_-]/g, "_")}`;
}

async function upstashCommand(command: unknown[]): Promise<unknown> {
  if (!upstashUrl || !upstashToken) throw new Error("UPSTASH_NOT_CONFIGURED");
  const response = await fetch(upstashUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${upstashToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`UPSTASH_HTTP_${response.status}`);
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error("UPSTASH_COMMAND_FAILED");
  return payload.result;
}

/**
 * Distributed fixed-window limiter for production. INCR + TTL repair execute atomically in Redis.
 * In development, or when Redis is unavailable, it falls back to the local limiter.
 */
export async function consumeDistributedRateLimit({ key, limit, windowMs, now = Date.now() }: RateLimitOptions): Promise<RateLimitResult> {
  if (!upstashUrl || !upstashToken) return consumeRateLimit(key, limit, windowMs, now);

  const keyName = redisKey(key);
  try {
    const script = "local count=redis.call('INCR',KEYS[1]); local ttl=redis.call('PTTL',KEYS[1]); if ttl < 0 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); ttl=tonumber(ARGV[1]); end; return {count,ttl}";
    const result = await upstashCommand(["EVAL", script, 1, keyName, windowMs]);
    const tuple = Array.isArray(result) ? result : [];
    const count = Number(tuple[0]);
    const ttl = Number(tuple[1]);
    if (!Number.isFinite(count) || count < 1) throw new Error("UPSTASH_INVALID_RESULT");
    const safeTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs;
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + safeTtl,
    };
  } catch (error) {
    // Availability is preferred over a site-wide outage; local limiting still provides protection.
    console.error("Distributed rate limit unavailable", error instanceof Error ? error.message : "UNKNOWN");
    return consumeRateLimit(key, limit, windowMs, now);
  }
}

export function requestIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}
