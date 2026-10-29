import { test } from "node:test";
import assert from "node:assert/strict";
import { processUserInput } from "../src/lib/engine/dialogue.ts";
import { getMission, scenarios } from "../src/lib/data/scenarios.ts";

const newSession = (mission) => ({
  id: "offline-test",
  missionId: mission.id,
  status: "in_progress",
  currentState: mission.states[0].code,
  slotsFilledMap: {},
  turns: [],
  hintLevel: 0,
  startedAt: "2026-10-29T00:00:00.000Z",
});

// Use meaningful complete requests, not every warmup (some are partial answers).
const conversations = [
  ["m1", ["我要一杯拿铁", "热的"]],
  ["m2", ["我要一杯柠檬茶", "不加冰"]],
  ["m3", ["买单"]],
  ["m4", ["一份宫保鸡丁", "打包"]],
  ["m5", ["我要去天安门"]],
  ["m6", ["师傅，请开慢一点"]],
  ["m7", ["前面路口停一下"]],
  ["m8", ["请问地铁站在哪里？"]],
  ["m9", ["还有多远？"]],
  ["m10", ["往左走还是往右走？"]],
  ["m11", ["你好", "我叫小明"]],
  ["m12", ["我是美国人"]],
  ["m13", ["我是老师"]],
  ["m14", ["我们加个微信吧"]],
  ["m15", ["一起吃饭吧", "明天晚上有空吗？"]],
  ["m16", ["我喜欢跑步"]],
  ["m17", ["早上好"]],
  ["m18", ["你能帮我一下吗？"]],
  ["m19", ["我们讨论项目进度", "你明天下午有空吗？"]],
  ["m20", ["我今天身体不舒服", "想请个假"]],
];

for (const [id, inputs] of conversations) {
  test(`${id}: offline conversation fills required slots and reaches the terminal state`, () => {
    const mission = getMission(id);
    const session = newSession(mission);
    let response;
    for (const [index, input] of inputs.entries()) {
      response = processUserInput(input, mission, session);
      assert.equal(response.understood, true, input);
      assert.equal(response.taskStatus, index === inputs.length - 1 ? "completed" : "in_progress");
      session.slotsFilledMap = Object.fromEntries(response.slotsFilled.map((slot) => [slot, "filled"]));
      session.currentState = response.currentState;
    }
    assert.deepEqual(response.missingSlots, []);
    assert.equal(response.currentState, mission.states.at(-1).code);
    assert.ok(response.npcReplyCn.length > 0);
  });
}

for (const id of conversations.map(([id]) => id)) {
  test(`${id}: unrelated input does not invent progress`, () => {
    const mission = getMission(id);
    const response = processUserInput("xyz 123", mission, newSession(mission));
    assert.equal(response.taskStatus, "in_progress");
    assert.equal(response.understood, false);
    assert.deepEqual(response.slotsFilled, []);
    assert.deepEqual(response.missingSlots, mission.requiredSlots);
  });
}

test("a drink-only request asks for temperature rather than claiming completion", () => {
  const mission = getMission("m1");
  const response = processUserInput("我要一杯拿铁", mission, newSession(mission));
  assert.equal(response.currentState, "clarify_details");
  assert.deepEqual(response.missingSlots, ["temperature"]);
  assert.match(response.npcReplyCn, /热.*冰/);
});

test("takeaway alone still asks for a food item", () => {
  const mission = getMission("m4");
  const response = processUserInput("打包", mission, newSession(mission));
  assert.equal(response.taskStatus, "in_progress");
  assert.deepEqual(response.missingSlots, ["food_item"]);
  assert.match(response.npcReplyCn, /吃|菜/);
});

test("no-ice requests fill ice preference without leaking unrelated slots", () => {
  const mission = getMission("m2");
  const response = processUserInput("我要一杯柠檬茶，不加冰", mission, newSession(mission));
  assert.equal(response.taskStatus, "completed");
  assert.deepEqual(response.slotsFilled.toSorted(), ["drink_type", "ice_preference"]);
});

