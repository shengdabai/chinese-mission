# Chinese Mission iOS Build Log

记录每步操作、验证证据、阻塞与解决。

## 2026-05-08 阶段 1 启动

### Pre-flight 探查
- 项目路径：`/Users/tonysheng/Desktop/项目开发/08-中文教学项目/中文使命-官网/`
- 技术栈：Next.js 16 + React 19 + Tailwind 4 + TS 6
- AI 调用链确认：`/api/chat` 和 `/api/debrief` 都通过 `src/lib/engine/ai-client.ts:callAI` 调 OpenAI 兼容 endpoint，DeepSeek 直接换 BASE_URL/MODEL 即可。`response_format: { type: "json_object" }` — DeepSeek 支持。
- `.env.local` 已存在但仍是占位符。
- **阻塞发现**：项目未初始化 git；Xcode 完整版未装（`xcodebuild` 报 CommandLineTools 错）。

### 决策
- AI 用 DeepSeek (deepseek-chat)
- iOS 封装走 server.url → Vercel（不做静态导出）
- 第三阶段 RevenueCat 推迟

### 1.1 改 .env.local 为 DeepSeek
- BASE_URL=`https://api.deepseek.com/v1`
- MODEL=`deepseek-chat`
- API_KEY 留 `your-deepseek-key-here` 占位，待用户手填
- read-back 验证：✓ 已确认

### 1.2 npm install
- 退出码 0
- 48 包装好（next 16.2.1, react 19.2.4, tailwind 4.2.2 等）
- node_modules 共 35 top-level dirs
- 用时 ~8s

### 等用户操作
1. ✓ DeepSeek key 已填（用户在对话中粘贴了真实 key，已提示风险但用户选择继续；建议日后 rotate）
2. ⚠ Xcode 已装但 active dir 还指向 CommandLineTools —— `sudo xcode-select -s` 命令在 zsh 里被换行截断没成功，需重跑

### 1.3 启 dev server
- 端口 3000 实际被另一个项目「中文思维」占用 → 切到 3100 启动
- `PORT=3100 npm run dev` 后台启动（job bhcm58wmm，覆盖之前的 bgoe0qivi）
- HTTP 200 验证：homepage、icon.svg、favicon.ico 都 OK
- /api/chat smoke test：mission `m1`（cafe），输入"你好"，3.58s 返回中文 NPC reply，slot 识别正确
- ✓ DeepSeek 真实命中（aiPowered:true）
- 注：mission ID 是 m1~m20 + s1~s6，不是 cafe/restaurant 这类语义 ID

### 1.4 Playwright 全流程
- 路径：onboarding(Survival→Totally new→Text First) → /missions/m1/warmup → /missions/m1/chat → 输入"我要一杯热拿铁" → 自动跳 /missions/m1/debrief
- Debrief 显示：Mission Complete · Score 100% · 3 条 Strengths · 3 个 transfer pattern
- 词汇本验证：点 Save 后 /phrasebook 显示"1 expressions saved 我要一杯热拿铁"
- 全程 aiPowered:true（chat + debrief 两条路由都命中 DeepSeek）

### 1.5 console error
1. `favicon.ico 404` ×2 — 修复：新建 `src/app/icon.svg`（红底白"中"字 SVG），Next 16 自动派生 favicon.ico；curl 验证 200
2. `webpack-hmr ws://localhost:3000` ×4 — 是我前面切端口造成的浏览器缓存伪影,非项目 bug,可忽略

### 阶段 1 完成 ✓
所有 web 验证通过，DeepSeek 链路稳定。可以进入阶段 2（部署 + Capacitor 封装）。


