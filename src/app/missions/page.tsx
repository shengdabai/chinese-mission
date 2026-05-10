"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQuotaSummary } from "@/lib/entitlements";

interface ScenarioData {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  icon: string;
  missions: MissionData[];
}

interface MissionData {
  id: string;
  code: string;
  title: string;
  titleEn: string;
  level: string;
  estimatedMinutes: number;
  objectiveEn: string;
}

export default function MissionsPage() {
  const router = useRouter();
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [userGoal, setUserGoal] = useState<string>("survival");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const userData = localStorage.getItem("chinese-mission-user");
    if (!userData) {
      router.replace("/onboarding");
      return;
    }
    let parsed: { goal?: string };
    try {
      parsed = JSON.parse(userData);
    } catch {
      parsed = {};
    }
    setUserGoal(parsed.goal || "survival");

    let completed: string[];
    try {
      completed = JSON.parse(localStorage.getItem("chinese-mission-completed") || "[]");
    } catch {
      completed = [];
    }
    setCompletedMissions(completed);

    import("@/lib/data/scenarios").then((mod) => {
      setScenarios(mod.scenarios);
    });
  }, [router]);

  const categoryLabels: Record<string, { label: string; color: string; bg: string; border: string }> = {
    survival: { label: "Survival Chinese", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    social: { label: "Social Chinese", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    work: { label: "Work Chinese", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
    travel: { label: "Travel Chinese", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
  };

  const levelStars: Record<string, string> = {
    A0: "★☆☆",
    A1: "★★☆",
    A2: "★★★",
  };

  // Find first incomplete mission for recommendation
  const allMissions = scenarios.flatMap((s) => s.missions.map((m) => ({ ...m, scenarioName: s.nameEn, scenarioIcon: s.icon })));
  const recommended = allMissions.find((m) => !completedMissions.includes(m.id));

  const groupedScenarios: Record<string, ScenarioData[]> = {};
  for (const s of scenarios) {
    if (!groupedScenarios[s.category]) groupedScenarios[s.category] = [];
    groupedScenarios[s.category].push(s);
  }

  // Sort categories: user's goal first
  const categoryOrder = [userGoal, ...Object.keys(groupedScenarios).filter((c) => c !== userGoal)];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Chinese Mission</h1>
            <p className="text-xs text-slate-500">
              {completedMissions.length} missions completed
              {mounted && (() => {
                const q = getQuotaSummary();
                if (q.premium) return <span className="ml-2 text-indigo-600 font-medium">· Premium ∞</span>;
                return <span className="ml-2 text-slate-400">· {q.remaining}/{q.limit} 今日剩余</span>;
              })()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/onboarding"
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-xs font-medium text-indigo-600"
              title="Learning Setup"
            >
              Setup
            </Link>
            <Link
              href="/phrasebook"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600"
              title="Phrasebook"
            >
              Phrases
            </Link>
            <Link
              href="/profile"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-600"
              title="Profile"
            >
              Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Recommended Mission */}
        {recommended && (
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg">
            <div className="text-xs font-medium text-slate-400 mb-1">Today&apos;s Recommended</div>
            <div className="text-lg font-bold">{recommended.titleEn}</div>
            <div className="text-sm text-slate-300 mt-1">{recommended.objectiveEn}</div>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
              <span>{recommended.estimatedMinutes} min</span>
              <span>{levelStars[recommended.level]}</span>
            </div>
            <Link
              href={`/missions/${recommended.id}/warmup`}
              className="mt-4 inline-block px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Start Mission
            </Link>
          </div>
        )}

        {/* Scenarios by Category */}
        {categoryOrder.map((category) => {
          const catScenarios = groupedScenarios[category];
          if (!catScenarios) return null;
          const catInfo = categoryLabels[category] || { label: category, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };

          return (
            <div key={category}>
              <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${catInfo.color}`}>
                {catInfo.label}
              </h2>
              <div className="space-y-3">
                {catScenarios.map((scenario) => (
                  <div key={scenario.id} className={`bg-white rounded-xl border ${catInfo.border} overflow-hidden`}>
                    <div className={`px-4 py-3 ${catInfo.bg} border-b ${catInfo.border} flex items-center gap-2`}>
                      <span className="text-lg">{scenario.icon}</span>
                      <span className={`font-medium text-sm ${catInfo.color}`}>{scenario.nameEn}</span>
                      <span className="text-xs text-slate-400">
                        {scenario.missions.filter((m) => completedMissions.includes(m.id)).length}/{scenario.missions.length}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {scenario.missions.map((mission) => {
                        const done = completedMissions.includes(mission.id);
                        return (
                          <Link
                            key={mission.id}
                            href={`/missions/${mission.id}/warmup`}
                            className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                              done ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                              }`}>
                                {done ? "✓" : "○"}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-800">{mission.titleEn}</div>
                                <div className="text-xs text-slate-400">{mission.title}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>{mission.estimatedMinutes}m</span>
                              <span className="text-amber-500">{levelStars[mission.level]}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Stats Summary */}
        <div className="flex gap-3">
          <Link href="/phrasebook" className="flex-1 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
            <div className="text-2xl font-bold text-slate-900">{completedMissions.length}</div>
            <div className="text-xs text-slate-500 mt-1">Missions done</div>
          </Link>
          <Link href="/profile" className="flex-1 bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
            <div className="text-2xl font-bold text-slate-900">
              {scenarios.length > 0 ? Math.round((completedMissions.length / scenarios.reduce((a, s) => a + s.missions.length, 0)) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Overall progress</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
