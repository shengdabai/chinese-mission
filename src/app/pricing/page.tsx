import Link from "next/link";

export const metadata = {
  title: "Chinese Mission — Pricing 价格方案",
  description: "Free and premium plans for AI-powered Chinese conversation practice",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            Chinese Mission
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link href="/onboarding" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Start free. Upgrade when you are ready for unlimited practice.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md">
            <h2 className="text-lg font-semibold text-slate-900">Free</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-slate-900">¥0</span>
              <span className="text-slate-500">/forever</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              每天 3 次免费任务，足够日常练习
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>6 个真实场景（咖啡厅、餐厅、酒店、旅行、社交、工作）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>AI 对话 + 词汇注释 + 拼音标注</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>多级自适应提示系统</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>任务复盘报告</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>词汇本</span>
              </li>
            </ul>
            <Link
              href="/onboarding"
              className="mt-8 block w-full rounded-xl border-2 border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Start Free →
            </Link>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border-2 border-indigo-500 bg-white p-8 shadow-lg">
            <div className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
              Most Popular
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Premium</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-slate-900">¥28</span>
              <span className="text-slate-500">/month</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              年度订阅 ¥168/年，相当于每月 ¥14，省 50%
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span><strong>无限次</strong>任务挑战</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>全部 26+ 场景（含商务/HSK 专项）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>语音输入 + 发音评测</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>个性化复盘报告 + 学习进度追踪</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>优先支持新场景开发</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                <span>iOS App 完整体验</span>
              </li>
            </ul>
            <button
              type="button"
              className="mt-8 block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Upgrade to Premium →
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900">免费计划有什么限制？</h3>
              <p className="mt-1 text-sm text-slate-600">
                每天 3 次免费任务挑战。额度每天 UTC 00:00 重置。无需信用卡。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">可以随时取消订阅吗？</h3>
              <p className="mt-1 text-sm text-slate-600">
                可以。随时取消，已付费的周期内仍可继续使用。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">支持哪些支付方式？</h3>
              <p className="mt-1 text-sm text-slate-600">
                Apple Pay / Alipay / 信用卡（通过 RevenueCat 处理）。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">适合什么水平的学习者？</h3>
              <p className="mt-1 text-sm text-slate-600">
                零基础到初中级（CEFR A0-A2）。每个场景配有热身、对话、复盘三段式学习流程。
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
        <p>Chinese Mission — AI-powered task-based Chinese learning</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <Link href="/profile" className="hover:text-slate-700">Profile</Link>
        </div>
      </footer>
    </div>
  );
}
