import { Redis } from "ioredis";
import { env } from "../config/env";

let redis: Redis | null = null;

export function getRedis(): Redis {
    if (!redis) {
        redis = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: false,
        });
    }
    return redis;
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}

/**
 * Cache a JSON-serializable value in Redis with a TTL.
 */
export async function setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    const r = getRedis();
    await r.setex(key, ttlSeconds, JSON.stringify(value));
}

/**
 * Retrieve a JSON value from Redis.
 */
export async function getCache<T>(key: string): Promise<T | null> {
    const r = getRedis();
    const data = await r.get(key);
    if (!data) return null;
    try {
        return JSON.parse(data) as T;
    } catch {
        return null; // Ignore invalid JSON cache
    }
}
