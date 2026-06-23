# chinese-mission

Learn Chinese by doing real-world missions — order coffee, book a hotel — via AI conversation with pinyin, gloss & voice. Next.js + TS.

## Business Context

- **Category:** education product
- **Audience:** learners, teachers, parents, and education operators who need a clearer learning or exam-prep workflow.
- **Repository status:** Public repository. Keep examples, docs, and issues free of credentials, private data, and machine-specific paths.
- **Topics:** ai, capacitor, chinese-learning, conversation, language-learning, mandarin, nextjs, typescript

## What This Project Is For

- Learn Chinese by doing real-world missions — order coffee, book a hotel — via AI conversation with pinyin, gloss & voice. Next.js + TS.
- Give users a concrete learning workflow instead of a loose collection of content.
- Make practice, feedback, review, or recommendation steps easier to repeat.

## Where It Fits

This repository supports productized learning workflows: diagnostic input, guided practice, review loops, and clearer handoff between learner, teacher, and software.

## Technical Overview

- **Primary language:** TypeScript
- **Detected stack:** TypeScript, Node.js, Next.js, React, Tailwind CSS
- **Default branch:** `main`
- **Visibility:** `PUBLIC`
- **License:** MIT License

## Repository Map

- `src`
- `public`
- `docs`
- `.env.example`
- `LICENSE`
- `MISSION_BUILD_LOG.md`
- `README.md`
- `SECURITY.md`
- `capacitor.config.ts`
- `ios`
- `next.config.ts`
- `package.json`

## Quick Start

Use the commands that match the current project state:

```bash
npm install
npm run dev
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

MIT — see [LICENSE](./LICENSE) for details.

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
```

| Command | Purpose |
|---|---|
| `npm install` | Install project dependencies. |
| `npm run dev` | next dev --webpack |
| `npm start` | next start |
| `npm run build` | next build |

## Operating Notes

- Keep real credentials out of the repository. Use local environment files, GitHub repository secrets, or the deployment platform secret manager.
- If a `.env.example` file exists, treat it as documentation only; never commit filled-in `.env` files.
- Before publishing screenshots, demos, or client examples, remove private names, internal paths, account IDs, and API endpoints.
- The `Repository Hygiene` workflow is a lightweight guardrail, not a replacement for product-specific tests.

## Delivery Checklist

- [ ] README describes the user, business outcome, and operating boundary.
- [ ] Setup or preview commands are current and do not rely on private machine state.
- [ ] No real secrets, private user data, or machine-local state are tracked.
- [ ] Screenshots, demos, or sample outputs are safe to share publicly when the repository is public.
- [ ] Product-specific tests or smoke checks are documented before production use.

## Roadmap

- Tighten the fastest path from clone to useful demo.
- Add project-specific screenshots, sample outputs, or a short walkthrough where useful.
- Promote repeated manual steps into scripts, tests, or documented workflows.
- Keep security, privacy, and licensing boundaries explicit as the project evolves.

## Maintainer Notes

Maintained by [Tony Sheng](https://github.com/shengdabai). This README is written as a business-facing handoff: it should help a future collaborator, client, or reviewer understand why the repository exists, how to inspect it, and what must be true before it is reused or shipped.

MIT 协议——详见 [LICENSE](./LICENSE)。
