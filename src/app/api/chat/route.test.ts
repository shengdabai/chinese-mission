// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { scenarios } from "@/lib/data/scenarios";
import { resetRateLimits } from "@/lib/rate-limit";

const missionId = scenarios[0].missions[0].id;

function req(payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

const session = { currentState: "start", slotsFilledMap: {}, turns: [], hintLevel: 0 };

beforeEach(() => {
  resetRateLimits();
  vi.stubEnv("USE_RULE_ENGINE", "true"); // never call a real model in tests
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/chat input boundary", () => {
  it("answers 400 (not 500) for malformed bodies", async () => {
    for (const payload of [
      "{not json",
      null,
      { missionId },
      { missionId, userInput: 42, session },
      { missionId, userInput: "你好", session: null },
      { missionId, userInput: "你好", session: { ...session, turns: "x" } },
      { missionId, userInput: "你好", session: { ...session, slotsFilledMap: null } },
      { missionId, userInput: "", session },
    ]) {
      const res = await POST(req(payload));
      expect(res.status, JSON.stringify(payload)).toBe(400);
    }
  });

  it("rejects oversized input before it can reach a paid model", async () => {
    const res = await POST(req({ missionId, userInput: "好".repeat(5000), session }));
    expect(res.status).toBe(400);
    const many = Array.from({ length: 5000 }, () => ({ role: "user", rawInput: "好" }));
    const res2 = await POST(req({ missionId, userInput: "你好", session: { ...session, turns: many } }));
    expect(res2.status).toBe(400);
  });

  it("still serves a valid request", async () => {
    const res = await POST(req({ missionId, userInput: "你好", session }));
    expect(res.status).toBe(200);
    expect((await res.json()).aiPowered).toBe(false);
  });

  it("keeps 404 for unknown missions", async () => {
    const res = await POST(req({ missionId: "__nope__", userInput: "你好", session }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/chat rate limit", () => {
  const valid = { missionId, userInput: "你好", session };
  const from = (ip: string) => ({ "x-forwarded-for": ip });

  it("answers 429 with Retry-After once a client passes 30 requests a minute", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await POST(req(valid, from("203.0.113.10")))).status).toBe(200);
    }
    const res = await POST(req(valid, from("203.0.113.10")));
    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("keeps other clients unaffected and keys on x-vercel-forwarded-for first", async () => {
    for (let i = 0; i < 30; i++) await POST(req(valid, from("203.0.113.10")));
    expect((await POST(req(valid, from("203.0.113.10")))).status).toBe(429);
    expect((await POST(req(valid, from("203.0.113.11")))).status).toBe(200);
    // a spoofed x-forwarded-for cannot dodge the limit when Vercel's own header is present
    const spoofed = { "x-vercel-forwarded-for": "203.0.113.10", "x-forwarded-for": "198.51.100.77" };
    expect((await POST(req(valid, spoofed))).status).toBe(429);
  });

  it("counts malformed requests too, so garbage floods are not free", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await POST(req("{not json", from("203.0.113.12")))).status).toBe(400);
    }
    expect((await POST(req(valid, from("203.0.113.12")))).status).toBe(429);
  });
});
