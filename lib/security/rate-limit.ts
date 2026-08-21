type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  unavailable?: boolean;
};
export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
  failClosed?: boolean;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

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

export function resetRateLimitBucketsForTests() {
  buckets.clear();
}

function redisKey(key: string): string {
  return `yenomi:ratelimit:${key.replace(/[^a-zA-Z0-9:_-]/g, "_")}`;
}

async function upstashCommand(redis: { url: string; token: string }, command: unknown[]): Promise<unknown> {
  const response = await fetch(redis.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`UPSTASH_HTTP_${response.status}`);
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error("UPSTASH_COMMAND_FAILED");
  return payload.result;
}

function denyUnavailable(limit: number, windowMs: number, now: number): RateLimitResult {
  return { allowed: false, limit, remaining: 0, resetAt: now + windowMs, unavailable: true };
}

/**
 * Distributed fixed-window limiter for production. INCR + TTL repair execute atomically in Redis.
 * Checkout/auth scopes must fail closed when Redis is missing in production or when Redis errors.
 * Other scopes may still degrade to the local limiter.
 */
export async function consumeDistributedRateLimit({
  key,
  limit,
  windowMs,
  now = Date.now(),
  failClosed = false,
}: RateLimitOptions): Promise<RateLimitResult> {
  const redis = redisConfig();
  if (!redis) {
    if (failClosed && process.env.NODE_ENV === "production") return denyUnavailable(limit, windowMs, now);
    return consumeRateLimit(key, limit, windowMs, now);
  }

  try {
    const keyName = redisKey(key);
    const script = "local count=redis.call('INCR',KEYS[1]); local ttl=redis.call('PTTL',KEYS[1]); if ttl < 0 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); ttl=tonumber(ARGV[1]); end; return {count,ttl}";
    const result = await upstashCommand(redis, ["EVAL", script, 1, keyName, windowMs]);
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
    console.error("Distributed rate limit unavailable", error instanceof Error ? error.message : "UNKNOWN");
    if (failClosed) return denyUnavailable(limit, windowMs, now);
    return consumeRateLimit(key, limit, windowMs, now);
  }
}

export function requestIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")?.trim()
    || "unknown";
}
