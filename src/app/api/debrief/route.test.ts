// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { scenarios } from "@/lib/data/scenarios";

const missionId = scenarios[0].missions[0].id;
const req = (payload: unknown) =>
  new NextRequest("http://localhost/api/debrief", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

beforeEach(() => {
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
