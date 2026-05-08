"use client";
import { useState } from "react";
import SpeakerButton from "@/components/SpeakerButton";

interface GlossLineProps {
  hanzi: string;
  pinyin?: string;
  chunks: string[];
  gloss: string[];
  naturalEn: string;
  note?: string;
  showPinyin?: boolean;
  compact?: boolean;
}

export default function GlossLine({
  hanzi,
  pinyin,
  chunks,
  gloss,
  naturalEn,
  note,
  showPinyin = true,
  compact = false,
}: GlossLineProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left rounded-xl bg-white border border-slate-200 p-4 hover:border-indigo-300 transition-colors"
      >
        <div className="text-xl font-medium text-slate-900">{hanzi}</div>
        {showPinyin && pinyin && (
          <div className="text-sm text-indigo-500 mt-1">{pinyin}</div>
        )}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {chunks.map((chunk, i) => (
                <div key={i} className="text-center">
                  <div className="text-base font-medium text-slate-800">{chunk}</div>
                  <div className="text-xs text-emerald-600">{gloss[i]}</div>
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-500 italic">{naturalEn}</div>
            {note && <div className="text-xs text-amber-600 mt-1">💡 {note}</div>}
          </div>
        )}
        {!expanded && (
          <div className="text-xs text-slate-400 mt-1">Tap to see structure →</div>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
      <div className="text-xl font-medium text-slate-900 flex items-center gap-2">
        {hanzi}
        <SpeakerButton text={hanzi} />
      </div>
      {showPinyin && pinyin && (
        <div className="text-sm text-indigo-500">{pinyin}</div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-2 py-2 border-y border-slate-100">
        {chunks.map((chunk, i) => (
          <div key={i} className="text-center min-w-[3rem]">
            <div className="text-lg font-medium text-slate-800">{chunk}</div>
            <div className="text-sm text-emerald-600 font-medium">{gloss[i]}</div>
          </div>
        ))}
      </div>
      <div className="text-sm text-slate-500 italic">{naturalEn}</div>
      {note && <div className="text-xs text-amber-600">💡 {note}</div>}
    </div>
  );
}
