"use client";
import { useCallback, useRef } from "react";
import { useVoice } from "@/lib/hooks/useVoice";

interface PushToTalkButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function PushToTalkButton({
  onTranscript,
  disabled = false,
}: PushToTalkButtonProps) {
  const transcriptRef = useRef("");

  const handleResult = useCallback(
    (text: string) => {
      transcriptRef.current = text;
    },
    []
  );

  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    asrSupported,
  } = useVoice({
    lang: "zh-CN",
    onResult: handleResult,
  });

  const handleStart = useCallback(() => {
    if (disabled) return;
    transcriptRef.current = "";
    startListening();
  }, [disabled, startListening]);

  const handleStop = useCallback(() => {
    stopListening();
    // Use the latest transcript (from ref or state)
    const finalText = transcriptRef.current || transcript;
    if (finalText.trim()) {
      onTranscript(finalText.trim());
    }
  }, [stopListening, transcript, onTranscript]);

  if (!asrSupported) {
    return (
      <button
        disabled
        className="px-3 py-3 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed"
        title="Speech recognition not supported"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onTouchStart={(e) => {
          e.preventDefault();
          handleStart();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleStop();
        }}
        disabled={disabled}
        className={`px-3 py-3 rounded-xl transition-all ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        title={isListening ? "Release to send" : "Hold to speak"}
      >
        {isListening ? (
          /* Waveform animation while listening */
          <div className="flex items-center gap-0.5 w-5 h-5 justify-center">
            <span className="w-0.5 bg-white rounded-full animate-[wave_0.6s_ease-in-out_infinite]" style={{ height: "60%", animationDelay: "0ms" }} />
            <span className="w-0.5 bg-white rounded-full animate-[wave_0.6s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: "100ms" }} />
            <span className="w-0.5 bg-white rounded-full animate-[wave_0.6s_ease-in-out_infinite]" style={{ height: "40%", animationDelay: "200ms" }} />
            <span className="w-0.5 bg-white rounded-full animate-[wave_0.6s_ease-in-out_infinite]" style={{ height: "80%", animationDelay: "300ms" }} />
            <span className="w-0.5 bg-white rounded-full animate-[wave_0.6s_ease-in-out_infinite]" style={{ height: "50%", animationDelay: "400ms" }} />
          </div>
        ) : (
          /* Microphone icon */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <rect x="9" y="1" width="6" height="11" rx="3" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
      {isListening && transcript && (
        <div className="text-xs text-red-500 max-w-[120px] truncate text-center">
          {transcript}
        </div>
      )}
    </div>
  );
}
