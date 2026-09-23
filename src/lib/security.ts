import { timingSafeEqual } from "crypto";

/**
 * Cron auth — fail closed. Require CRON_SECRET Bearer token.
 * Never trust User-Agent: vercel-cron alone.
 */
export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return timingSafeStringEqual(header, `Bearer ${secret}`);
}

export function timingSafeStringEqual(a: string, b: string) {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/** Simple in-memory rate limit (per serverless isolate). Good enough for abuse dampening. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(options.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { ok: true, remaining: options.limit - 1, retryAfterSec: 0 };
  }
  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSec: 0,
  };
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return (
    forwarded.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
