import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { getMission } from '../src/lib/data/scenarios.ts';
// Run after npm run build. This smoke test owns and stops its local server.
// Force rule mode and an empty AI key so inherited provider settings cannot spend money.
const root = fileURLToPath(new URL('../', import.meta.url));
assert.ok(existsSync(join(root, '.next/BUILD_ID')), 'Run npm run build before this smoke test.');
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', resolve);
});
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root,
  env: {...process.env, USE_RULE_ENGINE:'true', AI_API_KEY:'', AI_BASE_URL:'http://127.0.0.1:9', NEXT_TELEMETRY_DISABLED:'1'},
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverError;
server.once('error', error => { serverError = error; });
// Drain output without echoing machine-specific paths or inherited app logs.
server.stdout.resume();
server.stderr.resume();
const stopped = new Promise(resolve => server.once('close', resolve));
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (serverError) throw serverError;
    assert.equal(server.exitCode, null, 'Local server exited before becoming ready.');
    try {
      ready = (await fetch(`${base}/icon.svg`, {signal:AbortSignal.timeout(500)})).ok;
    } catch { /* Wait for this test's server to bind. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, 'Local server did not become ready.');
  const cases = [
    ['m1', ['我要一杯拿铁', '热的'], 'wǒ yào yī bēi rè ná tiě', 'A hot latte, please'],
    ['m2', ['我要一杯柠檬茶', '不加冰'], 'wǒ yào yī bēi níng méng chá, bù jiā bīng', 'Lemon tea without ice'],
    ['m3', ['买单'], 'mǎi dān', 'Could I have the bill?'],
    ['m4', ['一份宫保鸡丁', '打包'], 'yī fèn gōng bǎo jī dīng, dǎ bāo', 'Kung pao chicken to go'],
    ['m5', ['我要去天安门'], 'wǒ yào qù tiān ān mén', 'Please go to the airport'],
    ['m6', ['师傅，请开慢一点'], 'shī fu, qǐng kāi màn yī diǎn', 'Please slow down'],
    ['m7', ['前面路口停一下'], 'qián miàn lù kǒu tíng yī xià', 'Please stop here'],
    ['m8', ['请问地铁站在哪里？'], 'qǐng wèn dì tiě zhàn zài nǎ lǐ', 'Where is the subway station?'],
    ['m9', ['还有多远？'], 'hái yǒu duō yuǎn', 'How far is it?'],
    ['m10', ['往左走还是往右走？'], 'wǎng zuǒ zǒu hái shì wǎng yòu zǒu', 'Should I turn left or right?'],
    ['m11', ['你好', '我叫小明'], 'nǐ hǎo, wǒ jiào xiǎo míng', 'Hello, my name is Alex'],
    ['m12', ['我是美国人'], 'wǒ shì měi guó rén', 'I am from France'],
    ['m13', ['我是老师'], 'wǒ shì lǎo shī', 'I am a teacher'],
    ['m14', ['我们加个微信吧'], 'wǒ men jiā ge wēi xìn ba', "Let's add each other on WeChat"],
    ['m15', ['一起吃饭吧', '明天晚上有空吗？'], 'míng tiān wǎn shang yī qǐ chī fàn ba', "Let's have dinner tomorrow evening"],
    ['m16', ['我喜欢跑步'], 'wǒ xǐ huān pǎo bù', 'I like running'],
    ['m17', ['早上好'], 'zǎo shang hǎo', 'Good morning'],
    ['m18', ['你能帮我一下吗？'], 'nǐ néng bāng wǒ yī xià ma', 'Could you help me?'],
    ['m19', ['我们讨论项目进度', '你明天下午有空吗？'], 'míng tiān xià wǔ tǎo lùn xiàng mù jìn dù', "Let's discuss project progress tomorrow afternoon"],
    ['m20', ['我今天身体不舒服', '想请个假'], 'wǒ shēn tǐ bù shū fu, xiǎng qǐng ge jià', 'I am sick and need a day off'],
  ];
  const results = [];
  let caseId = 0;
  for (const [id, chinese, pinyin, english] of cases) {
    for (const [language, inputs] of [['Chinese', chinese], ['pinyin', [pinyin]], ['English', [english]]]) {
      const mission = getMission(id);
      const session = { currentState: mission.states[0].code, slotsFilledMap: {}, turns: [], hintLevel: 0 };
      const headers = {'Content-Type': 'application/json', 'x-real-ip': `127.42.0.${++caseId}`};
      let response;
      for (const [index, userInput] of inputs.entries()) {
        const http = await fetch(`${base}/api/chat`, {signal:AbortSignal.timeout(5000), method:'POST', headers, body:JSON.stringify({missionId:id, userInput, session})});
        assert.equal(http.status, 200);
        response = await http.json();
        assert.equal(response.aiPowered, false, 'AI must be disabled by the local server environment');
        assert.equal(response.understood, true);
        assert.equal(response.taskStatus, index === inputs.length - 1 ? 'completed' : 'in_progress');
        session.currentState = response.currentState;
        session.slotsFilledMap = Object.fromEntries(response.slotsFilled.map(slot => [slot, 'true']));
        session.turns.push({role:'user', rawInput:userInput, understood:response.understood, errorTags:response.errorTags});
        session.turns.push({role:'npc', rawInput:response.npcReplyCn, npcReplyCn:response.npcReplyCn});
      }
      assert.deepEqual(response.missingSlots, []);
      assert.equal(response.currentState, mission.states.at(-1).code);
      const http = await fetch(`${base}/api/debrief`, {signal:AbortSignal.timeout(5000), method:'POST', headers, body:JSON.stringify({missionId:id, session})});
      assert.equal(http.status, 200);
      const debrief = await http.json();
      assert.equal(debrief.aiPowered, false);
      assert.equal(debrief.result, 'success');
      assert.equal(debrief.score, 1);
      results.push({id, language, turns:inputs.length, result:debrief.result, score:debrief.score, aiPowered:debrief.aiPowered});
    }
  }
  console.log(JSON.stringify({conversations:results.length, passed:results.length, failed:0, paidCalls:0}));

} finally {
  server.kill('SIGTERM');
  const timeout = setTimeout(() => server.kill('SIGKILL'), 5000);
  try { await stopped; } finally { clearTimeout(timeout); }
}
