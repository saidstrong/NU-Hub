import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "@/lib/security/rate-limit";

describe("rate limit helper", () => {
  it("allows requests until the limit is reached", () => {
    const now = 1_700_000_000_000;
    const key = `test:${now}:allow`;

    const first = consumeRateLimit(key, { maxHits: 2, windowMs: 60_000 }, now);
    const second = consumeRateLimit(key, { maxHits: 2, windowMs: 60_000 }, now + 1);
    const third = consumeRateLimit(key, { maxHits: 2, windowMs: 60_000 }, now + 2);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the configured window", () => {
    const now = 1_800_000_000_000;
    const key = `test:${now}:reset`;

    consumeRateLimit(key, { maxHits: 1, windowMs: 10_000 }, now);
    const blocked = consumeRateLimit(key, { maxHits: 1, windowMs: 10_000 }, now + 1);
    const afterWindow = consumeRateLimit(
      key,
      { maxHits: 1, windowMs: 10_000 },
      now + 10_001,
    );

    expect(blocked.allowed).toBe(false);
    expect(afterWindow.allowed).toBe(true);
  });
});
