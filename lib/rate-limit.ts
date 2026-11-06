import "server-only";

/**
 * Small in-memory sliding-window rate limiter. Good enough for a single web
 * instance (Render); a multi-instance deploy would move this to Redis or the DB.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - hits[0]!)) / 1000);
    buckets.set(key, hits);
    return { ok: false as const, retryAfterSec };
  }
  hits.push(now);
  buckets.set(key, hits);
  // Opportunistic cleanup so the map can't grow forever.
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return { ok: true as const, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers (Render sets X-Forwarded-For). */
export function clientIp(headers: Headers) {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Per-user limits for sensitive operations (per server instance). */
export const LIMITS = {
  transfer: { limit: 20, windowMs: 60_000 },
  trade: { limit: 30, windowMs: 60_000 },
  deposit: { limit: 10, windowMs: 10 * 60_000 },
  payout: { limit: 5, windowMs: 10 * 60_000 },
  ai: { limit: 12, windowMs: 60_000 },
} as const;

export const TOO_MANY = "You're doing that a lot. Please wait a moment and try again.";

/** True when the user may proceed. */
export function allow(kind: keyof typeof LIMITS, userId: string) {
  const { limit, windowMs } = LIMITS[kind];
  return rateLimit(`${kind}:${userId}`, limit, windowMs).ok;
}
