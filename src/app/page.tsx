import Link from "next/link";
import { TrackedLink } from "@/components/Tracked";

export const revalidate = 3600; // revalidate every hour

// The six mission groups that exist (src/lib/data/scenario-meta.ts, 20 missions).
const SCENARIOS = [
  { emoji: "☕", name: "咖啡厅与餐厅", nameEn: "Cafe & Restaurant", desc: "点饮料、买单、点外卖" },
  { emoji: "🚕", name: "打车与交通", nameEn: "Taxi & Transport", desc: "说目的地、请司机开慢点、停车" },
  { emoji: "🧭", name: "问路", nameEn: "Ask Directions", desc: "找地铁站、问距离和方向" },
  { emoji: "👋", name: "自我介绍", nameEn: "Self Introduction", desc: "介绍自己、来自哪里、做什么工作" },
  { emoji: "🤝", name: "交朋友", nameEn: "Making Friends", desc: "加微信、约吃饭、聊爱好" },
  { emoji: "💼", name: "职场基础", nameEn: "Work Basics", desc: "打招呼、请同事帮忙、约会议、请假" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇨🇳</span>
            <span className="text-lg font-bold text-slate-900">Chinese Mission</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            <Link
              href="/onboarding"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Start Free →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-32">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          Learn Chinese by{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Doing Real Tasks
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
          AI-powered immersive conversation practice. Order coffee, take a taxi, make friends —
          complete practical missions in simulated real-world scenarios with instant feedback.
        </p>
        <p className="mt-3 text-base text-slate-500">
          AI 驱动的沉浸式中文对话练习，在真实场景任务中学习
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <TrackedLink
            href="/onboarding"
            event="cta_click"
            eventProps={{ where: "hero" }}
            className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-700 hover:shadow-xl"
          >
            Start Free — 3 Daily Attempts
          </TrackedLink>
          <Link
            href="/pricing"
            className="rounded-xl border-2 border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Scenarios */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">
          6 Real-World Scenarios
        </h2>
        <p className="mb-10 text-center text-slate-600">
          6 个真实场景 × 20 个任务 = 沉浸式中文学习体验
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <div
              key={s.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-indigo-200 hover:shadow-md"
            >
              <span className="text-3xl">{s.emoji}</span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">
                {s.name} <span className="text-sm font-normal text-slate-500">({s.nameEn})</span>
              </h3>
              <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-slate-900">
            How It Works — 学习方式
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                1
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Choose a Mission</h3>
              <p className="mt-1 text-sm text-slate-600">Select a real-world scenario and difficulty</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                2
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Chat with AI</h3>
              <p className="mt-1 text-sm text-slate-600">Practice conversation with gloss, pinyin, and hints</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                3
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Review & Improve</h3>
              <p className="mt-1 text-sm text-slate-600">Get debrief feedback and save vocabulary</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Ready to Practice?</h2>
        <p className="mt-2 text-slate-600">
          3 free tasks daily. No credit card needed.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-700"
        >
          Start Learning Now →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
        <p>Chinese Mission — AI-powered task-based Chinese learning</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
          <Link href="/onboarding" className="hover:text-slate-700">Start Free</Link>
        </div>
      </footer>
    </div>
  );
}
