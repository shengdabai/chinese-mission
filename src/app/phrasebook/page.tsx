"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GlossLine from "@/components/GlossLine";

interface PhrasebookEntry {
  id: string;
  textCn: string;
  gloss: {
    hanzi: string;
    pinyin: string;
    chunks: string[];
    gloss: string[];
    naturalEn: string;
    note?: string;
  };
  sourceMissionId: string;
  masteryScore: number;
  savedAt: string;
}

export default function PhrasebookPage() {
  const router = useRouter();
  const [items, setItems] = useState<PhrasebookEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("chinese-mission-phrasebook") || "[]");
      setItems(data);
    } catch {
      setItems([]);
    }
  }, []);

  const handleDelete = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem("chinese-mission-phrasebook", JSON.stringify(updated));
  };

  const masteryLabel = (score: number) => {
    if (score >= 0.8) return { text: "Mastered", color: "text-emerald-600 bg-emerald-50" };
    if (score >= 0.5) return { text: "Practicing", color: "text-amber-600 bg-amber-50" };
    return { text: "New", color: "text-indigo-600 bg-indigo-50" };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/missions")} className="text-slate-400 hover:text-slate-600">
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Expression Bank</h1>
            <p className="text-xs text-slate-500">{items.length} expressions saved</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        {/* Info */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="text-sm text-indigo-700">
            This is not a vocabulary list — these are <span className="font-semibold">expressions you actually used</span> in real conversations.
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {["all", "new", "practicing", "mastered"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📖</div>
            <div className="text-slate-500">No expressions saved yet.</div>
            <div className="text-sm text-slate-400 mt-1">Complete missions and save useful expressions here!</div>
            <button
              onClick={() => router.push("/missions")}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Start a Mission
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items
              .filter((item) => {
                if (filter === "all") return true;
                const m = masteryLabel(item.masteryScore);
                return m.text.toLowerCase() === filter;
              })
              .map((item) => {
                const mastery = masteryLabel(item.masteryScore);
                return (
                  <div key={item.id} className="relative">
                    <GlossLine
                      hanzi={item.gloss.hanzi}
                      pinyin={item.gloss.pinyin}
                      chunks={item.gloss.chunks}
                      gloss={item.gloss.gloss}
                      naturalEn={item.gloss.naturalEn}
                      note={item.gloss.note}
                      compact
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${mastery.color}`}>
                        {mastery.text}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-slate-300 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
