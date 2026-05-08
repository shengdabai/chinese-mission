"use client";
import { useVoice } from "@/lib/hooks/useVoice";

interface SpeakerButtonProps {
  text: string;
  lang?: string;
  size?: "sm" | "md";
}

export default function SpeakerButton({
  text,
  lang = "zh-CN",
  size = "sm",
}: SpeakerButtonProps) {
  const { speak, stopSpeaking, isSpeaking, ttsSupported } = useVoice({
    lang,
    rate: 0.8,
  });

  if (!ttsSupported) return null;

  const sizeClasses = size === "sm" ? "w-6 h-6 p-0.5" : "w-8 h-8 p-1";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text, lang);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-full transition-all ${sizeClasses} ${
        isSpeaking
          ? "text-indigo-600 bg-indigo-100 animate-pulse"
          : "text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
      }`}
      title={isSpeaking ? "Stop" : "Listen"}
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconSize}
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {isSpeaking ? (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        )}
      </svg>
    </button>
  );
}
