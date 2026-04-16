"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatBubble from "@/components/ChatBubble";
import HintSheet from "@/components/HintSheet";
import PushToTalkButton from "@/components/PushToTalkButton";
import { useVoice } from "@/lib/hooks/useVoice";
import type { Mission, Turn } from "@/lib/types";

interface DialogueResponse {
  normalizedUserCn: string;
  understood: boolean;
  taskStatus: "in_progress" | "completed" | "failed";
  slotsFilled: string[];
  missingSlots: string[];
  npcReplyCn: string;
  npcReplyEn: string;
  currentState: string;
  errorTags: string[];
  hintAvailable: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [taskStatus, setTaskStatus] = useState<string>("in_progress");
  const [currentState, setCurrentState] = useState("greet");
  const [filledSlots, setFilledSlots] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnIdCounter = useRef(0);
  const lastSpokenTurnId = useRef<string | null>(null);

  // Track session data for debrief
  const sessionDataRef = useRef<{
    allSlotsFilled: string[];
    errorTags: string[];
    hintUsageCount: number;
    totalTurns: number;
  }>({
    allSlotsFilled: [],
    errorTags: [],
    hintUsageCount: 0,
    totalTurns: 0,
  });

  useEffect(() => {
    import("@/lib/data/scenarios").then((mod) => {
      const m = mod.getMission(params.id as string);
      if (m) {
        setMission(m);
        // Add NPC opening
        const openingTurn: Turn = {
          id: "t0",
          role: "npc",
          rawInput: m.npcPersona.openingLine,
          npcReplyCn: m.npcPersona.openingLine,
          npcReplyEn: m.npcPersona.openingLineEn,
          timestamp: new Date().toISOString(),
        };
        setTurns([openingTurn]);
      }
    });
  }, [params.id]);

  const { speak, stopSpeaking } = useVoice({ lang: "zh-CN", rate: 0.8 });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Auto-speak last NPC turn (only once per turn)
    if (!voiceMuted && turns.length > 0) {
      const lastTurn = turns[turns.length - 1];
      if (lastTurn.role === "npc" && lastTurn.npcReplyCn && lastTurn.id !== lastSpokenTurnId.current) {
        lastSpokenTurnId.current = lastTurn.id;
        speak(lastTurn.npcReplyCn, "zh-CN");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, voiceMuted]);

  const handleSend = async (overrideInput?: string) => {
    const rawInput = overrideInput || input;
    if (!rawInput.trim() || !mission || isLoading) return;
    const userInput = rawInput.trim();
    setInput("");
    setIsLoading(true);

    const userTurn: Turn = {
      id: `t${turnIdCounter.current++}`,
      role: "user",
      rawInput: userInput,
      timestamp: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, userTurn]);

