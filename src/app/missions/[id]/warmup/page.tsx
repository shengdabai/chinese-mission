"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GlossLine from "@/components/GlossLine";
import SpeakerButton from "@/components/SpeakerButton";
import { Paywall } from "@/components/Paywall";
import { canStartMission, consumeAttempt, getQuotaSummary } from "@/lib/entitlements";
import type { Mission, Scenario } from "@/lib/types";

export default function WarmupPage() {
  const params = useParams();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mission) setLoadError(true);
    }, 5000);

    import("@/lib/data/scenarios").then((mod) => {
      const m = mod.getMission(params.id as string);
      if (m) {
        setMission(m);
        const s = mod.getScenario(m.scenarioId);
        if (s) setScenario(s);
      } else {
        setLoadError(true);
      }
    });

    return () => clearTimeout(timeout);
  }, [params.id]);

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        {loadError ? (
          <div className="text-center space-y-3">
            <p className="text-slate-700 font-medium">Mission not found</p>
            <p className="text-slate-400 text-sm">ID &quot;{params.id}&quot; does not match any mission.</p>
            <button
              onClick={() => router.push("/missions")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700"
            >
              Back to Missions
            </button>
          </div>
        ) : (
          <p className="text-slate-500">Loading mission...</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/missions")} className="text-slate-400 hover:text-slate-600">
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{mission.titleEn}</h1>
            <p className="text-xs text-slate-500">{scenario?.nameEn} · {mission.level} · {mission.estimatedMinutes} min</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Mission Objective */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <div className="text-xs font-medium text-indigo-500 uppercase tracking-wider mb-2">Your Mission</div>
          <div className="text-lg font-semibold text-slate-900">{mission.objectiveEn}</div>
          <div className="text-sm text-indigo-600 mt-1">{mission.objective}</div>
        </div>

        {/* NPC Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl">
            {scenario?.icon || "👤"}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">You&apos;ll talk to: {mission.npcPersona.roleEn}</div>
            <div className="text-xs text-slate-500">{mission.npcPersona.style}</div>
          </div>
        </div>

        {/* Task Steps */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">What you need to do:</div>
          <div className="space-y-2">
            {mission.requiredSlots.map((slot, i) => (
              <div key={slot} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <span className="text-slate-700 capitalize">{slot.replace(/_/g, " ")}</span>
              </div>
            ))}
            {mission.optionalSlots.length > 0 && (
              <div className="text-xs text-slate-400 mt-2">
                Optional: {mission.optionalSlots.map((s) => s.replace(/_/g, " ")).join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Useful Expressions */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-3">Useful Expressions</div>
          <div className="space-y-3">
            {mission.warmupPatterns.map((pattern, i) => (
              <div key={i} className="relative">
                <GlossLine
                  hanzi={pattern.hanzi}
                  pinyin={pattern.pinyin}
                  chunks={pattern.chunks}
                  gloss={pattern.gloss}
                  naturalEn={pattern.naturalEn}
                  note={pattern.note}
                  compact
                />
                <div className="absolute top-4 right-4">
                  <SpeakerButton text={pattern.hanzi} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (!canStartMission()) {
                setPaywallOpen(true);
                return;
              }
              consumeAttempt();
              router.push(`/missions/${mission.id}/chat`);
            }}
            className="flex-1 py-4 bg-indigo-600 text-white text-center text-lg font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Start Conversation
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              const el = document.getElementById("all-hints");
              if (el) el.classList.toggle("hidden");
            }}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Show all hints ↓
          </button>
          <div id="all-hints" className="hidden mt-4 space-y-3">
            {mission.warmupPatterns.map((pattern, i) => (
              <GlossLine
                key={i}
                hanzi={pattern.hanzi}
                pinyin={pattern.pinyin}
                chunks={pattern.chunks}
                gloss={pattern.gloss}
                naturalEn={pattern.naturalEn}
                note={pattern.note}
              />
            ))}
          </div>
        </div>
      </div>
      {paywallOpen && <Paywall onClose={() => setPaywallOpen(false)} resetsAt={getQuotaSummary().resetsAt} />}
    </div>
  );
}
