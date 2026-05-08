# Chinese Mission

An immersive, task-based Chinese language learning platform. Learners complete real-world missions (ordering coffee, booking hotels, making friends) through AI-powered conversations with instant gloss support, pinyin annotation, and voice interaction.

Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Mission-based learning**: Complete practical tasks in simulated real-world scenarios (cafe, restaurant, hotel, travel, social, work)
- **AI dialogue engine**: Chat with an NPC powered by any OpenAI-compatible API (OpenAI, Claude via proxy, DeepSeek, etc.)
- **Rule-based fallback**: Built-in dialogue engine works without AI when no API key is configured
- **Gloss line system**: Every Chinese sentence is broken into chunks with pinyin, literal gloss, and natural English translation
- **Adaptive hints**: Multi-level hint system (keywords -> half-sentence -> full reference) to scaffold learners
- **Voice input/output**: Push-to-talk and text-to-speech support for pronunciation practice
- **Warmup exercises**: Pattern drills before each mission to build confidence
- **Debrief & review**: Post-mission analysis with strengths, corrections, and transfer patterns
- **Phrasebook**: Save and review vocabulary from completed missions
- **User profiles**: Track progress across scenarios with skill profiling

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI-compatible chat completions API
- **Voice**: Web Speech API (browser-native)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```bash
npm install
```

### Environment Setup

Copy the example env file and configure your AI API:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
USE_RULE_ENGINE=false
```

The app works without an AI API key using the built-in rule-based engine. Set `USE_RULE_ENGINE=true` to force rule-based mode.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    onboarding/           # Welcome & user setup
    missions/             # Mission browser
    missions/[id]/        # Individual mission flows
      warmup/             # Pre-mission pattern drills
      chat/               # Main dialogue interaction
      debrief/            # Post-mission review
    phrasebook/           # Saved vocabulary
    profile/              # User profile & progress
    teaching-pipeline/    # Teaching pipeline visualization
    api/                  # API routes (chat, debrief)
  components/             # Reusable UI components
  lib/
    data/                 # Scenario & mission definitions
    engine/               # AI client, dialogue engine, gloss, prompts
    hooks/                # Custom React hooks (voice, etc.)
    types.ts              # TypeScript type definitions
    store.ts              # Client-side state management
```

## License

Private project. All rights reserved.

---

# Chinese Mission (中文)

一个沉浸式、任务驱动的中文学习平台。学习者通过 AI 驱动的对话完成真实场景任务（点咖啡、订酒店、交朋友），配合即时词汇注释、拼音标注和语音交互。

基于 Next.js、TypeScript 和 Tailwind CSS 构建。

## 功能特性

- **任务式学习**：在模拟的真实场景中完成实用任务（咖啡店、餐厅、酒店、旅行、社交、工作）
- **AI 对话引擎**：通过 OpenAI 兼容 API（OpenAI、Claude 代理、DeepSeek 等）驱动的 NPC 对话
- **规则引擎后备**：未配置 API 密钥时，内置对话引擎同样可用
- **逐词注释系统**：每句中文拆分为语块，提供拼音、字面翻译和自然英文翻译
- **自适应提示**：多级提示系统（关键词 -> 半句 -> 完整参考）逐步引导学习者
- **语音输入/输出**：按住说话和文字转语音，支持发音练习
- **热身练习**：每个任务前的句型操练，建立信心
- **任务复盘**：任务完成后的分析，展示优势、纠错和迁移模式
- **词汇本**：保存和复习已完成任务的词汇
- **用户档案**：跨场景追踪学习进度和技能画像

## 技术栈

- **框架**：Next.js 16（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS 4
- **AI**：OpenAI 兼容的聊天补全 API
- **语音**：Web Speech API（浏览器原生）

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 bun

### 安装

```bash
npm install
```

### 环境配置

复制示例环境文件并配置 AI API：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
USE_RULE_ENGINE=false
```

未配置 AI API 密钥时，应用可使用内置规则引擎运行。设置 `USE_RULE_ENGINE=true` 强制使用规则模式。

### 开发

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 生产构建

```bash
npm run build
npm start
```

## 许可证

私有项目。保留所有权利。
