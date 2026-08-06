import type Redis from "ioredis";

import { captureError } from "@/lib/monitoring";

let client: Redis | null = null;
let initialised = false;

/**
 * Redis is optional. Every caller must handle `null`, so the app runs fine
 * without it — you just lose cross-instance caching and rate limiting.
 */
export async function redis(): Promise<Redis | null> {
  if (initialised) return client;
  initialised = true;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const { default: RedisClient } = await import("ioredis");
    client = new RedisClient(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      enableOfflineQueue: false,
    });
    client.on("error", (error) => {
      captureError(error, { scope: "redis" });
    });
  } catch (error) {
    captureError(error, { scope: "redis-init" });
    client = null;
  }

  return client;
}

/** Read-through cache. Falls straight through to `loader` when Redis is absent. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const store = await redis();
  if (!store) return loader();

  try {
    const hit = await store.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (error) {
    captureError(error, { scope: "cache-read", key });
  }

  const value = await loader();

  try {
    await store.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    captureError(error, { scope: "cache-write", key });
  }

  return value;
}

export async function invalidate(...keys: string[]) {
  const store = await redis();
  if (!store || keys.length === 0) return;
  try {
    await store.del(...keys);
  } catch (error) {
    captureError(error, { scope: "cache-invalidate" });
  }
}

/** Delete every key matching a glob, e.g. `menu:*`. */
export async function invalidatePattern(pattern: string) {
  const store = await redis();
  if (!store) return;
  try {
    const keys = await store.keys(pattern);
    if (keys.length) await store.del(...keys);
  } catch (error) {
    captureError(error, { scope: "cache-invalidate-pattern", pattern });
  }
}

export const CACHE_KEYS = {
  menu: (restaurantId: string) => `menu:${restaurantId}`,
  categories: (restaurantId: string) => `categories:${restaurantId}`,
  restaurant: (slug: string) => `restaurant:${slug}`,
} as const;
