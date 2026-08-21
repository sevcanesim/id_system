import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeDistributedRateLimit, consumeRateLimit, resetRateLimitBucketsForTests } from "./rate-limit";

afterEach(() => {
  resetRateLimitBucketsForTests();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("consumeRateLimit", () => {
  it("allows up to the limit then denies", () => {
    const now = 1_700_000_000_000;
    expect(consumeRateLimit("k", 2, 60_000, now).allowed).toBe(true);
    expect(consumeRateLimit("k", 2, 60_000, now).allowed).toBe(true);
    expect(consumeRateLimit("k", 2, 60_000, now).allowed).toBe(false);
  });
});

describe("consumeDistributedRateLimit fail-closed", () => {
  it("denies checkout/auth when Redis is missing in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const result = await consumeDistributedRateLimit({
      key: "checkout:1",
      limit: 12,
      windowMs: 60_000,
      failClosed: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
  });

  it("still degrades to memory in development when Redis is missing", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const result = await consumeDistributedRateLimit({
      key: "dev:1",
      limit: 12,
      windowMs: 60_000,
      failClosed: true,
    });
    expect(result.allowed).toBe(true);
    expect(result.unavailable).toBeUndefined();
  });

  it("denies when Redis is configured but the request fails", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("UPSTASH_DOWN");
    }));
    const result = await consumeDistributedRateLimit({
      key: "checkout:2",
      limit: 12,
      windowMs: 60_000,
      failClosed: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
  });

  it("aborts a hanging Redis call instead of blocking the limiter", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const fetchMock = vi.fn(async (_url: unknown, init?: { signal?: AbortSignal }) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new Error("UPSTASH_DOWN");
    });
    vi.stubGlobal("fetch", fetchMock);
    await consumeDistributedRateLimit({
      key: "checkout:hang",
      limit: 12,
      windowMs: 60_000,
      failClosed: true,
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("degrades to memory on Redis errors when failClosed is off", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("UPSTASH_DOWN");
    }));
    const result = await consumeDistributedRateLimit({
      key: "leads:1",
      limit: 5,
      windowMs: 60_000,
      failClosed: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.unavailable).toBeUndefined();
  });
});
