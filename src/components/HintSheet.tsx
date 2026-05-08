"use client";

interface HintSheetProps {
  level: number;
  keywords?: string[];
  glossChunks?: string[];
  glossTokens?: string[];
  halfSentence?: string;
  fullReference?: string;
  fullReferencePinyin?: string;
  onRequestHigher: () => void;
  maxLevel?: number;
}

export default function HintSheet({
  level,
  keywords,
  glossChunks,
  glossTokens,
  halfSentence,
  fullReference,
  fullReferencePinyin,
  onRequestHigher,
  maxLevel = 4,
}: HintSheetProps) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-amber-700">
          Hint Level {level}/4
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className={`w-2 h-2 rounded-full ${
                l <= level ? "bg-amber-500" : "bg-amber-200"
              }`}
            />
          ))}
        </div>
      </div>

      {level >= 1 && keywords && keywords.length > 0 && (
        <div>
          <div className="text-xs text-amber-600 mb-1">Keywords:</div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-amber-100 rounded-lg text-sm font-medium text-amber-800"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {level >= 2 && glossChunks && glossTokens && (
        <div>
          <div className="text-xs text-amber-600 mb-1">Structure:</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {glossChunks.map((chunk, i) => (
              <div key={i} className="text-center">
                <div className="text-base font-medium text-amber-900">{chunk}</div>
                <div className="text-xs text-emerald-600">{glossTokens[i]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {level >= 3 && halfSentence && (
        <div>
          <div className="text-xs text-amber-600 mb-1">Fill in:</div>
          <div className="text-base font-medium text-amber-900">{halfSentence}</div>
        </div>
      )}

      {level >= 4 && fullReference && (
        <div>
          <div className="text-xs text-amber-600 mb-1">Full reference:</div>
          <div className="text-lg font-medium text-amber-900">{fullReference}</div>
          {fullReferencePinyin && (
            <div className="text-sm text-indigo-500">{fullReferencePinyin}</div>
          )}
        </div>
      )}

      {level < maxLevel && (
        <button
          onClick={onRequestHigher}
          className="text-xs text-amber-600 underline hover:text-amber-800"
        >
          Need more help? →
        </button>
      )}
    </div>
  );
}
