import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS, checkBudget, readJsonCapped } from "../src/lib/server/request-budget.ts";
import { MemoryStore, setQuotaStoreForTest } from "../src/lib/server/quota-store.ts";

const req = (ip, body = "{}") =>
  new Request("https://chinese-mission.vercel.app/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip, "content-length": String(body.length) },
    body,
  });

beforeEach(() => setQuotaStoreForTest(new MemoryStore()));

test("one client is refused after its per-window budget; another client is not", async () => {
  const now = 1_000_000;
  for (let i = 0; i < BUDGETS.chat.perClient; i++) assert.equal(await checkBudget("chat", req("1.1.1.1"), now), null);
  const refused = await checkBudget("chat", req("1.1.1.1"), now);
  assert.equal(refused?.status, 429);
  assert.equal(refused?.headers.get("Retry-After"), String(BUDGETS.chat.windowMs / 1000));
  assert.equal(await checkBudget("chat", req("2.2.2.2"), now), null);
  assert.equal(await checkBudget("chat", req("1.1.1.1"), now + BUDGETS.chat.windowMs), null, "a new window starts fresh");
});

test("the total budget caps all clients together, and refused requests do not use it up", async () => {
  const now = 2_000_000;
  for (let i = 0; i < BUDGETS.chat.perClient * 3; i++) await checkBudget("chat", req("9.9.9.9"), now);
  let allowed = BUDGETS.chat.perClient;
  for (let i = 0; allowed < BUDGETS.chat.perTotal + 5; i++) {
    if ((await checkBudget("chat", req(`10.0.${i >> 8}.${i & 255}`), now)) === null) allowed++;
    else break;
  }
  assert.equal(allowed, BUDGETS.chat.perTotal);
  assert.equal((await checkBudget("chat", req("3.3.3.3"), now))?.status, 429);
});

test("an oversized body is refused before any budget is used", async () => {
  const big = JSON.stringify({ text: "x".repeat(BUDGETS.tts.maxBodyBytes) });
  assert.equal((await checkBudget("tts", req("4.4.4.4", big)))?.status, 413);
  const noLength = new Request("https://x/api/tts", { method: "POST", body: big });
  assert.equal(await readJsonCapped(noLength, "tts"), null);
  assert.deepEqual(await readJsonCapped(req("4.4.4.4", '{"text":"你好"}'), "tts"), { text: "你好" });
});

test("over-limit is 429, a store that cannot count is 503 — both block provider work", async () => {
  setQuotaStoreForTest({ kind: "upstash", take: async () => "limit" });
  assert.equal((await checkBudget("chat", req("5.5.5.5")))?.status, 429);
  setQuotaStoreForTest({ kind: "upstash", take: async () => "unavailable" });
  const res = await checkBudget("chat", req("5.5.5.5"));
  assert.equal(res?.status, 503);
  assert.equal(res?.headers.get("Retry-After"), "30");
  setQuotaStoreForTest({ kind: "misconfigured", take: async () => "unavailable" });
  assert.equal((await checkBudget("tts", req("6.6.6.6")))?.status, 503);
});
