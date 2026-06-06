# 🎯 Chinese Mission

> **Learn Chinese by *doing* things, not memorizing flashcards.** Order coffee. Book a hotel. Make a friend. Each "mission" is a real-world task you complete by actually talking to an AI — in Chinese — with pinyin, word-by-word gloss, and voice the whole way.

**English | [中文](#中文)**

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/chinese-mission)](https://github.com/shengdabai/chinese-mission/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/chinese-mission?style=social)](https://github.com/shengdabai/chinese-mission/stargazers)
[![Follow @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

**[▶ Try the live demo](https://chinese-mission.vercel.app)**

---

## Why

Most apps teach you *about* Chinese — isolated words, grammar tables, streaks. Then you land in a real café and freeze, because you've never had to *use* the language under pressure.

Chinese Mission flips that. You're dropped into a scenario with a goal, and the only way out is to communicate. An AI plays the barista, the receptionist, the new acquaintance. You read, speak, get unstuck with adaptive hints, and walk away with a debrief of what worked and what to fix.

Built by a Chinese teacher with 6000+ students — designed around how people *actually* break into a language.

## What it is

A task-based immersive Chinese learning platform: 26 missions across 6 real-life scenarios, an AI dialogue partner, and a full scaffolding layer (pinyin, gloss, hints, voice) so beginners can attempt real conversations from day one. Runs in the browser and ships as a native iOS app via Capacitor.

## ✨ Features

- **Mission-based learning** — complete practical tasks in simulated scenarios: café, restaurant, hotel, travel, social, work
- **AI dialogue engine** — converse with an NPC powered by any OpenAI-compatible API (OpenAI, DeepSeek, Claude via proxy)
- **Works without an API key** — a built-in rule-based engine keeps the app fully usable offline / unconfigured
- **Gloss line system** — every Chinese sentence is split into chunks with pinyin, literal gloss, and natural English
- **Adaptive hints** — multi-level scaffolding (keywords → half-sentence → full reference) so you're never truly stuck
- **Voice input & output** — push-to-talk speech recognition and text-to-speech for pronunciation practice
- **Warmup drills** — quick pattern practice before each mission to build confidence
- **Debrief & review** — post-mission analysis with strengths, corrections, and transfer patterns to apply elsewhere
- **Phrasebook** — save vocabulary from completed missions and review it later
- **Progress profiles** — track performance across scenarios with a skill profile
- **Native iOS app** — wrapped with Capacitor for a real on-device experience

## 🧱 Tech stack

- **Framework** — Next.js 16 (App Router)
- **Language** — TypeScript
- **Styling** — Tailwind CSS 4
- **AI** — OpenAI-compatible chat completions API
- **Voice** — Web Speech API (browser) + Capacitor Speech Recognition (iOS)
- **Mobile** — Capacitor (iOS)

## 🚀 Quick start

**Prerequisites:** Node.js 18+ and npm (or bun).

```bash
# 1. Install dependencies
npm install

# 2. Configure your AI API (optional — see below)
cp .env.example .env.local
```

Edit `.env.local`:

```
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
USE_RULE_ENGINE=false
```

> No API key? No problem. The app runs on its built-in rule-based engine out of the box. Set `USE_RULE_ENGINE=true` to force rule mode even when a key is present.

```bash
# 3. Start the dev server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

```bash
# Production build
npm run build
npm start
```

## 📖 Usage

1. **Onboard** — pick your level and learning style.
2. **Choose a mission** — e.g. *order a hot latte* in the café scenario.
3. **Warm up** — run a quick pattern drill.
4. **Chat** — talk to the AI NPC in Chinese to complete the task. Tap any line for pinyin + gloss; use hints if you stall; speak or type.
5. **Debrief** — review your score, strengths, corrections, and transfer patterns.
6. **Save & track** — bank new phrases to your phrasebook and watch your profile grow.

## 🗺️ Status

Actively developed and **live in production** at [chinese-mission.vercel.app](https://chinese-mission.vercel.app). Web app is fully functional; iOS build (Capacitor) is wired up. Built in public — feedback and ideas welcome.

## 🤝 Connect

If this resonates, the best way to support it is to **[⭐ Star this repo](https://github.com/shengdabai/chinese-mission)** and **[Follow @shengdabai](https://github.com/shengdabai)** — I build AI + Chinese-teaching tools in public, and stars genuinely help me decide what to build next.

**More tools in the same family:**
- [hsk-prep-platform](https://github.com/shengdabai/hsk-prep-platform) — structured HSK exam preparation
- [LinguaLens](https://github.com/shengdabai/LinguaLens) — language learning through a different lens
- [ChineseThinking](https://github.com/shengdabai/ChineseThinking) — learn to *think* in Chinese, not just translate

## License

No license file yet — all rights reserved by the author. If you'd like to use or build on this, please reach out.

---

# 中文

# 🎯 Chinese Mission（中文使命）

> **学中文,靠"做事",不靠背单词卡。** 点咖啡、订酒店、交朋友——每个"任务"都是一件真实的事,你必须真的用中文跟 AI 对话才能完成,全程配拼音、逐词注释和语音。

**[English](#-chinese-mission) | 中文**

[![最近提交](https://img.shields.io/github/last-commit/shengdabai/chinese-mission)](https://github.com/shengdabai/chinese-mission/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/chinese-mission?style=social)](https://github.com/shengdabai/chinese-mission/stargazers)
[![关注 @shengdabai](https://img.shields.io/github/followers/shengdabai?style=social)](https://github.com/shengdabai)

**[▶ 体验在线 Demo](https://chinese-mission.vercel.app)**

---

## 为什么做它

大多数 App 教的是"关于中文的知识"——孤立的词、语法表、连续打卡。可一旦真站在咖啡馆里,你还是会愣住,因为你从没在真实压力下"用过"它。

Chinese Mission 反其道而行。你被放进一个有目标的场景,唯一的出路就是把话说清楚。AI 扮演咖啡师、前台、新认识的朋友;你边读边说,卡住时用自适应提示解围,结束后拿到一份复盘——哪里做得好,哪里要改。

由一位拥有 6000+ 学员的中文老师打造,围绕"人真正破冰一门语言"的方式设计。

## 它是什么

一个任务驱动的沉浸式中文学习平台:6 大真实场景下的 26 个任务、一个 AI 对话伙伴,以及一整套脚手架(拼音、注释、提示、语音),让初学者从第一天起就能尝试真实对话。支持浏览器运行,并通过 Capacitor 封装为原生 iOS App。

## ✨ 功能特性

- **任务式学习** — 在模拟场景中完成实用任务:咖啡店、餐厅、酒店、旅行、社交、工作
- **AI 对话引擎** — 通过任意 OpenAI 兼容 API(OpenAI、DeepSeek、Claude 代理)驱动 NPC 对话
- **没 API Key 也能用** — 内置规则引擎,未配置时应用照常完整可用
- **逐词注释系统** — 每句中文拆成语块,提供拼音、字面翻译和自然英文
- **自适应提示** — 多级脚手架(关键词 → 半句 → 完整参考),永远不会真的卡死
- **语音输入与输出** — 按住说话识别 + 文字转语音,练发音
- **热身操练** — 每个任务前快速句型练习,建立信心
- **任务复盘** — 完成后给出分析:优势、纠错、可迁移的句型模式
- **词汇本** — 保存已完成任务的词汇,随时复习
- **进度档案** — 跨场景追踪表现,生成技能画像
- **原生 iOS App** — 通过 Capacitor 封装,真机体验

## 🧱 技术栈

- **框架** — Next.js 16(App Router)
- **语言** — TypeScript
- **样式** — Tailwind CSS 4
- **AI** — OpenAI 兼容的聊天补全 API
- **语音** — Web Speech API(浏览器)+ Capacitor 语音识别(iOS)
- **移动端** — Capacitor(iOS)

## 🚀 快速开始

**环境要求:** Node.js 18+ 与 npm(或 bun)。

```bash
# 1. 安装依赖
npm install

# 2. 配置 AI API(可选,见下)
cp .env.example .env.local
```

编辑 `.env.local`:

```
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
USE_RULE_ENGINE=false
```

> 没有 API Key?没关系。应用开箱即用内置规则引擎。即使填了 Key,也可设 `USE_RULE_ENGINE=true` 强制使用规则模式。

```bash
# 3. 启动开发服务器
npm run dev
```

打开 **[http://localhost:3000](http://localhost:3000)**。

```bash
# 生产构建
npm run build
npm start
```

## 📖 使用流程

1. **引导设置** — 选择你的水平和学习偏好。
2. **挑选任务** — 例如咖啡店场景里的*点一杯热拿铁*。
3. **热身** — 跑一段快速句型操练。
4. **对话** — 用中文跟 AI NPC 把任务完成。点任意句子看拼音 + 注释;卡住用提示;可说可打。
5. **复盘** — 查看得分、优势、纠错和可迁移句型。
6. **保存与追踪** — 把新句子存进词汇本,看着档案一点点成长。

## 🗺️ 项目状态

持续开发中,且**已上线生产环境**:[chinese-mission.vercel.app](https://chinese-mission.vercel.app)。Web 端功能完整;iOS(Capacitor)已接通。Build in public——欢迎反馈与想法。

## 🤝 联系与支持

如果它打动了你,最好的支持方式是 **[⭐ Star 本仓库](https://github.com/shengdabai/chinese-mission)** 并 **[关注 @shengdabai](https://github.com/shengdabai)**——我在公开做 AI + 中文教学工具,你的 star 真的会帮我决定下一步做什么。

**同系列的其他工具:**
- [hsk-prep-platform](https://github.com/shengdabai/hsk-prep-platform) — 结构化 HSK 考试备考
- [LinguaLens](https://github.com/shengdabai/LinguaLens) — 换一个视角学语言
- [ChineseThinking](https://github.com/shengdabai/ChineseThinking) — 学会用中文"思考",而非翻译

## 许可证

暂无许可证文件——版权归作者所有。若想使用或在此基础上开发,请先联系我。
