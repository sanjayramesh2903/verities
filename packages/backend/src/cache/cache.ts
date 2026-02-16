import { createHash } from "crypto";

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

export function hashKey(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

// In-memory cache with TTL support
class InMemoryCacheService implements CacheService {
  private store = new Map<string, { value: string; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  destroy() {
    clearInterval(this.cleanupTimer);
  }
}

// Redis cache wrapping ioredis
class RedisCacheService implements CacheService {
  private client: import("ioredis").default;

  constructor(client: import("ioredis").default) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

export async function createCacheService(redisUrl?: string): Promise<CacheService> {
  if (redisUrl) {
    try {
      const Redis = (await import("ioredis")).default;
      const client = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      await client.connect();
      console.log("Connected to Redis cache");
      return new RedisCacheService(client);
    } catch (err) {
      console.warn("Redis connection failed, falling back to in-memory cache:", (err as Error).message);
    }
  }
  console.log("Using in-memory cache");
  return new InMemoryCacheService();
}

// Cache key builders
export const CacheKeys = {
  claimResult: (claimText: string, style: string) => `claim:v1:${hashKey(claimText + style)}`,
  searchResult: (query: string) => `search:v1:${hashKey(query)}`,
  sourceMetadata: (url: string) => `srcmeta:v1:${hashKey(url)}`,
};

export const CacheTTL = {
  CLAIM_RESULT: 7 * 24 * 3600,   // 7 days
  SEARCH_RESULT: 3600,            // 1 hour
  SOURCE_METADATA: 24 * 3600,     // 24 hours
};
