import { test } from "node:test";
import assert from "node:assert/strict";
import { createUserTurn, generateDebrief } from "../src/lib/engine/dialogue.ts";
import { getMission } from "../src/lib/data/scenarios.ts";

function debrief(text, hint) {
  const mission = getMission("m3");
  return generateDebrief(mission, {
    id: "fixture", missionId: mission.id, status: "completed", currentState: "complete",
    slotsFilledMap: { payment_request: "true" }, hintLevel: hint, startedAt: "fixture-date",
    turns: [{ ...createUserTurn("t1", text, hint), understood: true }],
  });
}

test("hint-assisted turns cannot earn the independent-completion claim", () => {
  const unassisted = debrief("买单", 0);
  for (const hint of [1, 2, 3, 4]) {
    const assisted = debrief("买单", hint);
    assert.equal(assisted.strengths.some((s) => s.includes("without using hints")), false);
    assert.equal(assisted.score, unassisted.score - 0.03);
  }
  assert.equal(unassisted.strengths.some((s) => s.includes("without using hints")), true);
});

test("submitted language evidence drives character strengths and script feedback", () => {
  assert.equal(debrief("买单", 0).strengths.some((s) => s.includes("Chinese characters")), true);
  for (const text of ["mǎi dān", "Bill, please"]) {
    assert.equal(debrief(text, 0).topFixes.some((fix) => fix.type === "script"), true);
  }
});

test("legacy turns with no hint evidence cannot establish independence", () => {
  const turn = { ...createUserTurn("legacy", "买单", 0), understood: true };
  delete turn.hintUsed;
  const result = generateDebrief(getMission("m3"), {
    id: "fixture", missionId: "m3", status: "completed", currentState: "complete",
    slotsFilledMap: { payment_request: "true" }, turns: [turn], hintLevel: 0, startedAt: "fixture-date",
  });
  assert.equal(result.strengths.some((s) => s.includes("without using hints")), false);
});
