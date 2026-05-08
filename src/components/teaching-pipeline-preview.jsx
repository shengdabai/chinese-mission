"use client";

import { useEffect, useState } from "react";

const PIPELINE = [
  {
    id: "topic",
    icon: "🎯",
    label: "选题",
    time: "1 min",
    where: "你",
    whereColor: "#f59e0b",
    desc: "从你的50+小时课堂录音、学员常见错误、Reddit/Quora热门问题中提取选题",
    examples: [
      "\"Why Chinese has NO tenses\" → 爆款科普",
      "\"Order food like a local\" → 实用场景",
      "\"这个字为什么长这样\" → 汉字故事",
    ],
    output: "一句话主题 + 目标痛点",
    tools: [],
    tip: "短视频选题核心：一个视频只解决一个问题",
  },
  {
    id: "script",
    icon: "📝",
    label: "双语脚本",
    time: "2-3 min",
    where: "Mac Studio",
    whereColor: "#8b5cf6",
    desc: "AI生成60-90秒的教学脚本：中文教学内容 + 英文解说旁白 + 分镜画面描述",
    output: "JSON结构化脚本（5-8个分镜）",
    scriptExample: {
      title: "Why 了 is NOT past tense",
      hook: "Hook (0-5s): \"Every textbook lied to you about 了\"",
      scenes: [
        "❌ 错误示范：外国人说 '我昨天吃了饭了'",
        "✅ 动画解释：了 = 状态变化，不是过去时",
        "📝 3个真实例句 + 发音",
        "🎯 CTA：下载我的SPARK指南掌握更多",
      ],
    },
    tools: [
      { name: "Gemini 2.5 Flash", tag: "免费", color: "#22c55e", note: "双语脚本生成" },
      { name: "GLM-4.7 (OpenClaw)", tag: "已有", color: "#3b82f6", note: "分镜结构化" },
    ],
    upgrades: [
      { name: "Claude Sonnet 4.6", cost: "+$3/万词", why: "更精准的教学逻辑和英文表达" },
    ],
  },
  {
    id: "image",
    icon: "🎨",
    label: "教学画面",
    time: "3-8 min",
    where: "上海云",
    whereColor: "#ec4899",
    desc: "为每个分镜生成动画风格的教学画面：卡通角色、汉字拆解、场景插画、文化元素",
    output: "5-8张教学配图（统一画风）",
    styleNote: "关键：保持角色和画风一致！建议固定一个\"老师角色\"和\"学生角色\"形象",
    tools: [
      { name: "即梦 5.0", tag: "会员", color: "#3b82f6", note: "中国风+动画风格最强" },
      { name: "Gemini 图片生成", tag: "会员", color: "#3b82f6", note: "多风格备选" },
    ],
    upgrades: [
      { name: "即梦 + 角色一致性参考图", cost: "0（技巧）", why: "上传固定角色参考图，保持系列一致性" },
      { name: "Midjourney --cref", cost: "$10/月", why: "角色一致性最好的方案" },
    ],
    quality: { current: "高", score: 8 },
  },
  {
    id: "video",
    icon: "🎬",
    label: "动画视频",
    time: "8-20 min",
    where: "上海云",
    whereColor: "#ec4899",
    desc: "将静态教学画面转为动画视频片段：角色说话口型、汉字书写动画、场景转换",
    output: "5-8个3-8秒视频片段",
    tools: [
      { name: "即梦 Seedance 2.0", tag: "会员", color: "#3b82f6", note: "动画风格流畅" },
      { name: "PixVerse", tag: "会员", color: "#3b82f6", note: "角色动作更自然" },
    ],
    upgrades: [
      { name: "Kling 2.1", cost: "¥0.5/秒", why: "口型同步、人物一致性最佳" },
      { name: "Runway Gen-4 Turbo", cost: "$12/月", why: "电影级镜头运动" },
    ],
    quality: { current: "中高", score: 7 },
    bottleneck: "⏱ 最耗时+最耗积分的步骤",
  },
  {
    id: "voice",
    icon: "🎙️",
    label: "双语配音",
    time: "1-2 min",
    where: "Mac Studio",
    whereColor: "#8b5cf6",
    desc: "英文解说旁白 + 中文教学发音示范（标准普通话）",
    output: "英文旁白音轨 + 中文示范音轨",
    critical: "对教学视频来说，配音质量直接决定专业感和信任度",
    tools: [
      { name: "Edge-TTS", tag: "免费", color: "#22c55e", note: "英文旁白（可用但有AI感）" },
      { name: "火山TTS", tag: "低价", color: "#eab308", note: "中文发音示范" },
    ],
    upgrades: [
      { name: "ElevenLabs", cost: "$5/月", why: "英文旁白接近真人，极大提升信任度" },
      { name: "你自己录音", cost: "0", why: "中文示范部分建议自己录，最权威" },
    ],
    quality: { current: "中", score: 5 },
    weakest: true,
  },
  {
    id: "edit",
    icon: "✂️",
    label: "合成出片",
    time: "3-5 min",
    where: "Mac Studio",
    whereColor: "#8b5cf6",
    desc: "拼接视频+配音+双语字幕+中国风BGM+片头品牌+片尾CTA",
    output: "60-90秒竖版短视频（9:16）+ 横版（16:9）",
    details: [
      "🔤 双语字幕：中文（大）+ 英文（小）+ 拼音（可选）",
      "🎵 BGM：中国风轻音乐（YouTube Audio Library免费）",
      "🏷️ 品牌片头：你的Logo + 频道名（3秒）",
      "📲 片尾CTA：\"Download free SPARK guide ↓\"（5秒）",
    ],
    tools: [
      { name: "FFmpeg", tag: "免费", color: "#22c55e", note: "自动化剪辑" },
      { name: "ASS字幕渲染", tag: "免费", color: "#22c55e", note: "双语+拼音三行字幕" },
    ],
    quality: { current: "中高", score: 7 },
  },
  {
    id: "review",
    icon: "👀",
    label: "审核",
    time: "3 min",
    where: "Mac M4",
    whereColor: "#f59e0b",
    desc: "你快速审核：教学内容是否准确、发音是否正确、画面是否合适",
    output: "通过 → 发布 / 修改意见 → 重做",
    tools: [],
    tip: "教学内容的准确性必须人工把关，AI可能出错",
  },
  {
    id: "publish",
    icon: "🚀",
    label: "发布+引流",
    time: "2 min",
    where: "硅谷云",
    whereColor: "#22c55e",
    desc: "自动上传YouTube Shorts + 设置SEO元数据 + 评论区置顶引流链接",
    output: "已发布的YouTube Short + Telegram通知",
    details: [
      "📌 描述区：SPARK免费下载链接 + App链接",
      "💬 置顶评论：\"Want to master this? Get my free guide →\"",
      "#️⃣ 标签：#LearnChinese #Mandarin #ChineseLanguage",
      "🔗 卡片链接：指向你的Landing Page",
    ],
    tools: [
      { name: "YouTube API v3", tag: "免费", color: "#22c55e", note: "自动上传" },
      { name: "Telegram Bot", tag: "免费", color: "#22c55e", note: "通知审核" },
    ],
  },
];

