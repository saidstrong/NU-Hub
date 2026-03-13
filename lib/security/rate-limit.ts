import { Redis } from "@upstash/redis";
import { logSecurityEvent, logWarn } from "@/lib/observability/logger";

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

type RateLimitLogContext = {
  action?: string;
  userId?: string;
  targetId?: string | null;
  requestId?: string;
};

export type CreateRateLimiterOptions = {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
};

export type CreateRateLimiterInput = {
  userId: string;
  targetId?: string | null;
  action?: string;
  requestId?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __nuHubUpstashRedisClient: Redis | null | undefined;
  // eslint-disable-next-line no-var
  var __nuHubRateLimitMissingConfigWarned: boolean | undefined;
}

const DISTRIBUTED_LIMIT_SCRIPT = `
local hits = redis.call("INCR", KEYS[1])
if hits == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { hits, ttl }
`;

function getKeyNamespace(key: string): string {
  return key.split(":").slice(0, 2).join(":") || "unknown";
}

function parseRequestId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function parseInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.floor(parsed);
}

function createAllowedResult(maxHits: number): RateLimitResult {
  return {
    allowed: true,
    retryAfterMs: 0,
    remainingHits: maxHits,
  };
}

function getRedisClient(): Redis | null {
  if (globalThis.__nuHubUpstashRedisClient !== undefined) {
    return globalThis.__nuHubUpstashRedisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    globalThis.__nuHubUpstashRedisClient = null;
    if (!globalThis.__nuHubRateLimitMissingConfigWarned) {
      globalThis.__nuHubRateLimitMissingConfigWarned = true;
      logWarn("security", "rate_limit_fail_open_missing_config", {
        reason: "missing_upstash_config",
        hasUrl: Boolean(redisUrl),
        hasToken: Boolean(redisToken),
        outcome: "fail_open",
      });
    }
    return null;
  }

  globalThis.__nuHubUpstashRedisClient = new Redis({
    url: redisUrl,
    token: redisToken,
  });

  return globalThis.__nuHubUpstashRedisClient;
}

export async function consumeDistributedRateLimit(
  key: string,
  options: RateLimitWindow,
  context: RateLimitLogContext = {},
): Promise<RateLimitResult> {
  const maxHits = Math.max(1, Math.floor(options.maxHits));
  const windowMs = Math.max(1000, Math.floor(options.windowMs));
  const redis = getRedisClient();

  if (!redis) {
    return createAllowedResult(maxHits);
  }

  const requestId = parseRequestId(context.requestId);

  try {
    const response = await redis.eval(
      DISTRIBUTED_LIMIT_SCRIPT,
      [key],
      [String(windowMs)],
    );
    const hits = parseInteger(Array.isArray(response) ? response[0] : undefined, 0);
    const ttlRaw = parseInteger(Array.isArray(response) ? response[1] : undefined, windowMs);
    const ttlMs = ttlRaw > 0 ? ttlRaw : windowMs;
    const allowed = hits <= maxHits;

    if (!allowed) {
      logSecurityEvent("rate_limit_hit", {
        action: context.action ?? "unknown",
        userId: context.userId ?? "unknown",
        targetId: context.targetId ?? null,
        requestId,
        keyNamespace: getKeyNamespace(key),
        retryAfterMs: ttlMs,
      });
      return {
        allowed: false,
        retryAfterMs: ttlMs,
        remainingHits: 0,
      };
    }

    return {
      allowed: true,
      retryAfterMs: 0,
      remainingHits: Math.max(0, maxHits - hits),
    };
  } catch (error) {
    logWarn("security", "rate_limit_fail_open_redis_error", {
      action: context.action ?? "unknown",
      userId: context.userId ?? "unknown",
      targetId: context.targetId ?? null,
      requestId,
      keyNamespace: getKeyNamespace(key),
      outcome: "fail_open",
      error: error instanceof Error ? error.message : String(error),
    });
    return createAllowedResult(maxHits);
  }
}

export function buildRateLimitKey(
  keyPrefix: string,
  userId: string,
  targetId?: string | null,
): string {
  const keyParts = [keyPrefix, userId];

  if (targetId) {
    keyParts.push(targetId);
  }

  return keyParts.join(":");
}

export function createRateLimiter(options: CreateRateLimiterOptions) {
  const windowMs = Math.max(1, Math.floor(options.windowSeconds)) * 1000;
  const maxHits = Math.max(1, Math.floor(options.maxRequests));
  const keyPrefix = options.keyPrefix;

  return async (input: CreateRateLimiterInput): Promise<RateLimitResult> => {
    const key = buildRateLimitKey(keyPrefix, input.userId, input.targetId);
    return consumeDistributedRateLimit(
      key,
      {
        maxHits,
        windowMs,
      },
      {
        action: input.action ?? keyPrefix,
        userId: input.userId,
        targetId: input.targetId,
        requestId: input.requestId,
      },
    );
  };
}

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
