// The production path: /api/chat with a configured model. The model is a recorded fetch
// so the test can fail when parseJSON, slot merging or the response mapping break.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore, setQuotaStoreForTest } from "../src/lib/server/quota-store.ts";
import { scenarios } from "../src/lib/data/scenarios.ts";
import { POST } from "../src/app/api/chat/route.ts";

const mission = scenarios[0].missions[0];
const requiredSlot = mission.requiredSlots[0];
const session = { currentState: "start", slotsFilledMap: {}, turns: [], hintLevel: 0 };

const policyReply = {
  understood: true,
  user_intent_cn: "我要一杯拿铁",
  user_intent_en: "I want a latte",
  newly_filled_slots: [requiredSlot, "not-a-slot-of-this-mission"],
  next_act: "confirm",
  next_state: "confirming",
  task_status: "in_progress",
  error_tags: [],
  hint_level_recommended: 0,
};
const npcReply = { reply_cn: "好的，一杯拿铁。", reply_en: "Sure, one latte.", emotion: "friendly" };

function modelResponding(bodies) {
  let i = 0;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const content = bodies[Math.min(i, bodies.length - 1)];
    i += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return calls;
}

function req(payload) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "7.7.7.7" },
    body: JSON.stringify(payload),
  });
}

const realFetch = globalThis.fetch;
const realError = console.error;

beforeEach(() => {
  setQuotaStoreForTest(new MemoryStore());
  process.env.AI_API_KEY = "test-key";
  process.env.AI_BASE_URL = "https://model.test/v1";
  delete process.env.USE_RULE_ENGINE;
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
  delete process.env.AI_API_KEY;
});

test("AI path: two model calls, slot merge keeps only this mission's slots, reply mapped", async () => {
  const calls = modelResponding([JSON.stringify(policyReply), JSON.stringify(npcReply)]);
  const res = await POST(req({ missionId: mission.id, userInput: "我要一杯拿铁", session }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.aiPowered, true);
  assert.equal(body.npcReplyCn, npcReply.reply_cn);
  assert.equal(body.currentState, "confirming");
  assert.ok(body.slotsFilled.includes(requiredSlot));
  assert.ok(!body.slotsFilled.includes("not-a-slot-of-this-mission"), "unknown slots from the model are dropped");
  assert.equal(calls.length, 2, "policy call + npc call");
  assert.match(calls[0].url, /\/chat\/completions$/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-key");
  assert.ok(!calls[0].init.body.includes("test-key"), "the key never goes into the prompt body");
});

test("AI path: a fenced JSON reply is still parsed", async () => {
  modelResponding(["```json\n" + JSON.stringify(policyReply) + "\n```", JSON.stringify(npcReply)]);
  const res = await POST(req({ missionId: mission.id, userInput: "你好", session }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).understood, true);
});

test("AI path: a non-JSON model reply is a 500 with fallback:true, not a crash or a silent success", async () => {
  modelResponding(["Sorry, I cannot answer in JSON today."]);
  const res = await POST(req({ missionId: mission.id, userInput: "你好", session }));
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.fallback, true);
  assert.equal(body.aiPowered, undefined);
});

test("AI path: all required slots filled flips taskStatus to completed", async () => {
  const policy = { ...policyReply, newly_filled_slots: [...mission.requiredSlots], task_status: "in_progress" };
  modelResponding([JSON.stringify(policy), JSON.stringify(npcReply)]);
  const res = await POST(req({ missionId: mission.id, userInput: "都要", session }));
  const body = await res.json();
  assert.equal(body.taskStatus, "completed");
  assert.deepEqual(body.missingSlots, []);
});

test("AI path is never reached when the budget refuses", async () => {
  setQuotaStoreForTest({ kind: "upstash", take: async () => "limit" });
  const calls = modelResponding([JSON.stringify(policyReply)]);
  const res = await POST(req({ missionId: mission.id, userInput: "你好", session }));
  assert.equal(res.status, 429);
  assert.equal(calls.length, 0, "no provider call after a refusal");
});
