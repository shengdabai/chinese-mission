"use client";

interface ChatBubbleProps {
  role: "user" | "npc" | "system";
  textCn: string;
  textEn?: string;
  understood?: boolean;
  npcRole?: string;
  timestamp?: string;
}

export default function ChatBubble({
  role,
  textCn,
  textEn,
  understood,
  npcRole,
}: ChatBubbleProps) {
  if (role === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-500">
          {textCn}
        </div>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        {!isUser && npcRole && (
          <div className="text-xs text-slate-400 mb-1 ml-1">{npcRole}</div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-md"
              : "bg-white border border-slate-200 text-slate-900 rounded-bl-md"
          }`}
        >
          <div className={`text-base ${isUser ? "text-white" : "text-slate-900"}`}>
            {textCn}
          </div>
          {textEn && (
            <div
              className={`text-sm mt-1 ${
                isUser ? "text-indigo-200" : "text-slate-400"
              }`}
            >
              {textEn}
            </div>
          )}
        </div>
        {isUser && understood !== undefined && (
          <div className={`text-xs mt-1 text-right ${understood ? "text-emerald-500" : "text-amber-500"}`}>
            {understood ? "✓ Understood" : "⚠ Partially understood"}
          </div>
        )}
      </div>
    </div>
  );
}