test("taxi destination replies do not say the trip has already ended", () => {
  const mission = getMission("m5");
  const response = processUserInput("我要去机场", mission, newSession(mission));
  assert.equal(response.taskStatus, "completed");
  assert.doesNotMatch(response.npcReplyCn, /到了|一路顺风/);
});

for (const [id, input] of [
  ["m1", "wǒ yào yī bēi rè ná tiě"],
  ["m2", "wǒ yào yī bēi níng méng chá, bù jiā bīng"],
  ["m3", "mǎi dān"],
  ["m4", "yī fèn gōng bǎo jī dīng, dǎ bāo"],
  ["m5", "wǒ yào qù tiān ān mén"],
  ["m6", "shī fu, qǐng kāi màn yī diǎn"],
  ["m7", "qián miàn lù kǒu tíng yī xià"],
  ["m1", "I'd like a hot latte"],
  ["m2", "Lemon tea without ice, please"],
  ["m3", "Could I have the bill, please?"],
  ["m4", "Kung pao chicken to go, please"],
  ["m5", "Please go to the airport"],
  ["m6", "Please slow down"],
  ["m7", "Please stop here"],
  ["m8", "qǐng wèn dì tiě zhàn zài nǎ lǐ"],
  ["m9", "hái yǒu duō yuǎn"],
  ["m10", "wǎng zuǒ zǒu hái shì wǎng yòu zǒu"],
  ["m11", "nǐ hǎo, wǒ jiào xiǎo míng"],
  ["m12", "wǒ shì měi guó rén"],
  ["m13", "wǒ shì lǎo shī"],
  ["m14", "wǒ men jiā ge wēi xìn ba"],
  ["m15", "míng tiān wǎn shang yī qǐ chī fàn ba"],
  ["m16", "wǒ xǐ huān pǎo bù"],
  ["m17", "zǎo shang hǎo"],
  ["m18", "nǐ néng bāng wǒ yī xià ma"],
  ["m19", "míng tiān xià wǔ tǎo lùn xiàng mù jìn dù"],
  ["m20", "wǒ shēn tǐ bù shū fu, xiǎng qǐng ge jià"],
  ["m8", "Where is the subway station?"],
  ["m9", "How far is it?"],
  ["m10", "Should I turn left or right?"],
  ["m11", "Hello, my name is Alex"],
  ["m12", "I am from France"],
  ["m13", "I am a teacher"],
  ["m14", "Let's add each other on WeChat"],
  ["m15", "Let's have dinner tomorrow evening"],
  ["m16", "I like running"],
  ["m17", "Good morning"],
  ["m18", "Could you help me?"],
  ["m19", "Let's discuss project progress tomorrow afternoon"],
  ["m20", "I am sick and need a day off"],
]) {
  test(`${id}: supported pinyin/English request: ${input}`, () => {
    const mission = getMission(id);
    const response = processUserInput(input, mission, newSession(mission));
    assert.equal(response.taskStatus, "completed");
    assert.deepEqual(response.missingSlots, []);
    assert.equal(response.normalizedUserCn, input);
  });
}

for (const [id, input] of [
  ["m1", "Where is the steak?"],
  ["m2", "我要一杯柠檬茶，加冰"],
  ["m4", "一份宫保鸡丁，不要打包"],
  ["m5", "去"],
  ["m6", "你好"],
  ["m7", "你好"],
  ["m8", "谢谢你"],
  ["m11", "你好，我叫……"],
  ["m12", "我来中国三个月了"],
  ["m15", "一起吃饭吧"],
  ["m16", "你平时喜欢做什么？"],
  ["m19", "我们约个时间开会吧"],
  ["m19", "你明天下午有空吗？"],
  ["m20", "想请个假"],
]) {
  test(`${id}: does not complete on a partial or opposite request: ${input}`, () => {
    const mission = getMission(id);
    const response = processUserInput(input, mission, newSession(mission));
    assert.equal(response.taskStatus, "in_progress");
    assert.ok(response.missingSlots.length > 0);
  });
}

