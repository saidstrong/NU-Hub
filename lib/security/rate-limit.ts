import { logSecurityEvent } from "@/lib/observability/logger";

type RateLimitEntry = {
  hits: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
  // eslint-disable-next-line no-var
  var __nuHubRateLimitStore: RateLimitStore | undefined;
}

function getRateLimitStore(): RateLimitStore {
  if (!globalThis.__nuHubRateLimitStore) {
    globalThis.__nuHubRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.__nuHubRateLimitStore;
}

function pruneExpiredEntries(store: RateLimitStore, now: number) {
  // Best-effort cleanup to avoid unbounded memory growth in long-lived runtimes.
  if (store.size < 1000) return;

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

export type RateLimitWindow = {
  maxHits: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  remainingHits: number;
};

export function consumeRateLimit(
  key: string,
  options: RateLimitWindow,
  now = Date.now(),
): RateLimitResult {
  const maxHits = Math.max(1, Math.floor(options.maxHits));
  const windowMs = Math.max(1000, Math.floor(options.windowMs));
  const store = getRateLimitStore();

  pruneExpiredEntries(store, now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      hits: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterMs: 0,
      remainingHits: Math.max(0, maxHits - 1),
    };
  }

  if (existing.hits >= maxHits) {
    const keyNamespace = key.split(":").slice(0, 2).join(":") || "unknown";
    logSecurityEvent("rate_limit_triggered", {
      keyNamespace,
      maxHits,
      windowMs,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    });

    return {
      allowed: false,
      retryAfterMs: Math.max(0, existing.resetAt - now),
      remainingHits: 0,
    };
  }

  existing.hits += 1;
  store.set(key, existing);

  return {
    allowed: true,
    retryAfterMs: 0,
    remainingHits: Math.max(0, maxHits - existing.hits),
  };
}
