// In-memory fixed-window rate limiter. The previous implementation reset only when there
// was a >windowMs gap between calls — under continuous load the counter would grow forever.
// This version tracks the *first* request in the current window and resets when that window
// expires, which is the standard fixed-window semantics.

type Entry = { windowStart: number; count: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  existing.count += 1;
  if (existing.count > limit) return false;
  return true;
}

// Best-effort GC. The Map can grow with unique keys (one per IP); we evict any window
// older than 10 minutes whenever we hit 5000 entries — this is fine for our scale.
let lastGc = Date.now();
setInterval(() => {
  if (buckets.size < 5000) return;
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, v] of buckets) if (v.windowStart < cutoff) buckets.delete(k);
  lastGc = Date.now();
}, 60_000).unref?.();

// Helper for endpoints — pulls IP from common forwarding headers so rate-limiting
// works correctly behind nginx/CF without callers having to repeat the boilerplate.
export function clientKey(req: Request, suffix = ""): string {
  const xff = req.headers.get("x-forwarded-for");
  const xri = req.headers.get("x-real-ip");
  const ip = xri || (xff ? xff.split(",")[0].trim() : "127.0.0.1");
  return suffix ? `${ip}:${suffix}` : ip;
}

void lastGc; // referenced to satisfy strict unused-variable lints if enabled