test('the regression conversations cover every shipped mission', async () => {
  const { scenarios } = await import('../src/lib/data/scenarios.ts');
  assert.deepEqual(
    conversations.map(([id]) => id).toSorted(),
    scenarios.flatMap(scenario => scenario.missions.map(mission => mission.id)).toSorted(),
  );
});

for (const [id, input] of [
  ['m4', "Kung pao chicken, not to go"],
  ['m4', 'gōng bǎo jī dīng, bù yào dǎ bāo'],
  ['m5', '不要去机场'],
  ['m6', "Please don't slow down"],
  ['m7', '不要在这里停'],
  ['m12', '我不是美国人'],
  ['m13', '我不是老师'],
  ['m15', "Let's not have dinner tomorrow"],
  ['m16', "I don't like running"],
  ['m18', '不用帮我'],
  ['m20', '我不需要请假，身体很好'],
]) {
  test(`${id}: explicit negative intent does not complete: ${input}`, () => {
    const mission = getMission(id);
    const response = processUserInput(input, mission, newSession(mission));
    assert.equal(response.taskStatus, 'in_progress');
  });
}

test('decomposed Unicode pinyin and surrounding whitespace preserve the trimmed input', () => {
  const mission = getMission('m1');
  const text = 'wǒ yào yī bēi rè ná tiě'.normalize('NFD');
  const response = processUserInput(`  ${text}  `, mission, newSession(mission));
  assert.equal(response.taskStatus, 'completed');
  assert.equal(response.normalizedUserCn, text);
});

test('empty input reports an error and never advances an empty session', () => {
  for (const [id] of conversations) {
    const mission = getMission(id);
    const response = processUserInput('   ', mission, newSession(mission));
    assert.equal(response.taskStatus, 'in_progress', id);
    assert.equal(response.understood, false, id);
    assert.deepEqual(response.errorTags, ['empty_input'], id);
    assert.deepEqual(response.slotsFilled, [], id);
  }
});

for (const [id] of conversations) {
  test(`${id}: polite greeting is understood without inventing task-specific slots`, () => {
    const mission = getMission(id);
    const response = processUserInput('你好', mission, newSession(mission));
    assert.equal(response.understood, true);
    assert.equal(response.taskStatus, id === 'm17' ? 'completed' : 'in_progress');
    assert.deepEqual(response.slotsFilled, ['m11', 'm17'].includes(id) ? ['greeting'] : []);
  });
}

test('a little project feedback is not a proposed meeting time', () => {
  const mission = getMission('m19');
  const response = processUserInput('这个项目有一点问题', mission, newSession(mission));
  assert.equal(response.taskStatus, 'in_progress');
  assert.deepEqual(response.missingSlots, ['time_proposal']);
});

for (const [id, first, refusal] of [
  ['m15', '一起吃饭吧', '明天晚上没空'],
  ['m19', '我们讨论项目进度', '明天下午没有时间'],
  ['m19', '我们讨论项目进度', "I am not available tomorrow"],
]) {
  test(`${id}: an unavailable day does not complete the proposed arrangement`, () => {
    const mission = getMission(id);
    const session = newSession(mission);
    const partial = processUserInput(first, mission, session);
    session.slotsFilledMap = Object.fromEntries(partial.slotsFilled.map(slot => [slot, 'true']));
    const response = processUserInput(refusal, mission, session);
    assert.equal(response.taskStatus, 'in_progress');
  });
}

test('saying that no leave is requested does not complete sick leave', () => {
  const mission = getMission('m20');
  const response = processUserInput('我生病了，不请假', mission, newSession(mission));
  assert.equal(response.taskStatus, 'in_progress');
  assert.deepEqual(response.missingSlots, ['leave_request']);
});

for (const text of ['我要一杯柠檬茶，不要加冰', 'wo yao yi bei cha, bu yao jia bing']) {
  test(`m2: an explicit request not to add ice: ${text}`, () => {
    const mission = getMission('m2');
    assert.equal(processUserInput(text, mission, newSession(mission)).taskStatus, 'completed');
  });
}

