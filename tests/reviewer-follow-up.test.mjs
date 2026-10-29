import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createHintEvidence } from "../src/lib/hint-evidence.ts";
import { normalizeTransferPatterns } from "../src/lib/debrief-patterns.ts";
import { isPhrasebook } from "../src/lib/storage.ts";
import { getMission } from "../src/lib/data/scenarios.ts";
import { createUserTurn, generateDebrief, isMissionComplete } from "../src/lib/engine/dialogue.ts";

test("completion requires every required slot, independent of policy status", () => {
  const mission = getMission("m1");
  assert.equal(isMissionComplete(mission, []), false);
  assert.equal(isMissionComplete(mission, [mission.requiredSlots[0], "unknown"]), false);
  assert.equal(isMissionComplete(mission, mission.requiredSlots), true);
});

test("one hint affects its submitted turn, not the next three independent turns", () => {
  const hints = createHintEvidence();
  hints.view(1);
  const turns = Array.from({ length: 4 }, (_, i) => ({
    ...createUserTurn(`t${i}`, "买单", hints.consume()), understood: true,
  }));
  assert.deepEqual(turns.map((t) => t.hintUsed), [1, 0, 0, 0]);
  const session = { id: "fixture", missionId: "m3", status: "completed", currentState: "complete",
    slotsFilledMap: { payment_request: "true" }, turns, hintLevel: 1, startedAt: "fixture-date" };
  const result = generateDebrief(getMission("m3"), session);
  const independent = generateDebrief(getMission("m3"), {
    ...session, turns: turns.map((turn) => ({ ...turn, hintUsed: 0 })),
  });
  assert.equal(result.score, independent.score - 0.03);
  assert.equal(result.topFixes.some((fix) => fix.before === "Relying on hints frequently"), false);
});

test("reopening a level counts once while a new pre-submit view is current-turn assistance", () => {
  const hints = createHintEvidence();
  hints.view(1);
  hints.view(1);
  assert.equal(hints.usageCount, 1);
  assert.equal(hints.consume(), 1);
  hints.view(1);
  assert.equal(hints.consume(), 1);
  assert.equal(hints.usageCount, 1);
  hints.view(2);
  hints.view(4);
  hints.view(4);
  assert.equal(hints.consume(), 4);
  assert.equal(hints.consume(), 0);
  assert.equal(hints.usageCount, 3);
});

const pattern = { hanzi: "你好", pinyin: "nǐ hǎo", naturalEn: "Hello", chunks: ["你", "好"], gloss: ["you", "good"], level: "A1" };
test("AI patterns normalize unequal and malformed gloss arrays before persistence", () => {
  assert.deepEqual(normalizeTransferPatterns([pattern]), [pattern]);
  for (const partial of [{ gloss: [] }, { chunks: [null] }, { chunks: null }, { gloss: "hello" }]) {
    const [normalized] = normalizeTransferPatterns([{ ...pattern, ...partial }]);
    assert.deepEqual(normalized.chunks, [pattern.hanzi]);
    assert.deepEqual(normalized.gloss, [pattern.naturalEn]);
    assert.equal(isPhrasebook([{ id: "fixture", textCn: normalized.hanzi, gloss: normalized,
      sourceMissionId: "m11", masteryScore: 0.3, savedAt: "fixture-date" }]), true);
  }
  assert.deepEqual(normalizeTransferPatterns([null, {}, { ...pattern, pinyin: 7 }]), []);
  assert.deepEqual(normalizeTransferPatterns({}), []);
});

