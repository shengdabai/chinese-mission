import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS, checkBudget, readJsonCapped, resetBudgetsForTest } from "../src/lib/server/request-budget.ts";

const req = (ip, body = "{}") =>
  new Request("https://chinese-mission.vercel.app/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip, "content-length": String(body.length) },
    body,
  });

test("one client is refused after its per-window budget; another client is not", () => {
  resetBudgetsForTest();
  const now = 1_000_000;
  for (let i = 0; i < BUDGETS.chat.perClient; i++) assert.equal(checkBudget("chat", req("1.1.1.1"), now), null);
  const refused = checkBudget("chat", req("1.1.1.1"), now);
  assert.equal(refused?.status, 429);
  assert.equal(checkBudget("chat", req("2.2.2.2"), now), null);
  assert.equal(checkBudget("chat", req("1.1.1.1"), now + BUDGETS.chat.windowMs), null, "a new window starts fresh");
});

test("the instance budget caps all clients together, and refused requests do not use it up", () => {
  resetBudgetsForTest();
  const now = 2_000_000;
  for (let i = 0; i < BUDGETS.chat.perClient * 3; i++) checkBudget("chat", req("9.9.9.9"), now);
  let allowed = BUDGETS.chat.perClient;
  for (let i = 0; allowed < BUDGETS.chat.perInstance + 5; i++) {
    if (checkBudget("chat", req(`10.0.${i >> 8}.${i & 255}`), now) === null) allowed++;
    else break;
  }
  assert.equal(allowed, BUDGETS.chat.perInstance);
  assert.equal(checkBudget("chat", req("3.3.3.3"), now)?.status, 429);
});

test("an oversized body is refused before any budget is used", async () => {
  resetBudgetsForTest();
  const big = JSON.stringify({ text: "x".repeat(BUDGETS.tts.maxBodyBytes) });
  assert.equal(checkBudget("tts", req("4.4.4.4", big))?.status, 413);
  const noLength = new Request("https://x/api/tts", { method: "POST", body: big });
  assert.equal(await readJsonCapped(noLength, "tts"), null);
  assert.deepEqual(await readJsonCapped(req("4.4.4.4", '{"text":"你好"}'), "tts"), { text: "你好" });
});