const FUNNEL = [
  { label: "YouTube Short", users: "10,000 views", color: "#ef4444", width: 100 },
  { label: "点击简介链接", users: "500 (5% CTR)", color: "#f97316", width: 80 },
  { label: "下载SPARK免费指南", users: "200 (40%)", color: "#eab308", width: 60 },
  { label: "购买CORE电子书 $9.99", users: "30 (15%)", color: "#22c55e", width: 40 },
  { label: "升级MASTER / App订阅", users: "5-10", color: "#8b5cf6", width: 25 },
];

function QualityDots({ score, max = 10 }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < score ? (score >= 8 ? "#22c55e" : score >= 6 ? "#eab308" : "#ef4444") : "rgba(255,255,255,0.1)",
            transition: "all 0.3s",
          }}
        />
      ))}
      <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>{score}/10</span>
    </div>
  );
}

export default function TeachingPipelinePreview() {
  const [activeStep, setActiveStep] = useState(null);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [running, setRunning] = useState(false);
  const [runIdx, setRunIdx] = useState(-1);
  const [tab, setTab] = useState("pipeline");

  const runDemo = () => {
    if (running) return;
    setRunning(true);
    setRunIdx(0);
    setActiveStep(null);
  };

  useEffect(() => {
    if (!running || runIdx < 0) return;
    if (runIdx >= PIPELINE.length) {
      const finishTimer = setTimeout(() => {
        setRunning(false);
        setRunIdx(-1);
      }, 1200);
      return () => clearTimeout(finishTimer);
    }
    setActiveStep(PIPELINE[runIdx].id);
    const timer = setTimeout(() => setRunIdx(runIdx + 1), 900);
    return () => clearTimeout(timer);
  }, [running, runIdx]);

  return (
    <div
      style={{
        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
        background: "#0c0f1a",
        minHeight: "100vh",
        color: "#e2e8f0",
        padding: "20px 14px",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Tony&apos;s Video Factory
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.3,
              background: "linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            动画中文教学短视频
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0" }}>
            60-90s Shorts · 面向海外学员 · 引流付费产品
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 14,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          {[
            { id: "pipeline", label: "🔄 生产流程" },
            { id: "funnel", label: "📊 转化漏斗" },
            { id: "quality", label: "⚡ 质量地图" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                flex: 1,
                padding: "7px 0",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: tab === item.id ? "rgba(255,255,255,0.12)" : "transparent",
                color: tab === item.id ? "#fff" : "#64748b",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "pipeline" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <button
                onClick={runDemo}
                disabled={running}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: running ? "wait" : "pointer",
                  background: running ? "#334155" : "linear-gradient(90deg, #ef4444, #f59e0b)",
                  color: "#fff",
                }}
              >
                {running ? "⏳ 演示中..." : "▶ 演示完整流程"}
              </button>
              <button
                onClick={() => setShowUpgrades(!showUpgrades)}
                style={{
                  padding: "8px 14px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: showUpgrades ? "#f59e0b" : "transparent",
                  color: showUpgrades ? "#000" : "#94a3b8",
                }}
              >
                {showUpgrades ? "✨ 升级" : "⬆ 升级"}
              </button>
            </div>

            {PIPELINE.map((step, idx) => {
              const isActive = activeStep === step.id;
              const isRunning = running && runIdx === idx;
              return (
                <div key={step.id} style={{ marginBottom: 3 }}>
                  <div
                    onClick={() => {
                      if (!running) setActiveStep(isActive ? null : step.id);
                    }}
                    style={{
                      background: isActive
                        ? "rgba(255,255,255,0.07)"
                        : isRunning
                          ? "rgba(245,158,11,0.08)"
                          : "rgba(255,255,255,0.02)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: running ? "default" : "pointer",
                      borderLeft: `3px solid ${isActive || isRunning ? step.whereColor : "transparent"}`,
                      transition: "all 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{step.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{step.label}</div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: `${step.whereColor}22`,
                          color: step.whereColor,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {step.where}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{step.time}</span>
                    </div>

                    {isActive && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px", lineHeight: 1.6 }}>
                          {step.desc}
                        </p>

                        {step.scriptExample && (
                          <div
                            style={{
                              background: "rgba(139,92,246,0.08)",
                              borderRadius: 8,
                              padding: 10,
                              marginBottom: 8,
                              border: "1px solid rgba(139,92,246,0.2)",
                            }}
                          >
                            <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>
                              脚本示例：{step.scriptExample.title}
                            </div>
                            <div style={{ fontSize: 11, color: "#c4b5fd", marginBottom: 4 }}>
                              {step.scriptExample.hook}
                            </div>
                            {step.scriptExample.scenes.map((scene, index) => (
                              <div
                                key={index}
                                style={{ fontSize: 11, color: "#94a3b8", paddingLeft: 8, marginBottom: 2 }}
                              >
                                {scene}
                              </div>
                            ))}
                          </div>
                        )}

                        {step.styleNote && (
                          <div
                            style={{
                              background: "rgba(236,72,153,0.08)",
                              borderRadius: 6,
                              padding: 8,
                              marginBottom: 8,
                              fontSize: 11,
                              color: "#f9a8d4",
                              border: "1px solid rgba(236,72,153,0.2)",
                            }}
                          >
                            ⚠ {step.styleNote}
                          </div>
                        )}

                        {step.examples && (
                          <div style={{ marginBottom: 8 }}>
                            {step.examples.map((example, index) => (
                              <div
                                key={index}
                                style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 3, paddingLeft: 4 }}
                              >
                                • {example}
                              </div>
                            ))}
                          </div>
                        )}

                        {step.details && (
                          <div style={{ marginBottom: 8 }}>
                            {step.details.map((detail, index) => (
                              <div key={index} style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 3 }}>
                                {detail}
                              </div>
                            ))}
                          </div>
                        )}

                        {step.critical && (
                          <div
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              borderRadius: 6,
                              padding: 8,
                              marginBottom: 8,
                              fontSize: 11,
                              color: "#fca5a5",
                              border: "1px solid rgba(239,68,68,0.2)",
                            }}
                          >
                            🔴 {step.critical}
                          </div>
                        )}

                        {step.weakest && (
                          <div
                            style={{
                              background: "rgba(239,68,68,0.12)",
                              borderRadius: 6,
                              padding: 8,
                              marginBottom: 8,
                              fontSize: 12,
                              color: "#fca5a5",
                              fontWeight: 700,
                              border: "1px solid rgba(239,68,68,0.3)",
                              textAlign: "center",
                            }}
                          >
                            ⚡ 当前最短板 — 升级后提升最大
                          </div>
                        )}

                        {step.tools && step.tools.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                fontWeight: 700,
                                marginBottom: 4,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                              }}
                            >
                              当前工具
                            </div>
                            {step.tools.map((tool, index) => (
                              <div key={index} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    background: `${tool.color}22`,
                                    color: tool.color,
                                    fontWeight: 700,
                                  }}
                                >
                                  {tool.tag}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{tool.name}</span>
                                <span style={{ fontSize: 11, color: "#64748b" }}>{tool.note}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {showUpgrades && step.upgrades && step.upgrades.length > 0 && (
                          <div
                            style={{
                              background: "rgba(245,158,11,0.06)",
                              borderRadius: 6,
                              padding: 8,
                              border: "1px solid rgba(245,158,11,0.15)",
                              marginTop: 6,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: "#f59e0b",
                                fontWeight: 700,
                                marginBottom: 4,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                              }}
                            >
                              升级选项
                            </div>
                            {step.upgrades.map((upgrade, index) => (
                              <div key={index} style={{ marginBottom: 4 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>
                                  {upgrade.name}{" "}
                                  <span style={{ fontWeight: 400, color: "#d97706", fontSize: 11 }}>{upgrade.cost}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>→ {upgrade.why}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {step.quality && (
                          <div style={{ marginTop: 8 }}>
                            <QualityDots score={step.quality.score} />
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: "#22c55e",
                            background: "rgba(34,197,94,0.06)",
                            padding: "4px 8px",
                            borderRadius: 4,
                            display: "inline-block",
                          }}
                        >
                          产出 → {step.output}
                        </div>

                        {step.tip && (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                            💡 {step.tip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {idx < PIPELINE.length - 1 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1px 0",
                        color: running && runIdx > idx ? "#f59e0b" : "#1e293b",
                        fontSize: 10,
                        transition: "color 0.3s",
                      }}
                    >
                      ▼
                    </div>
                  )}
                </div>
              );
            })}

            <div
              style={{
                textAlign: "center",
                marginTop: 12,
                padding: "10px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b" }}>单条视频全流程</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>25-45 分钟</div>
              <div style={{ fontSize: 11, color: "#475569" }}>审核通过后自动发布 · 日产3-5条</div>
            </div>
          </>
        )}

        {tab === "funnel" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
              一条Short的转化漏斗（保守估计）
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {FUNNEL.map((funnelItem, index) => (
                <div
                  key={index}
                  style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
                >
                  <div
                    style={{
                      width: `${funnelItem.width}%`,
                      background: `${funnelItem.color}22`,
                      border: `2px solid ${funnelItem.color}55`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      textAlign: "center",
                      transition: "all 0.3s",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: funnelItem.color }}>{funnelItem.label}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{funnelItem.users}</div>
                  </div>
                  {index < FUNNEL.length - 1 && <div style={{ color: "#334155", fontSize: 10, padding: "2px 0" }}>▼</div>}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 16,
                background: "rgba(34,197,94,0.08)",
                borderRadius: 10,
                padding: 14,
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>
                💰 收入测算（每月20条Short）
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 2 }}>
                <div>
                  月播放量：<b style={{ color: "#e2e8f0" }}>200,000</b>（20条×10K均播）
                </div>
                <div>
                  SPARK下载：<b style={{ color: "#e2e8f0" }}>4,000人</b>（建立邮件列表）
                </div>
                <div>
                  CORE销售：<b style={{ color: "#e2e8f0" }}>600本×$9.99 = $5,994</b>
                </div>
                <div>
                  App订阅转化：<b style={{ color: "#e2e8f0" }}>100人×$20/月 = $2,000</b>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 4, marginTop: 4 }}>
                  <b style={{ color: "#4ade80", fontSize: 14 }}>月潜在收入：$8,000+</b>
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                  *基于行业平均转化率估算，实际取决于内容质量和SEO
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>你的产品阶梯</div>
              {[
                { name: "YouTube Short", price: "免费", role: "曝光+信任建立", icon: "📺" },
                { name: "SPARK 指南", price: "免费（换邮箱）", role: "Lead收集", icon: "⚡" },
                { name: "CORE 电子书", price: "$9.99", role: "入门付费", icon: "📘" },
                { name: "MASTER 电子书", price: "$19.95", role: "进阶付费", icon: "📕" },
                { name: "学习App订阅", price: "$20/月", role: "持续收入", icon: "📱" },
                { name: "1对1咨询", price: "$100+/时", role: "高端变现", icon: "👨‍🏫" },
              ].map((product, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: index < 5 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{product.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{product.name}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{product.role}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{product.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "quality" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
              各环节质量评估 & 升级路径
            </div>

            {[
              {
                name: "视频动画",
                current: "即梦+PixVerse",
                score: 7,
                verdict: "动画风格够用，但角色一致性是短板",
                upgrade: "加 Kling 2.1 → 评分升至 8.5",
                priority: "P2",
                cost: "~¥100/月",
              },
              {
                name: "教学图片",
                current: "即梦5.0",
                score: 8,
                verdict: "中国风插画质量高，第一梯队",
                upgrade: "固定角色参考图 → 系列一致性提升",
                priority: "P1",
                cost: "¥0（技巧优化）",
              },
              {
                name: "英文配音",
                current: "Edge-TTS",
                score: 5,
                verdict: "明显的AI感，降低专业信任度",
                upgrade: "ElevenLabs → 评分升至 8",
                priority: "P1",
                cost: "~$5/月",
                weakest: true,
              },
              {
                name: "中文示范",
                current: "AI TTS",
                score: 6,
                verdict: "发音准确但缺乏教学温度",
                upgrade: "你自己录音 → 评分升至 9",
                priority: "P0",
                cost: "¥0",
                weakest: true,
              },
              {
                name: "文案脚本",
                current: "Gemini Flash",
                score: 8,
                verdict: "教学逻辑清晰，双语能力强",
                upgrade: "Claude Sonnet → 更精准的教学设计",
                priority: "P3",
                cost: "~$20/月",
              },
              {
                name: "剪辑合成",
                current: "FFmpeg自动化",
                score: 7,
                verdict: "基础拼接够用，转场效果简单",
                upgrade: "加入模板系统 → 品牌一致性",
                priority: "P2",
                cost: "¥0（开发时间）",
              },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  background: item.weakest ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  border: item.weakest ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                    {item.weakest && "🔴 "}
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background:
                        item.priority === "P0" ? "#ef444433" : item.priority === "P1" ? "#f9731633" : "#64748b33",
                      color: item.priority === "P0" ? "#ef4444" : item.priority === "P1" ? "#f97316" : "#94a3b8",
                      fontWeight: 700,
                    }}
                  >
                    {item.priority}
                  </span>
                </div>
                <QualityDots score={item.score} />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>现用：{item.current}</div>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>{item.verdict}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#fbbf24",
                    marginTop: 4,
                    background: "rgba(245,158,11,0.06)",
                    padding: "3px 6px",
                    borderRadius: 4,
                    display: "inline-block",
                  }}
                >
                  ⬆ {item.upgrade}（{item.cost}）
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 12,
                background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(139,92,246,0.1))",
                borderRadius: 10,
                padding: 14,
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#4ade80" }}>🎯 本周立即做的3件事</div>
              <div style={{ fontSize: 12, lineHeight: 2.2 }}>
                <div>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>P0</span> 中文示范用你自己的声音录（最权威，¥0）
                </div>
                <div>
                  <span style={{ color: "#f97316", fontWeight: 700 }}>P1</span> 即梦固定一个角色形象作为系列IP
                </div>
                <div>
                  <span style={{ color: "#f97316", fontWeight: 700 }}>P1</span> 跑通第一条完整视频验证全流程
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: "#334155" }}>
          点击步骤展开详情 · 三个Tab切换视角 · 2026.04
        </div>
      </div>
    </div>
  );
}
