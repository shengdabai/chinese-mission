"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DebriefCard from "@/components/DebriefCard";
import type { Mission, DebriefResult, GlossItem, Turn } from "@/lib/types";

export default function DebriefPage() {
  const params = useParams();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [debrief, setDebrief] = useState<DebriefResult | null>(null);

  useEffect(() => {
    import("@/lib/data/scenarios").then(async (scenarioMod) => {
      const m = scenarioMod.getMission(params.id as string);
      if (!m) return;
      setMission(m);

      // Load session data
      const sessionData = localStorage.getItem(`chinese-mission-session-${m.id}`);
      if (sessionData) {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(sessionData);
        } catch {
          router.push(`/missions/${m.id}/warmup`);
          return;
        }

        // Mark mission as completed
        let completed: string[];
        try {
          completed = JSON.parse(localStorage.getItem("chinese-mission-completed") || "[]");
        } catch {
          completed = [];
        }
        if (!completed.includes(m.id)) {
          completed.push(m.id);
          localStorage.setItem("chinese-mission-completed", JSON.stringify(completed));
        }

        // Try API route first (AI-powered debrief) with 5s timeout
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const apiRes = await fetch("/api/debrief", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              missionId: m.id,
              session: {
                turns: parsed.turns || [],
                slotsFilledMap: Object.fromEntries(
                  (Array.isArray(parsed.filledSlots) ? parsed.filledSlots : []).map((s: string) => [s, "true"]),
                ),
                hintUsageCount: parsed.hintUsageCount || 0,
              },
            }),
          });
          clearTimeout(timeout);
          if (apiRes.ok) {
            const result = await apiRes.json();
            setDebrief(result);
            return;
          }
        } catch {
          // Fall through to local engine
        }

        // Fallback: local rule engine
        const { generateDebrief } = await import("@/lib/engine/dialogue");
        const session = {
          id: "current",
          missionId: m.id,
          status: "completed" as const,
          currentState: "complete",
          slotsFilledMap: Object.fromEntries(
            (Array.isArray(parsed.filledSlots) ? parsed.filledSlots : []).map((s: string) => [s, "true"]),
          ),
          turns: (Array.isArray(parsed.turns) ? parsed.turns : []) as Turn[],
          hintLevel: 0,
          startedAt: new Date().toISOString(),
        };
        const result = generateDebrief(m, session);
        setDebrief(result);
      } else {
        // No session data — redirect to warmup instead of faking results
        router.push(`/missions/${m.id}/warmup`);
        return;
      }
    });
  }, [params.id]);

  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  const handleSaveExpression = (index: number) => {
    if (!debrief || !mission) return;
    const pattern: GlossItem = debrief.transferPatterns[index];
    if (!pattern) return;

    let phrasebook: { textCn: string }[];
    try {
      phrasebook = JSON.parse(localStorage.getItem("chinese-mission-phrasebook") || "[]");
    } catch {
      phrasebook = [];
    }
    // Prevent duplicates
    if (phrasebook.some((p: { textCn: string }) => p.textCn === pattern.hanzi)) {
      setSavedIndices((prev) => new Set(prev).add(index));
      return;
    }
    const item = {
      id: `pb_${Date.now()}`,
      textCn: pattern.hanzi,
      gloss: pattern,
      sourceMissionId: mission.id,
      masteryScore: 0.3,
      savedAt: new Date().toISOString(),
    };
    phrasebook.push(item);
    localStorage.setItem("chinese-mission-phrasebook", JSON.stringify(phrasebook));
    setSavedIndices((prev) => new Set(prev).add(index));
  };

  if (!mission || !debrief) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Generating debrief...</p>
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
            <h1 className="text-lg font-bold text-slate-900">Mission Debrief</h1>
            <p className="text-xs text-slate-500">{mission.titleEn}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6">
        <DebriefCard
          debrief={debrief}
          savedIndices={savedIndices}
          onRetry={() => router.push(`/missions/${mission.id}/chat`)}
          onNextMission={() => {
            // Find next mission
            import("@/lib/data/scenarios").then((mod) => {
              const scenario = mod.getScenario(mission.scenarioId);
              if (scenario) {
                const currentIndex = scenario.missions.findIndex((m) => m.id === mission.id);
                const next = scenario.missions[currentIndex + 1];
                if (next) {
                  router.push(`/missions/${next.id}/warmup`);
                  return;
                }
              }
              router.push("/missions");
            });
          }}
          onSaveExpression={handleSaveExpression}
        />
      </div>
    </div>
  );
}
