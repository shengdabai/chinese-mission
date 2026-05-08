"use client";
import GlossLine from "./GlossLine";
import type { DebriefResult } from "@/lib/types";

interface DebriefCardProps {
  debrief: DebriefResult;
  onRetry: () => void;
  onNextMission: () => void;
  onSaveExpression: (index: number) => void;
  savedIndices?: Set<number>;
}

export default function DebriefCard({
  debrief,
  onRetry,
  onNextMission,
  onSaveExpression,
  savedIndices = new Set(),
}: DebriefCardProps) {
  const resultConfig = {
    success: { label: "Mission Complete!", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: "🎉" },
    partial_success: { label: "Almost There!", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: "💪" },
    failure: { label: "Keep Trying!", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", icon: "🔄" },
  };

  const cfg = resultConfig[debrief.result];

  return (
    <div className="space-y-5">
      {/* Result Header */}
      <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-6 text-center`}>
        <div className="text-4xl mb-2">{cfg.icon}</div>
        <div className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</div>
        <div className="text-sm text-slate-500 mt-1">
          Score: {Math.round(debrief.score * 100)}%
        </div>
      </div>

      {/* Strengths */}
      {debrief.strengths.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-sm font-medium text-emerald-700 mb-2">What you did well:</div>
          <ul className="space-y-1">
            {debrief.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Fixes */}
      {debrief.topFixes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-sm font-medium text-amber-700 mb-3">Worth improving:</div>
          <div className="space-y-3">
            {debrief.topFixes.map((fix, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-rose-400 line-through">{fix.before}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-emerald-600 font-medium">{fix.after}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{fix.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Patterns */}
      {debrief.transferPatterns.length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-700 mb-3">
            Try these next — same pattern, new context:
          </div>
          <div className="space-y-2">
            {debrief.transferPatterns.map((pattern, i) => (
              <div key={i} className="relative">
                <GlossLine {...pattern} compact />
                <button
                  onClick={() => onSaveExpression(i)}
                  disabled={savedIndices.has(i)}
                  className={`absolute top-3 right-3 text-xs px-2 py-1 rounded-lg ${
                    savedIndices.has(i)
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  }`}
                >
                  {savedIndices.has(i) ? "✓ Saved" : "+ Save"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 py-3 px-4 rounded-xl border-2 border-indigo-200 text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onNextMission}
          className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          Next Mission →
        </button>
      </div>
    </div>
  );
}
