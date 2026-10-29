# Rule-engine fallback: scope and local verification

The rule engine supports the required slots of all 20 shipped missions in
`src/lib/data/scenarios.ts`. It runs when AI is not configured, when
`USE_RULE_ENGINE=true`, or when the chat page falls back locally after an API
failure. No provider request is needed for these rules.

This is keyword matching, not general language understanding. It recognizes
common Chinese requests, selected plain or tone-marked pinyin, and selected
English requests. Country names, occupations, dishes and hobbies have a finite
vocabulary. Optional-slot coverage is limited. A passing example does not prove
that every paraphrase or correction will be understood.

## Completing each mission

The examples below cover the required slots. Semicolons separate user turns.
Warmup phrases can be partial answers: saying only `打包` must still prompt for a
food item, and `我们约个时间开会吧` must still prompt for the meeting topic.

| Mission | Example user input |
| --- | --- |
| m1 — hot latte | 我要一杯拿铁；热的 |
| m2 — no ice | 我要一杯柠檬茶；不加冰 |
| m3 — bill | 买单 |
| m4 — takeaway | 一份宫保鸡丁；打包 |
| m5 — destination | 我要去天安门 |
| m6 — slow down | 师傅，请开慢一点 |
| m7 — stop here | 前面路口停一下 |
| m8 — subway | 请问地铁站在哪里？ |
| m9 — distance | 还有多远？ |
| m10 — direction | 往左走还是往右走？ |
| m11 — introduction | 你好；我叫小明 |
| m12 — origin | 我是美国人 |
| m13 — occupation | 我是老师 |
| m14 — WeChat | 我们加个微信吧 |
| m15 — invitation | 一起吃饭吧；明天晚上有空吗？ |
| m16 — hobbies | 我喜欢跑步 |
| m17 — colleagues | 早上好 |
| m18 — help | 你能帮我一下吗？ |
| m19 — meeting | 我们讨论项目进度；你明天下午有空吗？ |
| m20 — sick leave | 我今天身体不舒服；想请个假 |

Rules preserve filled slots across turns, ask for the first missing required
slot, and reach the mission's terminal state only when all required slots are
filled. Courtesy such as `你好` is understood without adding a progress slot,
unless greeting is itself required by the mission. Selected explicit negative
requests, such as `不要打包` and `Please don't slow down`, do not complete those
objectives. This is not an exhaustive negation parser or a check of every slot
value against the mission title.

## Repeat the checks

Use the existing lockfile. The following commands were verified with Node.js
24.14.0 and npm; the tests use Node's built-in TypeScript support.

```sh
npm ci --no-audit --no-fund
npm test
./node_modules/.bin/tsc --noEmit
npm run build
node tests/offline-smoke.mjs
```

`npm test` includes the existing server-budget tests plus dialogue regression
cases. The smoke script starts a production server on an available loopback
port, forces `USE_RULE_ENGINE=true`, clears its inherited AI key, and points the
AI base URL at an unused loopback port. It checks Chinese, pinyin and English
conversations for every mission, then checks the rule-based debrief. It stops
its server on success or test failure. It does not request TTS or a remote site.

These checks verify the engine and local HTTP routes. They do not verify
browser layout, voice recognition, TTS quality, iOS execution, configured AI
providers, or production deployment.

## Extending the rules

Add a complete-request example and a partial or unrelated-input example before
adding a mission rule. Multi-slot missions need a multi-turn test. Include
pinyin and English examples only when those forms are implemented. Keep request
budgets and paid-provider orchestration outside rule-engine changes.
