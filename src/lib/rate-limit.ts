/**
 * Per-client sliding-window rate limiter for the public API routes
 * (/api/chat, /api/debrief, /api/tts), which call paid services, and for the
 * /api/event funnel counter, which does not.
 *
 * Best effort only: counters live in this process's memory. On serverless
 * hosting (Vercel) every warm instance keeps its own counters and a cold start
 * resets them, so the real ceiling is roughly limit x instances. That is enough
 * to stop one script looping against one instance; a hard guarantee needs a
 * shared store (Redis/Upstash) or platform firewall rules.
 */
import { NextResponse } from "next/server";

export const RATE_LIMITS = {
  chat: { limit: 30, windowMs: 60_000 },
  debrief: { limit: 10, windowMs: 60_000 },
  tts: { limit: 30, windowMs: 60_000 },
  // Funnel counters (/api/event) call no paid service; the cap only keeps a script from flooding the logs.
  event: { limit: 60, windowMs: 60_000 },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Whole seconds until a slot frees up; 0 when the request was allowed. */
  retryAfterSec: number;
}

/**
 * Upper bound on tracked clients per scope (the part of the key before ":", e.g. "event"), so spoofed headers
 * cannot grow memory without limit, and a flood of clients on one route — /api/event takes any caller — cannot
 * use up the counters of another route. Memory is bounded by scopes x MAX_BUCKETS.
 */
export const MAX_BUCKETS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;
const MAX_KEY_LENGTH = 64; // longest textual IPv6 address is 45 chars

interface Bucket {
  hits: number[]; // timestamps of allowed requests still inside the window, oldest first
  windowMs: number;
}

const buckets = new Map<string, Bucket>();
const liveByScope = new Map<string, number>(); // live buckets per scope, kept in step with `buckets`
let lastSweep = 0;

function scopeOf(key: string): string {
  const colon = key.indexOf(":");
  return colon === -1 ? "" : key.slice(0, colon);
}

function forget(key: string): void {
  buckets.delete(key);
  const scope = scopeOf(key);
  const left = (liveByScope.get(scope) ?? 1) - 1;
  if (left <= 0) liveByScope.delete(scope);
  else liveByScope.set(scope, left);
}

function purgeExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    const newest = bucket.hits[bucket.hits.length - 1];
    if (newest === undefined || newest <= now - bucket.windowMs) forget(key);
  }
}

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  purgeExpired(now);
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    const scope = scopeOf(key);
    if ((liveByScope.get(scope) ?? 0) >= MAX_BUCKETS) purgeExpired(now);
    // Still full of live counters: refuse the new client. Evicting a live counter would reset that client's quota.
    if ((liveByScope.get(scope) ?? 0) >= MAX_BUCKETS) return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(windowMs / 1000) };
    bucket = { hits: [], windowMs };
    buckets.set(key, bucket);
    liveByScope.set(scope, (liveByScope.get(scope) ?? 0) + 1);
  }
  bucket.windowMs = windowMs;
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    // Blocked attempts are not recorded, so hammering does not extend the block.
    const oldest = bucket.hits[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.hits.push(now);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}

/**
 * Client IP for rate-limit keys. On Vercel, x-vercel-forwarded-for is set by the
 * platform and not overwritten by a proxy in front of it, so it wins over
 * x-forwarded-for (https://vercel.com/docs/headers/request-headers).
 * Requests with neither header share one "unknown" bucket (fails closed).
 */
export function clientIp(request: Request): string {
  const first = (name: string) => request.headers.get(name)?.split(",")[0].trim() ?? "";
  const ip = first("x-vercel-forwarded-for") || first("x-forwarded-for");
  return ip ? ip.slice(0, MAX_KEY_LENGTH) : "unknown";
}

/** Returns a 429 response when the caller is over the limit for this route, otherwise null. */
export function rateLimitResponse(request: Request, scope: RateLimitScope): NextResponse | null {
  const { limit, windowMs } = RATE_LIMITS[scope];
  const result = checkRateLimit(`${scope}:${clientIp(request)}`, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}

/** Test helpers. */
export function resetRateLimits(): void {
  buckets.clear();
  liveByScope.clear();
  lastSweep = 0;
}

export function rateLimitBucketCount(): number {
  return buckets.size;
}
