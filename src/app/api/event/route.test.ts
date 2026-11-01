// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { resetRateLimits, RATE_LIMITS } from "@/lib/rate-limit";
import { EVENT_PROPS } from "@/lib/events";

const EVENTS = ["cta_click", "trial_start", "paywall_view", "upgrade_click", "result_view", "share_click"];

function req(payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/event", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetRateLimits();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/event accepts the funnel events", () => {
  it("answers 204 with an empty body for every whitelisted event", async () => {
    for (const event of EVENTS) {
      const res = await POST(req({ event }));
      expect(res.status, event).toBe(204);
      expect(await res.text()).toBe("");
    }
    expect(logSpy).toHaveBeenCalledTimes(EVENTS.length);
  });

  it("writes exactly one structured log line: zt_event, props, ts", async () => {
    const before = Date.now();
    const res = await POST(req({ event: "trial_start", props: { mission_id: "m1" } }));
    expect(res.status).toBe(204);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0][0] as string;
    expect(typeof line).toBe("string");
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(Object.keys(parsed).sort()).toEqual(["props", "ts", "zt_event"]);
    expect(parsed.zt_event).toBe("trial_start");
    expect(parsed.props).toEqual({ mission_id: "m1" });
    const ts = Date.parse(parsed.ts);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());
  });

  it("logs props as an empty object when none are sent", async () => {
    await POST(req({ event: "cta_click" }));
    expect(JSON.parse(logSpy.mock.calls[0][0] as string).props).toEqual({});
  });

  it("never logs the caller IP or user agent", async () => {
    await POST(
      req(
        { event: "cta_click", props: { where: "hero" } },
        { "x-forwarded-for": "203.0.113.77", "x-vercel-forwarded-for": "203.0.113.78", "user-agent": "SecretAgent/9.9" },
      ),
    );
    const everything = JSON.stringify(logSpy.mock.calls);
    expect(everything).not.toContain("203.0.113");
    expect(everything).not.toContain("SecretAgent");
  });

  it("accepts every documented property of every event, with a value from its vocabulary", async () => {
    for (const [event, rules] of Object.entries(EVENT_PROPS)) {
      const props = Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, rule instanceof RegExp ? "m12" : rule[0]]));
      const res = await POST(req({ event, props }));
      expect(res.status, `${event} ${JSON.stringify(props)}`).toBe(204);
    }
    expect((await POST(req({ event: "upgrade_click", props: { plan: "premium", source: "pricing" } }))).status).toBe(204);
    expect((await POST(req({ event: "result_view", props: { result: "partial_success", mission_id: "m999" } }))).status).toBe(204);
  });
});

