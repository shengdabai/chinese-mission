"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Goal = "survival" | "social" | "work" | "travel";
type Level = "A0" | "A1" | "A2";
type Mode = "text" | "voice" | "mixed";

const goals: { value: Goal; label: string; icon: string; desc: string }[] = [
  { value: "survival", label: "Survival in China", icon: "🏠", desc: "Order food, take taxis, ask for directions" },
  { value: "social", label: "Social / Friends", icon: "👋", desc: "Introduce yourself, make friends, chat" },
  { value: "work", label: "Work / Business", icon: "💼", desc: "Office greetings, meetings, collaboration" },
  { value: "travel", label: "Travel", icon: "✈️", desc: "Hotels, sightseeing, shopping" },
];

const levels: { value: Level; label: string; desc: string }[] = [
  { value: "A0", label: "Totally new", desc: "I don't know any Chinese" },
  { value: "A1", label: "I know some words", desc: "Nǐ hǎo, xièxie, and a few more" },
  { value: "A2", label: "Simple sentences", desc: "I can say basic things" },
];

const modes: { value: Mode; label: string; icon: string }[] = [
  { value: "text", label: "Text First", icon: "⌨️" },
  { value: "mixed", label: "Mixed", icon: "🔄" },
  { value: "voice", label: "Voice First", icon: "🎤" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [mode, setMode] = useState<Mode>("mixed");
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("chinese-mission-user");
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.onboardingCompleted) setIsReturning(true);
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  const handleStart = () => {
    if (!goal || !level) return;
    const userData = { goal, level, mode, onboardingCompleted: true };
    localStorage.setItem("chinese-mission-user", JSON.stringify(userData));
    router.push("/missions");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-indigo-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Returning user banner */}
        {isReturning && (
          <div className="mb-6 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-sm text-emerald-700">Welcome back! Ready to continue?</span>
            <button
              onClick={() => router.push("/missions")}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline"
            >
              Continue Learning →
            </button>
          </div>
        )}

        {/* Step 0: Goal */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome to Chinese Mission</h1>
              <p className="text-slate-500 mt-2">What do you need Chinese for first?</p>
            </div>
            <div className="space-y-3">
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => { setGoal(g.value); setStep(1); }}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    goal === g.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <div className="font-medium text-slate-900">{g.label}</div>
                    <div className="text-sm text-slate-500">{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Level */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Your Chinese Level</h1>
              <p className="text-slate-500 mt-2">Be honest — we&apos;ll match the difficulty to you.</p>
            </div>
            <div className="space-y-3">
              {levels.map((l) => (
                <button
                  key={l.value}
                  onClick={() => { setLevel(l.value); setStep(2); }}
                  className={`w-full flex flex-col p-4 rounded-xl border-2 transition-all text-left ${
                    level === l.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <div className="font-medium text-slate-900">{l.label}</div>
                  <div className="text-sm text-slate-500">{l.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(0)} className="text-sm text-slate-400 hover:text-slate-600">
              ← Back
            </button>
          </div>
        )}

        {/* Step 2: Mode + Start */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">How do you want to practice?</h1>
              <p className="text-slate-500 mt-2">You can change this later anytime.</p>
            </div>
            <div className="flex gap-3">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    mode === m.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="text-sm text-indigo-700">
                <span className="font-medium">Your first mission:</span> Order a hot latte at a coffee shop ☕
              </div>
              <div className="text-xs text-indigo-500 mt-1">~5 minutes · Beginner friendly</div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-indigo-600 text-white text-lg font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Start First Mission →
            </button>

            <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
