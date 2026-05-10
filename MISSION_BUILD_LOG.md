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

### 2.1 git init + push GitHub
- secret scan 通过：.env* 全在 .gitignore，无 sk-/ghp_/api_key 漏在源码里
- git init -b main + add 41 files + commit (d18f839 init)
- 远端 shengdabai/chinese-mission **不为空**，已有 2 commits（f7f94b3 Initial commit + e7c6140 fix: mission routing/session persistence/console errors）
- 用户选择 merge：fetch + merge --allow-unrelated-histories
- 36 文件冲突全是 add/add，但 diff --stat 证实**两边内容完全相同**（仅 mode 不同 755 vs 644）
- 批量 `git checkout --theirs` + `git add` 解决全部冲突
- merge commit f493a08 + push 成功
- 远端 main = 本地 HEAD = f493a08

### 2.2 Vercel 部署
- vercel CLI link → tonys-projects-22b9def7/chinese-mission (auto-connected to GitHub)
- 4 env vars (production scope): AI_API_KEY / AI_BASE_URL / AI_MODEL / USE_RULE_ENGINE
- `vercel deploy --prod` 23s build + 38s deploy → https://chinese-mission.vercel.app
- 本地 build sanity check 已先过：11 static + 5 dynamic, 5.3s

### 2.3 线上验证 + 踩坑修复
**初次测试 500**。加 debug patch 后定位两个独立问题：

**Bug 1: DeepSeek model 名废弃**
- `deepseek-chat` → 已不支持，DeepSeek 现要求 `deepseek-v4-pro` 或 `deepseek-v4-flash`
- 改为 `deepseek-v4-flash`（短任务 + 便宜）

**Bug 2: env var 含尾随换行**
- 用 `echo "value" | vercel env add` 写入时 echo 加 `\n`
- DeepSeek 报 "you passed deepseek-v4-flash\n"（后面那个 \n 是关键）
- 修复：删全部 4 个 env，改用 `printf "value"`（无尾换行）重写
- redeploy

**最终验证**：HTTP 200，aiPowered:true，npcReplyCn 中文返回正常

### 2.4 装 Capacitor
- `npm i @capacitor/core @capacitor/cli @capacitor/ios` (87 包，不含 speech-recognition，先做基础)

### 2.5 cap init
- `./node_modules/.bin/cap init "Chinese Mission" "com.zturns.chinesemission" --web-dir www`
- 生成 capacitor.config.ts
- 注：`npx cap` 命令解析失败，要走 `./node_modules/.bin/cap`

### 2.6 server.url 模式
- capacitor.config.ts 改写：server.url=https://chinese-mission.vercel.app, allowNavigation=[chinese-mission.vercel.app, *.vercel.app, api.deepseek.com]
- ios.contentInset=automatic, backgroundColor=#ffffff

### 2.7-8 cap add ios + 权限
- xcode-select active dir 已切到 /Applications/Xcode.app/Contents/Developer (Xcode 26.4.1)
- `cap add ios` 生成 ios/App/ 完整 Xcode project (Capacitor 7 + SPM)
- Info.plist 加 NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription（中文文案）
- `cap sync ios` 通过

### 阶段 2 完成（除真机 build/sign 留给用户）

### 2.9 待用户操作
1. 终端跑：`cd "/Users/tonysheng/Desktop/项目开发/08-中文教学项目/中文使命-官网/ios/App" && open App.xcodeproj`
2. Xcode 打开后：
   - 选 App target → Signing & Capabilities tab
   - Team 下拉选你的 Apple Developer 账号（如果没有先登录 https://developer.apple.com 注册免费账号 7 天 provisioning）
   - Bundle Identifier 默认 `com.zturns.chinesemission`，必要时改成你 Team 下唯一的
3. 顶部 device 选择器：先用 simulator (iPhone 16) 跑一次确认能加载
4. 真机：连 iPhone（USB），Trust This Computer，device 列表选你 iPhone，Build & Run（Cmd+R）
5. App 装到机器上后会要求授权麦克风+语音识别（首次启动时）—— 应该看到中文权限弹窗
6. 验证：app 内走完 onboarding → cafe mission → chat → debrief 一遍

### 阶段 3 RevenueCat — DEFERRED 下次会话再说