describe("POST /api/event rejects bad input and logs nothing", () => {
  it("answers 400 for events outside the whitelist", async () => {
    for (const event of ["page_view", "CTA_CLICK", "", "cta_click ", "__proto__", 7, null, ["cta_click"]]) {
      const res = await POST(req({ event }));
      expect(res.status, JSON.stringify(event)).toBe(400);
    }
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("answers 400 for malformed bodies", async () => {
    for (const payload of ["{not json", "", "null", "[]", "42", '"cta_click"', {}, { props: { a: "b" } }, { event: "cta_click", extra: 1 }]) {
      const res = await POST(req(payload));
      expect(res.status, JSON.stringify(payload)).toBe(400);
    }
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("answers 400 for more than 5 props", async () => {
    const props = { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6" };
    expect((await POST(req({ event: "cta_click", props }))).status).toBe(400);
  });

  it("answers 400 for a prop value over 40 characters or not a string", async () => {
    for (const props of [{ a: "x".repeat(41) }, { a: 1 }, { a: true }, { a: null }, { a: { b: "c" } }, { a: ["c"] }]) {
      const res = await POST(req({ event: "cta_click", props }));
      expect(res.status, JSON.stringify(props)).toBe(400);
    }
    expect((await POST(req({ event: "cta_click", props: "nope" }))).status).toBe(400);
    expect((await POST(req({ event: "cta_click", props: ["a"] }))).status).toBe(400);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("answers 400 for prop keys that are long or not plain identifiers", async () => {
    for (const key of ["", "A", "has space", "a-b", "k".repeat(25), "1a", "__proto__"]) {
      const props = JSON.parse(`{${JSON.stringify(key)}: "v"}`);
      const res = await POST(req({ event: "cta_click", props }));
      expect(res.status, JSON.stringify(key)).toBe(400);
    }
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("does not take emails, names or user ids", async () => {
    for (const props of [
      { email: "a@b.co" },
      { user_email: "x" },
      { name: "Alice" },
      { username: "alice" },
      { user_id: "u1" },
      { userId: "u1" },
      { uid: "u1" },
      { id: "u1" },
      { phone: "123" },
      { ip: "1.2.3.4" },
      { token: "t" },
      { where: "reach me at bob@example.com" },
    ]) {
      const res = await POST(req({ event: "cta_click", props }));
      expect(res.status, JSON.stringify(props)).toBe(400);
    }
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("keeps mission_id, which is a content id and not a user id", async () => {
    expect((await POST(req({ event: "trial_start", props: { mission_id: "m1" } }))).status).toBe(204);
  });

  it("does not take values outside the event's vocabulary: an address, a name, free text, another event's property", async () => {
    for (const body of [
      { event: "cta_click", props: { where: "203.0.113.99" } },
      { event: "cta_click", props: { where: "Alice" } },
      { event: "result_view", props: { result: "Alice", mission_id: "m1" } },
      { event: "result_view", props: { result: "success", mission_id: "m1 for alice@example.com" } },
      { event: "upgrade_click", props: { plan: "premium", source: "https://example.com/?u=alice" } },
      { event: "trial_start", props: { mission_id: "cafe-01" } },
      { event: "paywall_view", props: { where: "hero" } },
      { event: "share_click", props: { mission_id: "m1" } },
    ]) {
      const res = await POST(req(body));
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/event body size cap", () => {
  it("answers 413 for a body over 1 KB without parsing it", async () => {
    const big = JSON.stringify({ event: "cta_click", props: { a: "x" }, pad: "p".repeat(2000) });
    const res = await POST(req(big));
    expect(res.status).toBe(413);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("accepts a body of exactly 1024 bytes and refuses 1025", async () => {
    const base = JSON.stringify({ event: "cta_click", props: { where: "hero" } });
    const pad = (n: number) => base + " ".repeat(n - Buffer.byteLength(base));
    expect((await POST(req(pad(1024)))).status).toBe(204);
    expect((await POST(req(pad(1025)))).status).toBe(413);
  });

  it("counts bytes, not characters", async () => {
    const wide = JSON.stringify({ event: "cta_click", props: {} }) + "好".repeat(400); // 1200 bytes, 430 chars
    expect((await POST(req(wide))).status).toBe(413);
  });

  it("answers 413 early when Content-Length already says the body is too big", async () => {
    const res = await POST(req({ event: "cta_click" }, { "content-length": "5000" }));
    expect(res.status).toBe(413);
  });
});

describe("POST /api/event rate limit", () => {
  const from = (ip: string) => ({ "x-forwarded-for": ip });

  it("answers 429 with Retry-After once a client passes the per-minute limit, and logs nothing for the blocked call", async () => {
    const { limit } = RATE_LIMITS.event;
    for (let i = 0; i < limit; i++) {
      expect((await POST(req({ event: "cta_click" }, from("203.0.113.10")))).status).toBe(204);
    }
    logSpy.mockClear();
    const res = await POST(req({ event: "cta_click" }, from("203.0.113.10")));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect((await POST(req({ event: "cta_click" }, from("203.0.113.11")))).status).toBe(204);
  });

  it("does not share its budget with /api/chat", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    for (let i = 0; i < 30; i++) checkRateLimit("chat:203.0.113.10", 30, 60_000);
    expect((await POST(req({ event: "cta_click" }, from("203.0.113.10")))).status).toBe(204);
  });
});
