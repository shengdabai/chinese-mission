// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { scenarios } from "@/lib/data/scenarios";
import { resetRateLimits } from "@/lib/rate-limit";

const missionId = scenarios[0].missions[0].id;
const req = (payload: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/debrief", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });

beforeEach(() => {
  resetRateLimits();
  vi.stubEnv("USE_RULE_ENGINE", "true"); // never call a real model in tests
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/debrief input boundary", () => {
  it("answers 400 (not 500) for malformed bodies", async () => {
    for (const payload of [
      null,
      { missionId },
      { missionId, session: { turns: "x", slotsFilledMap: {} } },
      { missionId, session: { turns: [null], slotsFilledMap: {} } },
      { missionId, session: { turns: [], slotsFilledMap: null } },
    ]) {
      const res = await POST(req(payload));
      expect(res.status, JSON.stringify(payload)).toBe(400);
    }
  });

  it("still serves a valid request", async () => {
    const res = await POST(
      req({
        missionId,
        session: { turns: [{ role: "user", rawInput: "你好" }], slotsFilledMap: {}, hintUsageCount: 0 },
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/debrief rate limit", () => {
  const valid = {
    missionId,
    session: { turns: [{ role: "user", rawInput: "你好" }], slotsFilledMap: {}, hintUsageCount: 0 },
  };
  const from = (ip: string) => ({ "x-forwarded-for": ip });

  it("answers 429 with Retry-After once a client passes 10 requests a minute", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(req(valid, from("203.0.113.20")))).status).toBe(200);
    }
    const res = await POST(req(valid, from("203.0.113.20")));
    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("keeps other clients unaffected", async () => {
    for (let i = 0; i < 10; i++) await POST(req(valid, from("203.0.113.20")));
    expect((await POST(req(valid, from("203.0.113.20")))).status).toBe(429);
    expect((await POST(req(valid, from("203.0.113.21")))).status).toBe(200);
  });
});