    // Process through dialogue engine (API first, fallback to local)
    try {
      let response: DialogueResponse;

      try {
        // Try API route (AI-powered if configured) with 8s timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const apiRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            missionId: mission.id,
            userInput,
            session: {
              currentState,
              slotsFilledMap: Object.fromEntries(filledSlots.map((s) => [s, "true"])),
              turns: turns.map((t) => ({
                role: t.role,
                rawInput: t.rawInput,
                npcReplyCn: t.npcReplyCn,
                understood: t.understood,
                errorTags: t.errorTags,
              })),
              hintLevel,
            },
          }),
        });
        clearTimeout(timeout);
        if (!apiRes.ok) throw new Error("API failed");
        response = await apiRes.json();
      } catch {
        // Fallback to local rule engine
        const { processUserInput } = await import("@/lib/engine/dialogue");
        const session = {
          id: "current",
          missionId: mission.id,
          status: taskStatus as "in_progress",
          currentState,
          slotsFilledMap: Object.fromEntries(filledSlots.map((s) => [s, "true"])),
          turns,
          hintLevel,
          startedAt: new Date().toISOString(),
        };
        response = processUserInput(userInput, mission, session);
      }

      // Update user turn with understood status
      userTurn.understood = response.understood;
      userTurn.errorTags = response.errorTags;
      userTurn.slotsFilled = response.slotsFilled;

      // Update state
      const newFilledSlots = [...new Set([...filledSlots, ...response.slotsFilled])];
      setFilledSlots(newFilledSlots);
      setCurrentState(response.currentState);
      setTaskStatus(response.taskStatus);

      // Track session data
      sessionDataRef.current.allSlotsFilled = newFilledSlots;
      sessionDataRef.current.errorTags = [...sessionDataRef.current.errorTags, ...response.errorTags];
      sessionDataRef.current.totalTurns += 1;

      // Track consecutive failures for hint escalation
      if (!response.understood) {
        setConsecutiveFailures((prev) => prev + 1);
      } else {
        setConsecutiveFailures(0);
      }

      // Add NPC response
      const npcTurn: Turn = {
        id: `t${turnIdCounter.current++}`,
        role: "npc",
        rawInput: response.npcReplyCn,
        npcReplyCn: response.npcReplyCn,
        npcReplyEn: response.npcReplyEn,
        understood: response.understood,
        slotsFilled: response.slotsFilled,
        errorTags: response.errorTags,
        timestamp: new Date().toISOString(),
      };

      // Simulate slight delay for naturalness
      await new Promise((resolve) => setTimeout(resolve, 400));
      setTurns((prev) => [...prev, npcTurn]);

      // Check completion
      if (response.taskStatus === "completed") {
        // Save session data for debrief
        localStorage.setItem(
          `chinese-mission-session-${mission.id}`,
          JSON.stringify({
            turns: [...turns, userTurn, npcTurn],
            filledSlots: newFilledSlots,
            ...sessionDataRef.current,
          })
        );
        setTimeout(() => {
          router.push(`/missions/${mission.id}/debrief`);
        }, 1500);
      }
    } catch {
      // Fallback response
      const fallbackTurn: Turn = {
        id: `t${turnIdCounter.current++}`,
        role: "npc",
        rawInput: "请再说一遍？",
        npcReplyCn: "请再说一遍？",
        npcReplyEn: "Could you say that again?",
        understood: false,
        timestamp: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, fallbackTurn]);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleHint = async () => {
    const newLevel = Math.min(hintLevel + 1, 4);
    setHintLevel(newLevel);
    setShowHint(true);
    sessionDataRef.current.hintUsageCount += 1;
  };

  const handleStuck = () => {
    setHintLevel(4);
    setShowHint(true);
    sessionDataRef.current.hintUsageCount += 2;

    // Add system message
    const systemTurn: Turn = {
      id: `t${turnIdCounter.current++}`,
      role: "system",
      rawInput: "Here's the full reference — try using it!",
      timestamp: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, systemTurn]);
  };

  // Get current hint data from mission
  const currentPattern = mission?.warmupPatterns[0];

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex-shrink-0">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/missions")} className="text-slate-400 hover:text-slate-600">
              ←
            </button>
            <div>
              <div className="text-sm font-medium text-slate-900">{mission.titleEn}</div>
              <div className="text-xs text-slate-500">
                {mission.npcPersona.roleEn}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Slot progress */}
            <div className="flex gap-1">
              {mission.requiredSlots.map((slot) => (
                <div
                  key={slot}
                  className={`w-2.5 h-2.5 rounded-full ${
                    filledSlots.includes(slot) ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                  title={slot.replace(/_/g, " ")}
                />
              ))}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              taskStatus === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-indigo-100 text-indigo-700"
            }`}>
              {taskStatus === "completed" ? "Done!" : `${filledSlots.length}/${mission.requiredSlots.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-4 space-y-1">
          {/* Objective reminder */}
          <div className="text-center mb-4">
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Goal: {mission.objectiveEn}
            </span>
          </div>

          {turns.map((turn, i) => (
            <ChatBubble
              key={turn.id}
              role={turn.role}
              textCn={turn.npcReplyCn || turn.rawInput}
              textEn={turn.npcReplyEn}
              understood={turn.role === "user" ? undefined : turn.understood}
              npcRole={turn.role === "npc" ? mission.npcPersona.roleEn : undefined}
            />
          ))}

          {/* Conversation starter when only NPC opening exists */}
          {turns.length === 1 && turns[0].role === "npc" && !isLoading && (
            <div className="mt-8 text-center space-y-3">
              <p className="text-sm text-slate-400">Try responding in Chinese, pinyin, or English</p>
              {mission.warmupPatterns[0] && (
                <button
                  onClick={() => setInput(mission.warmupPatterns[0].hanzi)}
                  className="inline-block px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  Try: &ldquo;{mission.warmupPatterns[0].hanzi}&rdquo;
                </button>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {taskStatus === "completed" && (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-sm text-emerald-600 font-medium">Mission Complete! Heading to debrief...</div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Hint Area */}
      {showHint && currentPattern && (
        <div className="max-w-lg mx-auto w-full px-5 pb-2 flex-shrink-0">
          <HintSheet
            level={hintLevel}
            keywords={currentPattern.chunks.slice(0, 3)}
            glossChunks={currentPattern.chunks}
            glossTokens={currentPattern.gloss}
            halfSentence={
              currentPattern.hanzi.slice(0, Math.ceil(currentPattern.hanzi.length / 2)) + " ___"
            }
            fullReference={currentPattern.hanzi}
            fullReferencePinyin={currentPattern.pinyin}
            onRequestHigher={handleHint}
          />
        </div>
      )}

      {/* Auto hint on consecutive failures */}
      {consecutiveFailures >= 2 && !showHint && (
        <div className="max-w-lg mx-auto w-full px-5 pb-2 flex-shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-sm text-amber-700">Having trouble? Try using a hint!</p>
            <button
              onClick={handleHint}
              className="mt-2 text-sm text-amber-600 underline hover:text-amber-800"
            >
              Show hint
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {taskStatus !== "completed" && (
        <div className="bg-white border-t border-slate-200 px-5 py-3 flex-shrink-0">
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type in Chinese, pinyin, or English..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-slate-50"
                  autoFocus
                  disabled={isLoading}
                />
                <PushToTalkButton
                  onTranscript={(text) => {
                    setInput(text);
                    handleSend(text);
                  }}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Send
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setShowHint(!showHint); if (!showHint && hintLevel === 0) setHintLevel(1); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
              >
                {showHint ? "Hide hint" : `Hint (L${hintLevel})`}
              </button>
              <button
                onClick={handleStuck}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
              >
                I&apos;m stuck
              </button>
              <button
                onClick={() => { setVoiceMuted(!voiceMuted); if (!voiceMuted) stopSpeaking(); }}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  voiceMuted
                    ? "bg-slate-50 text-slate-400 border-slate-200"
                    : "bg-indigo-50 text-indigo-600 border-indigo-200"
                }`}
                title={voiceMuted ? "Unmute TTS" : "Mute TTS"}
              >
                {voiceMuted ? "🔇 Muted" : "🔊 Voice"}
              </button>
              {!showHint && (
                <div className="text-xs text-slate-400 flex items-center ml-auto">
                  Supports: 中文 · pinyin · English
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
