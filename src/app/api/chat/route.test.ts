// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { scenarios } from "@/lib/data/scenarios";

const missionId = scenarios[0].missions[0].id;

function req(payload: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

const session = { currentState: "start", slotsFilledMap: {}, turns: [], hintLevel: 0 };

beforeEach(() => {
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