// Execute actual route code with fixture providers. No environment or network is read.
function route(name, outputs) {
  const source = readFileSync(new URL(`../src/app/api/${name}/route.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const mocks = {
    "next/server": { NextResponse: { json: (value, options) => Response.json(value, options) } },
    "@/lib/engine/ai-client": { isAIConfigured: () => true, parseJSON: JSON.parse,
      callAI: async () => { assert.ok(outputs.length, "unexpected provider call"); return { content: JSON.stringify(outputs.shift()) }; } },
    "@/lib/engine/prompts": { buildPolicyPrompt: () => "fixture", buildNpcPrompt: () => "fixture", buildDebriefPrompt: () => "fixture" },
    "@/lib/engine/dialogue": { detectScript: () => "hanzi", isMissionComplete },
    "@/lib/data/scenarios": { getMission },
    "@/lib/server/request-budget": { checkBudget: () => null, readJsonCapped: (req) => req.json() },
    "@/lib/debrief-patterns": { normalizeTransferPatterns },
  };
  const exports = {};
  new Function("require", "exports", "process", outputText)((name) => {
    assert.ok(name in mocks, `unexpected import: ${name}`);
    return mocks[name];
  }, exports, { env: {} });
  return exports.POST;
}

test("AI chat cannot complete missing slots, and absent NPC reply is serializable", async () => {
  for (const slots of [[], getMission("m1").requiredSlots]) {
    const outputs = [{ understood: true, newly_filled_slots: slots, task_status: "completed", error_tags: [] }, {}];
    const post = route("chat", outputs);
    const result = await (await post({ json: async () => ({ missionId: "m1", userInput: "你好",
      session: { currentState: "greet", slotsFilledMap: {}, turns: [], hintLevel: 0 } }) })).json();
    assert.equal(result.taskStatus, slots.length ? "completed" : "in_progress");
    assert.equal(result.npcReplyCn, "");
    assert.equal(result.npcReplyEn, "");
    assert.equal(outputs.length, 0);
  }
});

test("AI debrief route returns only normalized fixture patterns", async () => {
  const post = route("debrief", [{ result: "success", score: 1, strengths: [], top_fixes: [],
    transfer_patterns: [null, { ...pattern, gloss: [] }] }]);
  const result = await (await post({ json: async () => ({ missionId: "m3",
    session: { turns: [], slotsFilledMap: {}, hintUsageCount: 0 } }) })).json();
  assert.equal(result.aiPowered, true);
  assert.deepEqual(result.transferPatterns, normalizeTransferPatterns([{ ...pattern, gloss: [] }]));
});

// Run real page event handlers with React hooks and browser APIs replaced by fixtures.
function chatPage(responseSlots = []) {
  const hooks = [];
  let cursor = 0;
  const paths = [];
  const saved = new Map();
  const mission = getMission("m1");
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useEffect: () => {},
      useState(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = index === 0 ? mission
          : index === 2 ? [{ id: "opening", role: "npc", rawInput: "你好" }] : initial;
        return [hooks[index], (next) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = { current: initial };
        return hooks[index];
      },
    },
    "next/navigation": { useParams: () => ({ id: mission.id }), useRouter: () => ({ push: (path) => paths.push(path) }) },
    "@/components/ChatBubble": "ChatBubble",
    "@/components/HintSheet": "HintSheet",
    "@/components/PushToTalkButton": "PushToTalkButton",
    "@/lib/hooks/useVoice": { useVoice: () => ({ speak() {}, stopSpeaking() {} }) },
    "@/lib/engine/dialogue": { createUserTurn, isMissionComplete },
    "@/lib/hint-evidence": { createHintEvidence },
  };
  const source = readFileSync(new URL("../src/app/missions/[id]/chat/page.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } });
  const exports = {};
  new Function("require", "exports", "fetch", "localStorage", "setTimeout", "clearTimeout", outputText)(
    (name) => { assert.ok(name in mocks, `unexpected import: ${name}`); return mocks[name]; }, exports,
    async () => Response.json({ understood: true, taskStatus: "completed", slotsFilled: responseSlots,
      currentState: "complete", errorTags: [] }),
    { setItem: (key, value) => saved.set(key, value) },
    (fn) => { fn(); return 0; }, () => {},
  );
  const render = () => { cursor = 0; return exports.default(); };
  const nodes = (node) => !node || typeof node !== "object" ? []
    : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  const text = (node) => node == null ? "" : typeof node !== "object" ? String(node)
    : [node.props?.children].flat(Infinity).map(text).join("");
  const button = (label) => {
    const result = nodes(render()).find((node) => node.type === "button" && text(node).startsWith(label));
    assert.ok(result, `button ${label} is available`);
    return result;
  };
  const submit = async () => {
    nodes(render()).find((node) => node.type === "input").props.onChange({ target: { value: "你好" } });
    await button("Send").props.onClick();
  };
  return { render, nodes, button, submit, paths, saved,
    turns: () => hooks.find((value) => Array.isArray(value) && value.some((t) => t.role === "user")) };
}

test("Try example records assistance without raising the next displayed hint level", async () => {
  const page = chatPage();
  page.button("Try:").props.onClick();
  page.button("Hint (").props.onClick();
  const hint = page.nodes(page.render()).find((node) => node.type === "HintSheet");
  assert.equal(hint.props.level, 1, "the next panel must not expose the full answer");
  await page.submit();
  assert.equal(page.turns().find((t) => t.role === "user").hintUsed, 4);
});

test("chat page does not celebrate incomplete policy output or carry hint evidence forward", async () => {
  const page = chatPage();
  page.button("Hint (").props.onClick();
  page.button("Hide hint").props.onClick();
  page.button("Hint (").props.onClick();
  await page.submit();
  await page.submit();
  assert.deepEqual(page.turns().filter((t) => t.role === "user").map((t) => t.hintUsed), [1, 0]);
  assert.deepEqual(page.paths, []);
  assert.equal(page.saved.size, 0);
});

test("completed chat with no NPC reply persists a valid session and unique hint count", async () => {
  const page = chatPage(getMission("m1").requiredSlots);
  page.button("Hint (").props.onClick();
  page.button("Hide hint").props.onClick();
  page.button("Hint (").props.onClick();
  await page.submit();
  assert.deepEqual(page.paths, ["/missions/m1/debrief"]);
  const session = JSON.parse(page.saved.get("chinese-mission-session-m1"));
  assert.equal(session.hintUsageCount, 1);
  assert.equal(session.turns.at(-1).rawInput, "");
  assert.equal(isMissionComplete(getMission("m1"), session.filledSlots), true);
});
