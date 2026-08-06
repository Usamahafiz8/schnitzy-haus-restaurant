import { ApiException } from "@/lib/errors";
import { clientIp } from "@/lib/api";
import { redis } from "@/lib/cache";

type Bucket = { count: number; resetAt: number };

// Per-instance fallback when Redis isn't configured. Good enough for a single
// node / local development; Redis is what makes the limit real across a fleet.
const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const client = await redis();

  if (client) {
    const redisKey = `ratelimit:${key}`;
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pexpire(redisKey, windowMs);
    }
    const ttl = await client.pttl(redisKey);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + (ttl > 0 ? ttl : windowMs),
    };
  }

  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Throws 429 when the caller has exceeded `limit` requests in `windowMs`. */
export async function enforceRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const result = await rateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
  if (!result.allowed) {
    const seconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new ApiException(
      `Too many requests. Try again in ${Math.max(1, seconds)}s.`,
      429,
      "RATE_LIMITED",
    );
  }
  return result;
}

export const RATE_LIMITS = {
  auth: { limit: 8, windowMs: 60_000 },
  passwordReset: { limit: 4, windowMs: 15 * 60_000 },
  order: { limit: 20, windowMs: 60_000 },
  booking: { limit: 15, windowMs: 60_000 },
  review: { limit: 10, windowMs: 60_000 },
  coupon: { limit: 30, windowMs: 60_000 },
  contact: { limit: 5, windowMs: 10 * 60_000 },
} as const;
