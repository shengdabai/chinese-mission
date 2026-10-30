// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
  rateLimitBucketCount,
  resetRateLimits,
  MAX_BUCKETS,
} from "./rate-limit";

beforeEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const results = Array.from({ length: 4 }, (_, i) => checkRateLimit("a", 3, 60_000, i));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("slides: only the oldest hit frees a slot when it leaves the window", () => {
    checkRateLimit("a", 3, 60_000, 0);
    checkRateLimit("a", 3, 60_000, 10_000);
    checkRateLimit("a", 3, 60_000, 20_000);

    const blocked = checkRateLimit("a", 3, 60_000, 30_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(30); // oldest hit (t=0) expires at t=60s

    expect(checkRateLimit("a", 3, 60_000, 60_000).allowed).toBe(true); // one slot freed
    const again = checkRateLimit("a", 3, 60_000, 60_001); // a fixed window would have reset fully
    expect(again.allowed).toBe(false);
    expect(again.retryAfterSec).toBe(10); // next oldest hit (t=10s) expires at t=70s
  });

  it("does not count blocked attempts, so hammering does not extend the block", () => {
    checkRateLimit("a", 2, 60_000, 0);
    checkRateLimit("a", 2, 60_000, 1);
    for (let t = 2; t < 50; t++) expect(checkRateLimit("a", 2, 60_000, t).allowed).toBe(false);
    expect(checkRateLimit("a", 2, 60_000, 60_000).allowed).toBe(true);
  });

  it("reports at least 1 second in retryAfterSec", () => {
    checkRateLimit("a", 1, 60_000, 0);
    expect(checkRateLimit("a", 1, 60_000, 59_999).retryAfterSec).toBe(1);
  });

  it("tracks keys independently", () => {
    checkRateLimit("a", 1, 60_000, 0);
    expect(checkRateLimit("a", 1, 60_000, 1).allowed).toBe(false);
    expect(checkRateLimit("b", 1, 60_000, 1).allowed).toBe(true);
  });

  it("drops stale buckets so memory does not grow with every client ever seen", () => {
    for (let i = 0; i < 50; i++) checkRateLimit(`old-${i}`, 5, 1_000, 0);
    expect(rateLimitBucketCount()).toBe(50);
    checkRateLimit("fresh", 5, 1_000, 120_000);
    expect(rateLimitBucketCount()).toBe(1);
  });

  it("caps the number of tracked clients under a flood of distinct keys", () => {
    for (let i = 0; i < MAX_BUCKETS + 25; i++) checkRateLimit(`spoof-${i}`, 5, 60_000, 1);
    expect(rateLimitBucketCount()).toBe(MAX_BUCKETS);
  });

  it("a flood of new keys cannot evict a live counter and reset its quota", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("victim", 5, 60_000, 1);
    expect(checkRateLimit("victim", 5, 60_000, 1).allowed).toBe(false);
    for (let i = 0; i < MAX_BUCKETS + 25; i++) checkRateLimit(`spoof-${i}`, 5, 60_000, 2);
    expect(checkRateLimit("victim", 5, 60_000, 3).allowed).toBe(false);
    // while every slot holds a live counter, a new client is refused rather than let in uncounted
    expect(checkRateLimit("newcomer", 5, 60_000, 3).allowed).toBe(false);
    // once those windows pass, the expired counters make room again
    expect(checkRateLimit("newcomer", 5, 60_000, 60_010).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  const withHeaders = (h: Record<string, string>) => new Request("http://localhost/", { headers: h });

  it("prefers x-vercel-forwarded-for over x-forwarded-for", () => {
    const req = withHeaders({ "x-vercel-forwarded-for": "198.51.100.4", "x-forwarded-for": "203.0.113.9" });
    expect(clientIp(req)).toBe("198.51.100.4");
  });

  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.9");
  });

  it("falls back to a shared bucket when no proxy header is present", () => {
    expect(clientIp(withHeaders({}))).toBe("unknown");
    expect(clientIp(withHeaders({ "x-forwarded-for": " " }))).toBe("unknown");
  });

  it("bounds the key length of an attacker-supplied header", () => {
    expect(clientIp(withHeaders({ "x-forwarded-for": "9".repeat(5000) })).length).toBeLessThanOrEqual(64);
  });
});

describe("rateLimitResponse", () => {
  const from = (ip: string) => new Request("http://localhost/api/chat", { headers: { "x-forwarded-for": ip } });

  it("returns null while under the limit and a 429 with Retry-After once over", async () => {
    for (let i = 0; i < 30; i++) expect(rateLimitResponse(from("203.0.113.1"), "chat")).toBeNull();
    const res = rateLimitResponse(from("203.0.113.1"), "chat");
    expect(res?.status).toBe(429);
    const retryAfter = Number(res?.headers.get("Retry-After"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(await res?.json()).toEqual({ error: expect.stringMatching(/too many requests/i) });
  });

  it("applies 30/min to chat, 10/min to debrief and 30/min to tts, each in its own bucket", () => {
    const ip = from("203.0.113.2");
    for (let i = 0; i < 10; i++) expect(rateLimitResponse(ip, "debrief")).toBeNull();
    expect(rateLimitResponse(ip, "debrief")?.status).toBe(429);

    // debrief being exhausted must not affect the other routes for the same client
    for (let i = 0; i < 30; i++) expect(rateLimitResponse(ip, "tts")).toBeNull();
    expect(rateLimitResponse(ip, "tts")?.status).toBe(429);
    expect(rateLimitResponse(ip, "chat")).toBeNull();
  });
});

describe("per-scope bucket cap", () => {
  it("a flood of clients on one route does not use up another route's counters", () => {
    for (let i = 0; i < MAX_BUCKETS + 25; i++) checkRateLimit(`event:spoof-${i}`, 60, 60_000, 1);
    expect(checkRateLimit("event:one-more", 60, 60_000, 1).allowed).toBe(false);
    expect(checkRateLimit("chat:fresh", 30, 60_000, 1).allowed).toBe(true);
    expect(checkRateLimit("debrief:fresh", 10, 60_000, 1).allowed).toBe(true);
    expect(rateLimitBucketCount()).toBe(MAX_BUCKETS + 2);
  });
});
