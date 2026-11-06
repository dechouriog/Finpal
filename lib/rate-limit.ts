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
