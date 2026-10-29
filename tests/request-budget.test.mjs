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

test("a streamed oversized body is cancelled without consuming the rest", async () => {
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(BUDGETS.tts.maxBodyBytes + 1));
      if (pulls === 3) controller.close();
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request("https://fixture.invalid", { method: "POST", body, duplex: "half" });
  assert.equal(await readJsonCapped(request, "tts"), null);
  assert.equal(pulls, 1, "stop reading immediately when the byte budget is exceeded");
  assert.equal(cancelled, true);
});

test("the byte cap accepts exact-length UTF-8 split across arbitrary chunks", async () => {
  const text = JSON.stringify({ text: "你好" });
  const padded = text + " ".repeat(BUDGETS.tts.maxBodyBytes - new TextEncoder().encode(text).length);
  const bytes = new TextEncoder().encode(padded);
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 5) controller.enqueue(bytes.slice(i, i + 5));
      controller.close();
    },
  });
  assert.deepEqual(await readJsonCapped(new Request("https://fixture.invalid", {
    method: "POST", body, duplex: "half",
  }), "tts"), { text: "你好" });
});

test("a disconnected request body is rejected without an unhandled read error", async () => {
  const body = new ReadableStream({ start(controller) { controller.error(new Error("disconnected")); } });
  assert.equal(await readJsonCapped(new Request("https://fixture.invalid", {
    method: "POST", body, duplex: "half",
  }), "tts"), null);
});

test("an already consumed request is rejected without throwing", async () => {
  const request = req("consumed-fixture");
  await request.text();
  assert.equal(await readJsonCapped(request, "tts"), null);
});