for (const input of [
  '快到了吗？', '还没到了', '还没到', '到了吗', '到了？', '到了 ?',
  'kuài dào le ma?', 'hái méi dào le', 'dào le ma', 'dao le?',
]) {
  test(`m7: an arrival question or negative statement does not request a stop: ${input}`, () => {
    const mission = getMission('m7');
    const response = processUserInput(input, mission, newSession(mission));
    assert.equal(response.taskStatus, 'in_progress');
    assert.deepEqual(response.slotsFilled, []);
    assert.deepEqual(response.missingSlots, ['stop_request']);
  });
}

for (const input of ['到了，就在这儿停', '到了，谢谢', 'dào le, xiè xie', 'daole, xiexie']) {
  test(`m7: an affirmative arrival or explicit stop still completes: ${input}`, () => {
    const mission = getMission('m7');
    assert.equal(processUserInput(input, mission, newSession(mission)).taskStatus, 'completed');
  });
}

for (const input of ['Let me check the menu', 'Please check my order', 'A check of the menu', 'bill', 'checkplease']) {
  test(`m3: an isolated bill/check word does not request payment: ${input}`, () => {
    const mission = getMission('m3');
    const response = processUserInput(input, mission, newSession(mission));
    assert.equal(response.taskStatus, 'in_progress');
    assert.deepEqual(response.slotsFilled, []);
  });
}

for (const input of ['The bill, please', 'Could I have the check?', 'Check, please', 'check please', '买单', '结账']) {
  test(`m3: an explicit bill request completes: ${input}`, () => {
    const mission = getMission('m3');
    assert.equal(processUserInput(input, mission, newSession(mission)).taskStatus, 'completed');
  });
}

test('m17: 嗨 fills the greeting slot as well as being understood as courtesy', () => {
  const mission = getMission('m17');
  const response = processUserInput('嗨', mission, newSession(mission));
  assert.equal(response.understood, true);
  assert.equal(response.taskStatus, 'completed');
  assert.deepEqual(response.slotsFilled, ['greeting']);
});

for (const greeting of ['hen gao xing ren shi ni', 'hěn gāo xìng rèn shi nǐ', 'hengaoxingrenshini', 'hěngāoxìngrènshinǐ']) {
  test(`m11: a pinyin greeting fills only greeting and combines with a later name: ${greeting}`, () => {
    const mission = getMission('m11');
    const session = newSession(mission);
    const first = processUserInput(greeting, mission, session);
    assert.equal(first.understood, true);
    assert.equal(first.taskStatus, 'in_progress');
    assert.deepEqual(first.slotsFilled, ['greeting']);
    assert.deepEqual(first.missingSlots, ['name']);
    session.slotsFilledMap = Object.fromEntries(first.slotsFilled.map(slot => [slot, 'filled']));
    session.currentState = first.currentState;
    assert.equal(processUserInput('我叫小明', mission, session).taskStatus, 'completed');
  });
}

for (const input of ['我做IT的', '我是做IT的']) {
  test(`m13: accepts an IT occupation statement: ${input}`, () => {
    const mission = getMission('m13');
    assert.equal(processUserInput(input, mission, newSession(mission)).taskStatus, 'completed');
  });
}

test('the 60 warmup conversations retain all 54 previously completing cases', () => {
  const incompleteMissions = new Set(['m11', 'm19']);
  let count = 0;
  let completed = 0;
  for (const scenario of scenarios) {
    for (const mission of scenario.missions) {
      for (const language of ['hanzi', 'pinyin', 'naturalEn']) {
        const session = newSession(mission);
        let response;
        for (const pattern of mission.warmupPatterns) {
          response = processUserInput(pattern[language], mission, session);
          session.slotsFilledMap = Object.fromEntries(response.slotsFilled.map(slot => [slot, 'filled']));
          session.currentState = response.currentState;
        }
        count++;
        if (!incompleteMissions.has(mission.id)) {
          assert.equal(response.taskStatus, 'completed', `${mission.id}: ${language}`);
        }
        if (response.taskStatus === 'completed') completed++;
      }
    }
  }
  assert.equal(count, 60);
  assert.ok(completed >= 54, `${completed}/60 completed`);
});
