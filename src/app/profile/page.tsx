"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scenarioMeta } from "@/lib/data/scenario-meta";

interface UserData {
  goal: string;
  level: string;
  mode: string;
}

interface SkillData {
  scenarioStats: Record<string, { completed: number; total: number }>;
  totalCompleted: number;
  totalMissions: number;
  expressionCount: number;
  weakPoints: string[];
  strongPoints: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [skills, setSkills] = useState<SkillData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("chinese-mission-user");
    if (!userData) {
      router.replace("/onboarding");
      return;
    }

    try {
      setUser(JSON.parse(userData));
      setIsReady(true);
    } catch {
      router.replace("/onboarding");
      return;
    }

    let completed: string[];
    try {
      completed = JSON.parse(localStorage.getItem("chinese-mission-completed") || "[]");
    } catch {
      completed = [];
    }
    let phrasebook: unknown[];
    try {
      phrasebook = JSON.parse(localStorage.getItem("chinese-mission-phrasebook") || "[]");
    } catch {
      phrasebook = [];
    }

    const scenarioStats: Record<string, { completed: number; total: number }> = {};
    let totalMissions = 0;

    for (const scenario of scenarioMeta) {
      const completedInScenario = scenario.missionIds.filter((id) =>
        completed.includes(id)
      ).length;
      scenarioStats[scenario.nameEn] = {
        completed: completedInScenario,
        total: scenario.missionIds.length,
      };
      totalMissions += scenario.missionIds.length;
    }

    // Determine strong/weak scenarios
    const strongPoints: string[] = [];
    const weakPoints: string[] = [];
    for (const [name, stats] of Object.entries(scenarioStats)) {
      const ratio = stats.total > 0 ? stats.completed / stats.total : 0;
      if (ratio >= 0.5) strongPoints.push(name);
      else if (stats.total > 0) weakPoints.push(name);
    }

    setSkills({
      scenarioStats,
      totalCompleted: completed.length,
      totalMissions,
      expressionCount: phrasebook.length,
      weakPoints: weakPoints.length > 0 ? weakPoints : ["Not enough data yet"],
      strongPoints: strongPoints.length > 0 ? strongPoints : ["Complete some missions first!"],
    });
  }, [router]);

  const handleReset = () => {
    if (confirm("This will reset all your progress. Are you sure?")) {
      localStorage.removeItem("chinese-mission-user");
      localStorage.removeItem("chinese-mission-completed");
      localStorage.removeItem("chinese-mission-phrasebook");
      // Clear session data (collect keys first to avoid index shifting)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("chinese-mission-session-")) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      router.push("/onboarding");
    }
  };

  const goalLabels: Record<string, string> = {
    survival: "Survival in China",
    social: "Social / Friends",
    work: "Work / Business",
    travel: "Travel",
  };

  const levelLabels: Record<string, string> = {
    A0: "Complete Beginner",
    A1: "Elementary",
    A2: "Pre-Intermediate",
  };

  if (!isReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
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
          <h1 className="text-lg font-bold text-slate-900">Learning Profile</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* User Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <div className="font-semibold text-slate-900">{levelLabels[user.level] || user.level}</div>
              <div className="text-sm text-slate-500">{goalLabels[user.goal] || user.goal}</div>
              <div className="text-xs text-slate-400 mt-1">Mode: {user.mode} · Bridge: English</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {skills && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{skills.totalCompleted}</div>
              <div className="text-xs text-slate-500 mt-1">Missions Done</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{skills.expressionCount}</div>
              <div className="text-xs text-slate-500 mt-1">Expressions</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {skills.totalMissions > 0 ? Math.round((skills.totalCompleted / skills.totalMissions) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Progress</div>
            </div>
          </div>
        )}

        {/* Scenario Progress */}
        {skills && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Scene Abilities</h2>
            <div className="space-y-3">
              {Object.entries(skills.scenarioStats).map(([name, stats]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{name}</span>
                    <span className="text-slate-400">{stats.completed}/{stats.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {skills && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="text-sm font-medium text-emerald-700 mb-2">Strengths</div>
              {skills.strongPoints.map((s, i) => (
                <div key={i} className="text-xs text-emerald-600 mb-1">✓ {s}</div>
              ))}
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="text-sm font-medium text-rose-700 mb-2">Weak Points</div>
              {skills.weakPoints.map((w, i) => (
                <div key={i} className="text-xs text-rose-600 mb-1">△ {w}</div>
              ))}
            </div>
          </div>
        )}

        {/* Common Patterns */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Expression Patterns</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">我要... (I want...)</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Learning</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">可以...吗 (Can I...?)</span>
              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">New</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">不要... (Don&apos;t want...)</span>
              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">New</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">请... (Please...)</span>
              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">Not started</span>
            </div>
          </div>
        </div>

        {/* Gloss Dependency */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">English Support Dependency</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-3">
              <div className="bg-amber-500 h-3 rounded-full" style={{ width: "70%" }} />
            </div>
            <span className="text-sm text-amber-600 font-medium">High</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            You still rely on structural translations quite a bit. This is normal for beginners!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-medium hover:bg-indigo-50"
          >
            Update Learning Setup
          </button>
          <button
            onClick={() => router.push("/missions")}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
          >
            Continue Learning
          </button>
          <button
            onClick={handleReset}
            className="w-full py-3 text-rose-500 text-sm hover:text-rose-700"
          >
            Reset All Progress
          </button>
        </div>
      </div>
    </div>
  );
}
