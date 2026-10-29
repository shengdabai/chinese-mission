import { test } from "node:test";
import assert from "node:assert/strict";
import { safeParseJSON } from "../src/lib/utils.ts";
import { isStoredUser, isStringArray, isPhrasebook, isStoredSession, updateStoredArray, completedMissionIds, readPhrasebook, updatePhrasebook } from "../src/lib/storage.ts";

function stored(value) {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => JSON.stringify(value) };
}

for (const value of [null, {}, "not an array", 1]) {
  test(`valid JSON with wrong collection shape falls back: ${JSON.stringify(value)}`, () => {
    stored(value);
    assert.deepEqual(safeParseJSON("fixture", [], Array.isArray), []);
  });
}

test("storage denied and invalid JSON are safe to read", () => {
  globalThis.localStorage = { getItem: () => { throw new Error("denied"); } };
  assert.deepEqual(safeParseJSON("fixture", [], Array.isArray), []);
  globalThis.localStorage = { getItem: () => "{" };
  assert.deepEqual(safeParseJSON("fixture", [], Array.isArray), []);
});

test("only complete supported learning setups can enter missions/profile", () => {
  assert.equal(isStoredUser({ goal: "social", level: "A1", mode: "text" }), true);
  for (const value of [null, [], {}, { goal: "social" }, { goal: "social", level: "B2", mode: "text" }]) {
    assert.equal(isStoredUser(value), false);
  }
});

test("duplicate and unknown mission IDs cannot inflate profile completion", () => {
  assert.deepEqual(completedMissionIds(["m1", "m1", "unknown", "m2"], ["m1", "m2"]), ["m1", "m2"]);
});

const phrase = {
  id: "fixture", textCn: "你好", sourceMissionId: "m11", masteryScore: 0.3, savedAt: "fixture-date",
  gloss: { hanzi: "你好", pinyin: "nǐ hǎo", naturalEn: "Hello", chunks: ["你", "好"], gloss: ["you", "good"] },
};

test("phrasebook validates entries and nested gloss arrays before rendering", () => {
  assert.equal(isPhrasebook([phrase]), true);
  for (const value of [null, {}, [null], ["hello"], [{ ...phrase, masteryScore: "0.3" }],
    [{ ...phrase, gloss: null }], [{ ...phrase, gloss: { ...phrase.gloss, chunks: [null] } }],
    [{ ...phrase, gloss: { ...phrase.gloss, gloss: [] } }]]) assert.equal(isPhrasebook(value), false);
  assert.equal(isStringArray(["m1", 2]), false);
});

const turn = { id: "t1", role: "user", rawInput: "你好", timestamp: "fixture-date", hintUsed: 1, detectedScript: "hanzi" };
test("session validation protects debrief array operations and hint evidence", () => {
  assert.equal(isStoredSession({ turns: [turn], filledSlots: ["greeting"] }), true);
  for (const value of [null, {}, { turns: [null], filledSlots: [] }, { turns: [], filledSlots: [null] },
    { turns: [{ ...turn, errorTags: {} }], filledSlots: [] },
    { turns: [{ ...turn, hintUsed: -1 }], filledSlots: [] }]) assert.equal(isStoredSession(value), false);
});

test("updates preserve corrupt collection bytes and do not call setItem", () => {
  for (const raw of ["{", "null", "{}", '[null]']) {
    let writes = 0;
    globalThis.localStorage = { getItem: () => raw, setItem: () => { writes++; } };
    assert.equal(updateStoredArray("fixture", isPhrasebook, (items) => [...items, phrase]), false);
    assert.equal(writes, 0);
  }
});

test("updates read the latest collection, preserve valid entries and handle blocked writes", () => {
  let raw = JSON.stringify([phrase]);
  globalThis.localStorage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  assert.equal(updateStoredArray("fixture", isPhrasebook, (items) => [...items, { ...phrase, id: "second" }]), true);
  assert.equal(JSON.parse(raw).length, 2);
  globalThis.localStorage.setItem = () => { throw new Error("full"); };
  assert.equal(updateStoredArray("fixture", isPhrasebook, () => []), false);
  assert.equal(JSON.parse(raw).length, 2);
  globalThis.localStorage = { getItem: () => null, setItem: (_key, value) => { raw = value; } };
  assert.equal(updateStoredArray("fixture", isStringArray, () => ["m1"]), true);
  assert.deepEqual(JSON.parse(raw), ["m1"]);
});

test("one bad entry cannot hide a good entry or block saves and deletes", () => {
  const bad = { ...phrase, id: "bad", gloss: { ...phrase.gloss, gloss: [] }, extra: "keep" };
  let raw = JSON.stringify([bad, phrase]);
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  assert.deepEqual(readPhrasebook(), [phrase]);
  assert.equal(updatePhrasebook((items) => [...items, { ...phrase, id: "new" }]), true);
  assert.deepEqual(JSON.parse(raw), [bad, phrase, { ...phrase, id: "new" }]);
  assert.equal(readPhrasebook().length, 2, "profile and phrasebook count only valid entries");
  assert.equal(updatePhrasebook((items) => items.filter((item) => item.id !== phrase.id)), true);
  assert.deepEqual(JSON.parse(raw), [bad, { ...phrase, id: "new" }]);
  assert.equal(updatePhrasebook(() => []), true);
  assert.deepEqual(JSON.parse(raw), [bad]);
});

test("phrasebook writes preserve malformed containers and reject invalid new entries", () => {
  for (const value of ["{", "null", "{}", JSON.stringify([phrase])]) {
    let raw = value;
    globalThis.localStorage = { getItem: () => raw, setItem: (_key, next) => { raw = next; } };
    assert.equal(updatePhrasebook(() => [null]), false);
    assert.equal(raw, value);
  }
  globalThis.localStorage = { getItem: () => "[]", setItem: () => { throw new Error("full"); } };
  assert.equal(updatePhrasebook(() => [phrase]), false);
});

test("legacy NPC turns may omit reply text; user and system inputs remain required", () => {
  const npc = { id: "npc", role: "npc", timestamp: "fixture-date" };
  assert.equal(isStoredSession({ turns: [turn, npc], filledSlots: ["greeting"] }), true);
  for (const role of ["user", "system"]) {
    assert.equal(isStoredSession({ turns: [{ ...npc, role }], filledSlots: [] }), false);
  }
});
