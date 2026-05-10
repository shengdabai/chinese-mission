"use client";

import Link from "next/link";

interface PaywallProps {
  onClose: () => void;
  resetsAt: string;
}

const PRICING = {
  monthly: { price: "¥28", per: "/month", id: "cm_monthly" },
  yearly: { price: "¥168", per: "/year", id: "cm_yearly", note: "省 50%" },
};

export function Paywall({ onClose, resetsAt }: PaywallProps) {
  const resetDate = resetsAt ? new Date(resetsAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 text-2xl leading-none text-slate-400 hover:text-slate-600"
        >
          ×
        </button>

        <div className="mb-2 mt-2 text-center text-4xl">🌟</div>
        <h2 id="paywall-title" className="text-center text-2xl font-bold text-slate-900">
          今日免费次数已用完
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          已完成 3 次任务挑战，{resetDate} 重置免费额度
          <br />
          升级解锁无限对话练习
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            data-pricing-id={PRICING.yearly.id}
            className="relative w-full rounded-2xl border-2 border-indigo-500 bg-indigo-50 p-4 text-left transition hover:bg-indigo-100"
          >
            <div className="absolute -top-2 left-4 rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
              {PRICING.yearly.note}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-slate-900">年度订阅</span>
              <span className="text-lg font-bold text-indigo-700">
                {PRICING.yearly.price}
                <span className="text-sm font-normal text-slate-500">{PRICING.yearly.per}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">≈ ¥14/月，相当于 5 折</p>
          </button>

          <button
            type="button"
            data-pricing-id={PRICING.monthly.id}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-slate-900">月度订阅</span>
              <span className="text-lg font-bold text-slate-900">
                {PRICING.monthly.price}
                <span className="text-sm font-normal text-slate-500">{PRICING.monthly.per}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">随时取消</p>
          </button>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            <span>无限次任务挑战</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            <span>解锁全部 26 个场景</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            <span>语音输入 + 发音评测</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            <span>个性化复盘报告</span>
          </li>
        </ul>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/profile" className="underline" onClick={onClose}>
            恢复购买
          </Link>
          {" · "}
          订阅协议 · 隐私政策
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-3 text-center text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
